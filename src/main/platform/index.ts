import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

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
   * 生成 Windows 庫路徑列表
   * 自動掃描 A-Z 所有盤符，支持任意盤符命名
   */
  private generateWindowsLibraryPaths(): string[] {
    const paths: string[] = [];
    const pythonVersions = ['39', '310', '311', '312'];

    // 掃描 A-Z 所有盤符
    for (let drive = 65; drive <= 90; drive++) {
      const driveLetter = String.fromCharCode(drive);

      // 根目錄 Python 安裝
      for (const version of pythonVersions) {
        paths.push(`${driveLetter}:\\Python${version}`);
      }

      // Anaconda/Miniconda
      paths.push(`${driveLetter}:\\Anaconda3`);
      paths.push(`${driveLetter}:\\Miniconda3`);
      paths.push(`${driveLetter}:\\ProgramData\\Anaconda3`);
      paths.push(`${driveLetter}:\\ProgramData\\Miniconda3`);
    }

    // 用戶目錄下的安裝
    const userHome = os.homedir();
    paths.push(`${userHome}\\anaconda3`);
    paths.push(`${userHome}\\miniconda3`);
    paths.push(`${userHome}\\.conda`);

    return paths;
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

    // 生成所有盤符的搜索路徑（A-Z）
    const generateAllDrivePaths = (): string[] => {
      const paths: string[] = [];
      const pythonVersions = ['39', '310', '311', '312'];

      for (let drive = 65; drive <= 90; drive++) {
        const driveLetter = String.fromCharCode(drive);
        for (const version of pythonVersions) {
          paths.push(`${driveLetter}:\\Python${version}\\python.exe`);
        }
        paths.push(`${driveLetter}:\\Anaconda3\\python.exe`);
        paths.push(`${driveLetter}:\\Miniconda3\\python.exe`);
        paths.push(`${driveLetter}:\\ProgramData\\Anaconda3\\python.exe`);
        paths.push(`${driveLetter}:\\ProgramData\\Miniconda3\\python.exe`);
      }
      return paths;
    };

    const legacySearchPaths = generateAllDrivePaths();

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
        if (fs.existsSync(p)) return p;
      } catch { continue; }
    }

    try {
      const { execSync } = require('child_process');
      const result = execSync('which python3', { encoding: 'utf-8', timeout: 5000 });
      const whichPath = result.trim();
      if (whichPath && fs.existsSync(whichPath)) return whichPath;
    } catch {}

    try {
      const { execSync } = require('child_process');
      const result = execSync('which python', { encoding: 'utf-8', timeout: 5000 });
      const whichPath = result.trim();
      if (whichPath && fs.existsSync(whichPath)) return whichPath;
    } catch {}

    return 'python3';
  }

  private buildWindowsEnvPath(): string {
    const paths: string[] = [];
    const pythonVersions = ['39', '310', '311', '312'];

    // 掃描 A-Z 所有盤符的 Python 安裝
    for (let drive = 65; drive <= 90; drive++) {
      const driveLetter = String.fromCharCode(drive);
      for (const version of pythonVersions) {
        paths.push(`${driveLetter}:\\Python${version}`);
      }
      paths.push(`${driveLetter}:\\Anaconda3`);
      paths.push(`${driveLetter}:\\Miniconda3`);
      paths.push(`${driveLetter}:\\ProgramData\\Anaconda3`);
      paths.push(`${driveLetter}:\\ProgramData\\Miniconda3`);
    }

    // 用戶目錄下的安裝
    const userHome = os.homedir();
    paths.push(`${userHome}\\anaconda3`);
    paths.push(`${userHome}\\miniconda3`);
    paths.push(`${userHome}\\.conda`);

    // 注意：RAR 文件由 node-unrar-js (WASM) 處理，不需要系統 WinRAR
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
    if (this.isWindows()) {
      return p.replace(/\//g, '\\');
    }
    return p;
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

// 安全的路徑模式：只允許字母、數字、空格、常見路徑字符
const SAFE_PATH_PATTERN = /^[a-zA-Z]:[\\/][\w\s\-\.\(\)\[\]{}@#$%^&+=!',~`]+$/;

export function getShortPathName(longPath: string): string {
  if (!isWindows()) return longPath;
  if (!longPath || typeof longPath !== 'string') return longPath;
  
  // 嚴格驗證路徑格式
  if (INVALID_PATH_CHARS.test(longPath)) {
    console.warn(`[Security] 路徑包含無效字符: ${longPath}`);
    return longPath;
  }
  
  if (!SAFE_PATH_PATTERN.test(longPath)) {
    console.warn(`[Security] 路徑格式不符合安全規範: ${longPath}`);
    return longPath;
  }

  try {
    const { execFileSync } = require('child_process');
    // 使用 execFileSync 避免 shell 注入，將命令和參數分開
    const result = execFileSync('cmd', ['/c', `for %I in ("${longPath}") do @echo %~sfI`], {
      encoding: 'utf-8',
      timeout: 5000,
      shell: false,  // 禁用 shell，防止注入
    });
    const shortPath = result.trim();
    return shortPath || longPath;
  } catch {
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
