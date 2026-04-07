import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { toLongPath } from './platform';
import { platform } from '../core/platform';
import { safeAppendFile } from './utils/async-file';

// 批處理日誌系統
class BatchedLogger {
  private buffer: string[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 1000; // 1秒
  private readonly MAX_BUFFER_SIZE = 50;
  private logPath: string | null = null;

  log(...args: unknown[]): void {
    try {
      if (!app.isReady()) return;
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      const logLine = `${new Date().toISOString()} [PathConfig] ${message}`;
      this.buffer.push(logLine);

      if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
        this.flush();
      } else if (!this.flushTimeout) {
        this.flushTimeout = setTimeout(() => this.flush(), this.FLUSH_INTERVAL);
      }
    } catch {
      // 忽略日誌錯誤
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;

    try {
      if (!this.logPath) {
        const logDir = path.join(app.getPath('userData'), 'logs');
        this.logPath = path.join(logDir, 'app.log');
      }
      const content = this.buffer.join('\n') + '\n';
      safeAppendFile(this.logPath, content).catch(() => {});
    } catch {
      // 忽略寫入錯誤
    }

    this.buffer = [];
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }

  flushSync(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    this.flush();
  }
}

export function flushBatchedLogger(): void {
  batchedLogger.flushSync();
}

const batchedLogger = new BatchedLogger();

function writeLog(...args: unknown[]) {
  batchedLogger.log(...args);
}

export interface AppPathConfig {
  logFile: string;
  tempDir: string;
  resourcesPath: string;
}

export interface ScriptPaths {
  cliScript: string;
  workingDir: string;
}

// ========== 路径缓存 ==========
let pathCache: Map<string, string> = new Map();

function getCachedPath(key: string, compute: () => string): string {
  if (pathCache.has(key)) {
    return pathCache.get(key)!;
  }
  const result = compute();
  pathCache.set(key, result);
  return result;
}

export function clearPathCache(): void {
  pathCache.clear();
}

// ========== 核心路径函数 ==========

function getSafeDir(dirPath: string, fallbackSubDir: string): string {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
  } catch (e) {
    const err = e as Error;
    writeLog(`[PathConfig] 路径不可用: ${dirPath}, 错误: ${err?.message || String(e)}`);
    const fallback = path.join(app.getPath('temp'), fallbackSubDir);
    try {
      fs.mkdirSync(fallback, { recursive: true });
      writeLog(`[PathConfig] 使用备用路径: ${fallback}`);
      return fallback;
    } catch {
      return app.getPath('temp');
    }
  }
}

export function isAppPackaged(): boolean {
  return app.isPackaged;
}

export function getResourcesPath(): string {
  return getCachedPath('resources', () => {
    if (isAppPackaged()) {
      return process.resourcesPath;
    }
    return path.join(__dirname, '../../');
  });
}

export function getUserDataPath(...subPaths: string[]): string {
  const basePath = app.getPath('userData');
  return subPaths.length > 0 ? path.join(basePath, ...subPaths) : basePath;
}

// ========== 日志路径 ==========

export function getLogDirectory(): string {
  return getCachedPath('logDir', () => {
    const logDir = getUserDataPath('logs');
    getSafeDir(logDir, 'logs');
    return logDir;
  });
}

export function getLogFilePath(logFileName?: string): string {
  const envLogFileName = process.env.IMAGE_INSERTER_LOG_FILE || logFileName || 'app.log';
  return path.join(getLogDirectory(), envLogFileName);
}

export function getDiagLogFilePath(): string {
  return getLogFilePath('app.log');
}

// ========== 临时目录 ==========

export function getTempDirectory(): string {
  return getCachedPath('tempDir', () => {
    const tempDir = getUserDataPath('temp');
    return getSafeDir(tempDir, 'ImageAutoInserter');
  });
}

export function getReportTempDirectory(): string {
  return getCachedPath('reportTempDir', () => {
    const reportDir = path.join(getTempDirectory(), 'reports');
    return getSafeDir(reportDir, 'reports');
  });
}

// 安全的臨時目錄前綴模式
const SAFE_PREFIX_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function getProcessTempDirectory(prefix: string = 'imageautoinserter_'): string {
  // 驗證前綴安全性
  if (!SAFE_PREFIX_PATTERN.test(prefix)) {
    throw new Error('Invalid temp directory prefix');
  }

  const tempBase = fs.realpathSync(os.tmpdir());
  // 添加隨機組件避免預測
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return fs.mkdtempSync(path.join(tempBase, `${prefix}${randomSuffix}_`));
}

// ========== 资源路径 ==========

export function getScriptPaths(): ScriptPaths {
  if (isAppPackaged()) {
    // 生产环境：Python 文件通过 extraResources 复制到 resources/python/
    return {
      cliScript: path.join(process.resourcesPath, 'python', 'cli.py'),
      workingDir: path.join(process.resourcesPath, 'python'),
    };
  }

  // 开发环境：Python 文件在 dist/python/ 目录下（编译后的位置）
  // 或者 src/ 目录下（源代码位置）
  const distPythonPath = path.join(__dirname, '../python/cli.py');
  const srcPythonPath = path.join(__dirname, '../../src/cli.py');

  // 优先使用 dist/python/（如果存在）
  if (fs.existsSync(distPythonPath)) {
    return {
      cliScript: distPythonPath,
      workingDir: path.join(__dirname, '../python'),
    };
  }

  // 否则使用 src/（源代码位置）
  return {
    cliScript: srcPythonPath,
    workingDir: path.join(__dirname, '../../src'),
  };
}

export function getScriptPathsWithOverride(): ScriptPaths {
  const envOverride = process.env.IMAGE_INSERTER_PYTHON_BASE || process.env.PYTHON_SCRIPT_BASE;
  if (envOverride) {
    try {
      if (fs.existsSync(envOverride)) {
        return {
          cliScript: path.join(envOverride, 'cli.py'),
          workingDir: envOverride,
        };
      }
    } catch {
    }
  }
  return getScriptPaths();
}

export function getPythonScriptPath(): { scriptPath: string; cwd: string } {
  const paths = getScriptPathsWithOverride();
  return {
    scriptPath: paths.cliScript,
    cwd: paths.workingDir,
  };
}

export function getPythonBinaryPath(): string | null {
  // Python 二进制文件通过 extraResources 复制到 resources/python-binary/
  const binaryNames = platform.isWindows()
    ? ['image-processor.exe', 'image-processor']
    : ['image-processor'];

  for (const name of binaryNames) {
    const binaryPath = path.join(process.resourcesPath, 'python-binary', name);
    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }
  }
  return null;
}

export function getPythonBinaryDirectory(): string {
  return path.join(process.resourcesPath, 'python-binary');
}

export function getPreloadScriptPath(): string {
  // 开发环境：使用项目根目录下的 dist/main/preload.js
  if (process.env.NODE_ENV === 'development') {
    const devPath = path.join(process.cwd(), 'dist/main/preload.js');
    if (fs.existsSync(devPath)) {
      return devPath;
    }
    // 备用路径：相对于当前文件的位置
    const altDevPath = path.join(__dirname, '../dist/main/preload.js');
    if (fs.existsSync(altDevPath)) {
      return altDevPath;
    }
    // 如果都不存在，返回默认路径（让 Electron 报错以便调试）
    return devPath;
  }

  // 生产环境（asar 打包）：
  // main.js 在 app.asar/dist/main/main.js
  // preload.js 在 app.asar/dist/main/preload.js
  // __dirname 在 asar 内指向 app.asar/dist/main/
  return path.join(__dirname, 'preload.js');
}

export function getRendererHtmlPath(): string {
  if (isAppPackaged()) {
    // 生产环境：__dirname 在 asar 内指向 app.asar/dist/main/
    // renderer 在 app.asar/dist/renderer/
    return path.join(__dirname, '../renderer/index.html');
  }
  // 开发环境：直接使用项目根目录下的 dist/renderer
  return path.join(__dirname, '../../dist/renderer/index.html');
}

// ========== 缓存路径 ==========

export function getCacheDirectory(): string {
  return getCachedPath('cacheDir', () => {
    const cacheDir = getUserDataPath('cache');
    return getSafeDir(cacheDir, 'cache');
  });
}

export function getCacheFilePath(filename: string): string {
  return path.join(getCacheDirectory(), filename);
}

export function getVitePortCachePath(): string {
  return getCacheFilePath('vite-port-cache.json');
}

// ========== 系统路径 ==========

export function getDocumentsPath(): string {
  return app.getPath('documents');
}

export function getDesktopPath(): string {
  return app.getPath('desktop');
}

export function getDownloadsPath(): string {
  return app.getPath('downloads');
}

// ========== 兼容旧接口 ==========

export function getPathConfig(): AppPathConfig {
  return {
    logFile: getDiagLogFilePath(),
    tempDir: getTempDirectory(),
    resourcesPath: getResourcesPath()
  };
}

export function toWindowsLongPath(filePath: string): string {
  return toLongPath(filePath);
}
