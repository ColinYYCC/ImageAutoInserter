import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

// 注意：不要在此文件导入 logger，避免循环依赖
// logger.ts -> path-config.ts -> 可能在初始化时访问 platform

export type Platform = 'win32' | 'darwin';

export interface PlatformInfo {
  platform: Platform;
  isWindows: boolean;
  isMac: boolean;
  pathSeparator: string;
  envPathSeparator: string;
  homeDir: string;
  tmpDir: string;
  userName: string;
  defaultFonts: string[];
}

export interface PathConfig {
  sep: string;
  delimiter: string;
  exeSuffix: string;
  libraryPaths: string[];
  tempPrefix: string;
  maxPathLength: number;
  maxBasenameLength: number;
}

export interface ProcessConfig {
  pythonExecutable: string;
  shellExecutable: string;
  terminateCommand: string;
  envPathSetup: string;
}

export interface SystemConfig {
  platform: PlatformInfo;
  paths: PathConfig;
  process: ProcessConfig;
  assets: AssetPaths;
}

export interface AssetPaths {
  fonts: string;
  icons: string;
  images: string;
}

class PlatformAdapter {
  private static instance: PlatformAdapter | null = null;
  private config: SystemConfig | null = null;

  private constructor() {}

  static getInstance(): PlatformAdapter {
    if (!PlatformAdapter.instance) {
      PlatformAdapter.instance = new PlatformAdapter();
    }
    return PlatformAdapter.instance;
  }

  /**
   * 共享的 Windows Python 路径生成函数
   * 自动扫描 A-Z 所有盘符，支持任意盘符命名
   */
  private static generateWindowsPythonPaths(options: {
    includePythonExe?: boolean;
    includeLibraryPaths?: boolean;
  } = {}): string[] {
    const { includePythonExe = false, includeLibraryPaths = true } = options;
    const paths: string[] = [];
    const pythonVersions = ['39', '310', '311', '312'];

    // 扫描 A-Z 所有盘符
    for (let drive = 65; drive <= 90; drive++) {
      const driveLetter = String.fromCharCode(drive);

      if (includeLibraryPaths) {
        // 库路径（不带 python.exe）
        for (const version of pythonVersions) {
          paths.push(`${driveLetter}:\\Python${version}`);
        }
        paths.push(`${driveLetter}:\\Anaconda3`);
        paths.push(`${driveLetter}:\\Miniconda3`);
        paths.push(`${driveLetter}:\\ProgramData\\Anaconda3`);
        paths.push(`${driveLetter}:\\ProgramData\\Miniconda3`);
      }

      if (includePythonExe) {
        // Python 可执行文件路径
        for (const version of pythonVersions) {
          paths.push(`${driveLetter}:\\Python${version}\\python.exe`);
        }
        paths.push(`${driveLetter}:\\Anaconda3\\python.exe`);
        paths.push(`${driveLetter}:\\Miniconda3\\python.exe`);
        paths.push(`${driveLetter}:\\ProgramData\\Anaconda3\\python.exe`);
        paths.push(`${driveLetter}:\\ProgramData\\Miniconda3\\python.exe`);
      }
    }

    // 用户目录下的安装
    const userHome = os.homedir();
    if (includeLibraryPaths) {
      paths.push(`${userHome}\\anaconda3`);
      paths.push(`${userHome}\\miniconda3`);
      paths.push(`${userHome}\\.conda`);
    }

    if (includePythonExe) {
      paths.push(`${userHome}\\anaconda3\\python.exe`);
      paths.push(`${userHome}\\miniconda3\\python.exe`);
    }

    return paths;
  }

  getPlatformInfo(): PlatformInfo {
    const p = process.platform as Platform;
    const isWindows = p === 'win32';
    const isMac = p === 'darwin';

    return {
      platform: p,
      isWindows,
      isMac,
      pathSeparator: isWindows ? '\\' : '/',
      envPathSeparator: isWindows ? ';' : ':',
      homeDir: os.homedir(),
      tmpDir: os.tmpdir(),
      userName: os.userInfo().username,
      defaultFonts: isWindows
        ? ['Segoe UI', 'Microsoft YaHei', 'Arial']
        : ['SF Pro Display', 'Helvetica Neue', 'Arial'],
    };
  }

  getPathConfig(): PathConfig {
    const { isWindows } = this.getPlatformInfo();

    return {
      sep: isWindows ? '\\' : '/',
      delimiter: isWindows ? ';' : ':',
      exeSuffix: isWindows ? '.exe' : '',
      libraryPaths: isWindows
        ? this.generateWindowsLibraryPaths()
        : ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'],
      tempPrefix: 'imageautoinserter_',
      // Windows 10/11 支持長路徑（啟用後可達 32,767），但為兼容性使用 260
      // 實際限制取決於系統配置和應用程序清單設置
      maxPathLength: isWindows ? 260 : 4096,
      maxBasenameLength: isWindows ? 255 : 255,
    };
  }

  /**
   * 生成 Windows 库路径列表（使用共享函数）
   */
  private generateWindowsLibraryPaths(): string[] {
    return PlatformAdapter.generateWindowsPythonPaths({ includePythonExe: false, includeLibraryPaths: true });
  }

  getProcessConfig(): ProcessConfig {
    const { isWindows, isMac } = this.getPlatformInfo();

    if (isWindows) {
      return {
        pythonExecutable: this.findPythonExecutable(),
        shellExecutable: 'cmd.exe',
        terminateCommand: 'taskkill /pid {pid} /T /F',
        envPathSetup: this.buildWindowsEnvPath(),
      };
    }

    return {
      pythonExecutable: isMac ? this.findMacPythonExecutable() : 'python3',
      shellExecutable: '/bin/bash',
      terminateCommand: 'kill -TERM {pid}',
      envPathSetup: isMac ? '/opt/homebrew/bin:/usr/local/bin:' : '/usr/local/bin:/usr/bin:',
    };
  }

  private findPythonExecutable(): string {
    const envPath = process.env.PYTHON_EXECUTABLE;
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }

    const tryPyLauncher = (): string | null => {
      try {
        const { execSync } = require('child_process');
        const result = execSync('py -0', { encoding: 'utf-8', timeout: 10000, shell: 'cmd.exe' });
        const lines = result.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const match = line.trim().match(/^[*-]\d+\.\d+.*?\s+(.+)$/);
          if (match && fs.existsSync(match[1])) {
            return match[1];
          }
        }
      } catch { }
      return null;
    };

    const tryWhere = (cmd: string): string | null => {
      try {
        const { execSync } = require('child_process');
        const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000, shell: 'cmd.exe' });
        const lines = result.trim().split('\n').filter(Boolean);
        return lines.length > 0 ? lines[0].trim() : null;
      } catch { return null; }
    };

    const tryGlob = (): string | null => {
      try {
        const { execSync } = require('child_process');
        const result = execSync(
          `where /r "C:\\Program Files\\WindowsApps" python.exe 2>nul`,
          { encoding: 'utf-8', timeout: 10000, shell: 'cmd.exe' }
        );
        const lines = result.trim().split('\n').filter(Boolean);
        return lines.length > 0 ? lines[0].trim() : null;
      } catch { return null; }
    };

    const tryPaths = (paths: string[]): string | null => {
      for (const p of paths) {
        try {
          if (fs.existsSync(p)) return p;
        } catch { continue; }
      }
      return null;
    };

    const modernSearchPaths = [
      'C:\\Program Files\\Python39\\python.exe',
      'C:\\Program Files\\Python310\\python.exe',
      'C:\\Program Files\\Python311\\python.exe',
      'C:\\Program Files\\Python312\\python.exe',
      `${os.homedir()}\\AppData\\Local\\Programs\\Python\\Python39\\python.exe`,
      `${os.homedir()}\\AppData\\Local\\Programs\\Python\\Python310\\python.exe`,
      `${os.homedir()}\\AppData\\Local\\Programs\\Python\\Python311\\python.exe`,
      `${os.homedir()}\\AppData\\Local\\Programs\\Python\\Python312\\python.exe`,
      `${os.homedir()}\\anaconda3\\python.exe`,
      `${os.homedir()}\\miniconda3\\python.exe`,
      'C:\\Windows\\py.exe',
    ];

    const legacySearchPaths = PlatformAdapter.generateWindowsPythonPaths({ includePythonExe: true, includeLibraryPaths: false });

    let found: string | null = null;

    found = tryWhere('where python');
    if (found && fs.existsSync(found)) return found;

    found = tryWhere('where py');
    if (found && fs.existsSync(found)) return found;

    found = tryPyLauncher();
    if (found && fs.existsSync(found)) return found;

    found = tryGlob();
    if (found && fs.existsSync(found)) return found;

    found = tryPaths(modernSearchPaths);
    if (found) return found;

    found = tryPaths(legacySearchPaths);
    if (found) return found;

    return 'python';
  }

  private findMacPythonExecutable(): string {
    const isArm = process.arch === 'arm64';
    const searchPaths = isArm
      ? ['/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/usr/bin/python3']
      : ['/usr/local/bin/python3', '/opt/homebrew/bin/python3', '/usr/bin/python3'];

    for (const p of searchPaths) {
      try {
        if (fs.existsSync(p)) {
          console.info(`[Platform] 找到 Python: ${p}`);
          return p;
        }
      } catch { continue; }
    }

    try {
      const { execSync } = require('child_process');
      const result = execSync('which python3', { encoding: 'utf-8', timeout: 5000 });
      const whichPath = result.trim();
      if (whichPath && fs.existsSync(whichPath)) {
        console.info(`[Platform] 通过 which python3 找到: ${whichPath}`);
        return whichPath;
      }
    } catch {
      console.warn('[Platform] which python3 查找失败');
    }

    try {
      const { execSync } = require('child_process');
      const result = execSync('which python', { encoding: 'utf-8', timeout: 5000 });
      const whichPath = result.trim();
      if (whichPath && fs.existsSync(whichPath)) {
        console.info(`[Platform] 通过 which python 找到: ${whichPath}`);
        return whichPath;
      }
    } catch {
      console.warn('[Platform] which python 查找失败');
    }

    console.warn('[Platform] 未找到 Python，回退到 python3');
    return 'python3';
  }

  private buildWindowsEnvPath(): string {
    // 使用共享函数生成库路径（不包含 python.exe，用于 PATH 环境变量）
    const paths = PlatformAdapter.generateWindowsPythonPaths({ includePythonExe: false, includeLibraryPaths: true });
    // 注意：RAR 文件由 node-unrar-js (WASM) 处理，不需要系统 WinRAR
    return paths.join(';');
  }

  getAssetPaths(): AssetPaths {
    return {
      fonts: '/assets/fonts',
      icons: '/assets/icons',
      images: '/assets/images',
    };
  }

  initialize(): SystemConfig {
    if (this.config) return this.config;

    this.config = {
      platform: this.getPlatformInfo(),
      paths: this.getPathConfig(),
      process: this.getProcessConfig(),
      assets: this.getAssetPaths(),
    };

    return this.config;
  }

  getConfig(): SystemConfig {
    if (!this.config) {
      return this.initialize();
    }
    return this.config;
  }

  isWindows(): boolean {
    return process.platform === 'win32';
  }

  isMac(): boolean {
    return process.platform === 'darwin';
  }

  getTmpDir(prefix?: string): string {
    const tmpDir = os.tmpdir();
    const prefixStr = prefix || this.getPathConfig().tempPrefix;
    return fs.mkdtempSync(path.join(tmpDir, prefixStr));
  }

  normalizePath(p: string): string {
    // 使用 path.normalize 确保跨平台一致性
    // 它会将所有分隔符统一为目标平台的标准格式
    // Windows: \ 为标准分隔符
    // Unix (macOS/Linux): / 为标准分隔符
    if (!p || typeof p !== 'string') {
      console.warn(`[Platform] normalizePath 收到无效输入: ${typeof p}, 返回空字符串`);
      return '';
    }

    const normalized = path.normalize(p);

    // Windows: 确保使用反斜杠
    if (this.isWindows()) {
      return normalized.replace(/\//g, '\\');
    }

    // macOS/Linux: 确保使用正斜杠
    return normalized.replace(/\\/g, '/');
  }

  toLongPath(p: string): string {
    if (!this.isWindows()) return p;
    if (p.startsWith('\\\\?\\')) return p;
    return '\\\\?\\' + path.resolve(p);
  }

  joinPath(...parts: string[]): string {
    return path.join(...parts);
  }

  getUserDocumentsDir(): string {
    if (this.isWindows()) {
      return path.join(os.homedir(), 'Documents');
    }
    return path.join(os.homedir(), 'Documents');
  }

  getDesktopDir(): string {
    if (this.isWindows()) {
      return path.join(os.homedir(), 'Desktop');
    }
    return path.join(os.homedir(), 'Desktop');
  }
}

export const platform = PlatformAdapter.getInstance();
export const SYSTEM_CONFIG = platform.initialize();

export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function isMac(): boolean {
  return process.platform === 'darwin';
}

export function getPlatform(): Platform {
  return process.platform as Platform;
}

export function getTmpDir(prefix?: string): string {
  return platform.getTmpDir(prefix);
}

export function normalizePath(p: string): string {
  return platform.normalizePath(p);
}

export function toLongPath(p: string): string {
  return platform.toLongPath(p);
}

export function joinPath(...parts: string[]): string {
  return path.join(...parts);
}

const INVALID_PATH_CHARS = /[<>"|?*\x00-\x1f]/;

// 安全的路径模式：支持 Unicode 字符（中文、日文、韩文等）
// Windows 路径格式：C:\ 或 D:\ 开头
const SAFE_PATH_PATTERN = /^([a-zA-Z]:[\\/])(?:[^\0<>"|?*\x00-\x1f]+[\/\\])*[^\0<>"|?*\x00-\x1f]*$/;

export function getShortPathName(longPath: string): string {
  if (!isWindows()) return longPath;
  if (!longPath || typeof longPath !== 'string') return longPath;

  // 检查无效字符 - 这是真正的安全检查
  if (INVALID_PATH_CHARS.test(longPath)) {
    console.warn(`[Security] 路径包含无效字符: ${longPath}`);
    return longPath;
  }

  // 验证路径格式 - 如果失败，记录警告但仍尝试获取短路径
  if (!SAFE_PATH_PATTERN.test(longPath)) {
    console.warn(`[Security] 路径格式不符合安全规范，尝试获取短路径: ${longPath}`);
  }

  try {
    const { execFileSync } = require('child_process');
    // 使用 execFileSync 避免 shell 注入，将命令和参数分开
    const result = execFileSync('cmd', ['/c', `for %I in ("${longPath}") do @echo %~sfI`], {
      encoding: 'utf-8',
      timeout: 5000,
      shell: false,
    });
    const shortPath = result.trim();
    if (shortPath && shortPath !== longPath) {
      console.info(`[Platform] 获取短路径成功: ${longPath} -> ${shortPath}`);
      return shortPath;
    }
    return longPath;
  } catch (error) {
    console.warn(`[Platform] 获取短路径失败: ${longPath}`);
    return longPath;
  }
}

export function getAssetsPath(): AssetPaths {
  return platform.getAssetPaths();
}

export function getFontsPath(): string {
  return platform.getAssetPaths().fonts;
}

export function getIconsPath(): string {
  return platform.getAssetPaths().icons;
}

export function getImagesPath(): string {
  return platform.getAssetPaths().images;
}

export function fontUrl(fontName: string): string {
  return `/assets/fonts/${fontName}`;
}

export function iconUrl(iconName: string): string {
  return `/assets/icons/${iconName}`;
}

export function imageUrl(imageName: string): string {
  return `/assets/images/${imageName}`;
}

// ============ 新架构重导出（兼容旧接口） ============
export { platformRegistry as newPlatform } from '../../core/platform/registry';
export { pathService, processService, fileService, systemService } from '../../core/platform/registry';

// 便捷重导出
export const newIsWindows = (): boolean => process.platform === 'win32';
export const newIsMac = (): boolean => process.platform === 'darwin';
