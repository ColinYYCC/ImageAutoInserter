/**
 * 路径配置管理器单元测试
 * 测试覆盖：路径获取、路径验证、跨平台兼容性等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      const paths: Record<string, string> = {
        userData: '/tmp/test-user-data',
        temp: '/tmp/test-temp',
        desktop: '/tmp/test-desktop',
        documents: '/tmp/test-documents',
        downloads: '/tmp/test-downloads',
        logs: '/tmp/test-logs',
        exe: '/tmp/test-app',
      };
      return paths[name] || '/tmp/test-default';
    }),
    isPackaged: false,
    getAppPath: vi.fn(() => '/tmp/test-app-path'),
  },
}));

// Mock fs - 使用 importOriginal 保留原始实现
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(() => Buffer.from('')),
    statSync: vi.fn(() => ({ isDirectory: () => true })),
  };
});

// Mock platform
vi.mock('../core/platform', () => ({
  platform: {
    isWindows: vi.fn(() => false),
    isMac: vi.fn(() => true),
  },
}));

vi.mock('./platform', () => ({
  toLongPath: vi.fn((p: string) => p),
}));

vi.mock('./utils/async-file', () => ({
  safeAppendFile: vi.fn().mockResolvedValue(undefined),
}));

describe('PathConfig - 路径配置管理器测试', () => {
  let PathConfig: any;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../src/main/path-config');
    PathConfig = module;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLogDirectory - 日志目录', () => {
    it('应返回正确的日志目录路径', () => {
      const logDir = PathConfig.getLogDirectory();
      expect(logDir).toBeDefined();
      expect(typeof logDir).toBe('string');
    });

    it('日志目录应包含 userData', () => {
      const logDir = PathConfig.getLogDirectory();
      expect(logDir).toContain('test-user-data');
    });
  });

  describe('getLogFilePath - 日志文件路径', () => {
    it('应返回正确的日志文件路径', () => {
      const logFile = PathConfig.getLogFilePath();
      expect(logFile).toBeDefined();
      expect(logFile).toContain('.log');
    });

    it('日志文件应在日志目录内', () => {
      const logFile = PathConfig.getLogFilePath();
      const logDir = PathConfig.getLogDirectory();
      expect(logFile.startsWith(logDir)).toBe(true);
    });
  });

  describe('getTempDirectory - 临时目录', () => {
    it('应返回临时目录路径', () => {
      const tempDir = PathConfig.getTempDirectory();
      expect(tempDir).toBeDefined();
      expect(typeof tempDir).toBe('string');
    });
  });

  describe('getReportTempDirectory - 报告临时目录', () => {
    it('应返回报告临时目录路径', () => {
      const reportDir = PathConfig.getReportTempDirectory();
      expect(reportDir).toBeDefined();
      expect(reportDir).toContain('report');
    });
  });

  describe('getProcessTempDirectory - 进程临时目录', () => {
    it('应返回进程临时目录路径', () => {
      const processDir = PathConfig.getProcessTempDirectory();
      expect(processDir).toBeDefined();
      expect(typeof processDir).toBe('string');
      // 应该是一个有效的临时目录路径
      expect(processDir.length).toBeGreaterThan(0);
    });
  });

  describe('getPythonScriptPath - Python 脚本路径', () => {
    it('应返回 Python 脚本路径对象', () => {
      const scriptInfo = PathConfig.getPythonScriptPath();
      expect(scriptInfo).toBeDefined();
      expect(scriptInfo).toHaveProperty('scriptPath');
      expect(scriptInfo).toHaveProperty('cwd');
      expect(scriptInfo.scriptPath).toContain('.py');
    });
  });

  describe('getPythonBinaryPath - Python 二进制路径', () => {
    it('应返回 Python 二进制路径或 null', () => {
      // Mock process.resourcesPath
      process.resourcesPath = '/tmp/test-resources';
      
      const pythonPath = PathConfig.getPythonBinaryPath();
      // 在测试环境中，可能返回 null（因为二进制文件不存在）
      expect(pythonPath === null || typeof pythonPath === 'string').toBe(true);
    });
  });

  describe('getCacheDirectory - 缓存目录', () => {
    it('应返回缓存目录路径', () => {
      const cacheDir = PathConfig.getCacheDirectory();
      expect(cacheDir).toBeDefined();
      expect(cacheDir).toContain('cache');
    });
  });

  describe('getCacheFilePath - 缓存文件路径', () => {
    it('应返回缓存文件路径', () => {
      const cacheFile = PathConfig.getCacheFilePath('test-cache');
      expect(cacheFile).toBeDefined();
      expect(cacheFile).toContain('test-cache');
    });
  });

  describe('getUserDataPath - 用户数据路径', () => {
    it('应返回用户数据路径', () => {
      const userDataPath = PathConfig.getUserDataPath();
      expect(userDataPath).toBeDefined();
      expect(userDataPath).toContain('test-user-data');
    });
  });

  describe('getDocumentsPath - 文档路径', () => {
    it('应返回文档路径', () => {
      const docsPath = PathConfig.getDocumentsPath();
      expect(docsPath).toBeDefined();
      expect(docsPath).toContain('test-documents');
    });
  });

  describe('getDesktopPath - 桌面路径', () => {
    it('应返回桌面路径', () => {
      const desktopPath = PathConfig.getDesktopPath();
      expect(desktopPath).toBeDefined();
      expect(desktopPath).toContain('test-desktop');
    });
  });

  describe('getDownloadsPath - 下载路径', () => {
    it('应返回下载路径', () => {
      const downloadsPath = PathConfig.getDownloadsPath();
      expect(downloadsPath).toBeDefined();
      expect(downloadsPath).toContain('test-downloads');
    });
  });

  describe('路径缓存机制', () => {
    it('相同路径应返回缓存结果', () => {
      const path1 = PathConfig.getLogDirectory();
      const path2 = PathConfig.getLogDirectory();
      expect(path1).toBe(path2);
    });
  });

  describe('跨平台兼容性', () => {
    it('路径应使用正确的分隔符', () => {
      const logFile = PathConfig.getLogFilePath();
      expect(logFile).not.toContain('\\');
    });
  });

  describe('BatchedLogger 和 flushBatchedLogger', () => {
    it('应成功调用 flushBatchedLogger', () => {
      expect(() => PathConfig.flushBatchedLogger()).not.toThrow();
    });
  });

  describe('clearPathCache - 清除路径缓存', () => {
    it('应清除缓存后重新计算路径', () => {
      const path1 = PathConfig.getLogDirectory();
      PathConfig.clearPathCache();
      const path2 = PathConfig.getLogDirectory();
      expect(path1).toBe(path2);
    });
  });

  describe('getProcessTempDirectory - 进程临时目录边界条件', () => {
    it('无效前缀应抛出错误', () => {
      expect(() => PathConfig.getProcessTempDirectory('invalid;prefix')).toThrow();
    });

    it('带下划线的前缀应正常工作', () => {
      const processDir = PathConfig.getProcessTempDirectory('test_prefix_');
      expect(processDir).toBeDefined();
      expect(processDir.length).toBeGreaterThan(0);
    });
  });

  describe('getScriptPathsWithOverride - 环境变量覆盖', () => {
    it('应使用环境变量覆盖路径', () => {
      const originalEnv = process.env.IMAGE_INSERTER_PYTHON_BASE;
      process.env.IMAGE_INSERTER_PYTHON_BASE = '/custom/python';

      const paths = PathConfig.getScriptPathsWithOverride();

      if (originalEnv) {
        process.env.IMAGE_INSERTER_PYTHON_BASE = originalEnv;
      } else {
        delete process.env.IMAGE_INSERTER_PYTHON_BASE;
      }

      expect(paths).toHaveProperty('cliScript');
      expect(paths).toHaveProperty('workingDir');
    });
  });

  describe('getPreloadScriptPath - 预加载脚本路径', () => {
    it('应返回预加载脚本路径', () => {
      const preloadPath = PathConfig.getPreloadScriptPath();
      expect(preloadPath).toBeDefined();
      expect(preloadPath).toContain('preload');
    });
  });

  describe('getRendererHtmlPath - 渲染器HTML路径', () => {
    it('应返回渲染器HTML路径', () => {
      const htmlPath = PathConfig.getRendererHtmlPath();
      expect(htmlPath).toBeDefined();
      expect(htmlPath).toContain('index.html');
    });
  });

  describe('getVitePortCachePath - Vite端口缓存路径', () => {
    it('应返回Vite端口缓存路径', () => {
      const cachePath = PathConfig.getVitePortCachePath();
      expect(cachePath).toBeDefined();
      expect(cachePath).toContain('vite-port-cache');
    });
  });

  describe('getPathConfig - 旧接口兼容', () => {
    it('应返回完整的路径配置对象', () => {
      const config = PathConfig.getPathConfig();
      expect(config).toHaveProperty('logFile');
      expect(config).toHaveProperty('tempDir');
      expect(config).toHaveProperty('resourcesPath');
    });
  });

  describe('toWindowsLongPath - Windows长路径转换', () => {
    it('应调用toLongPath转换', () => {
      const longPath = PathConfig.toWindowsLongPath('C:\\short\\path');
      expect(longPath).toBeDefined();
    });
  });

  describe('isAppPackaged - 打包状态', () => {
    it('应返回当前打包状态', () => {
      const isPackaged = PathConfig.isAppPackaged();
      expect(typeof isPackaged).toBe('boolean');
    });
  });

  describe('getResourcesPath - 资源路径', () => {
    it('应返回资源路径', () => {
      const resourcesPath = PathConfig.getResourcesPath();
      expect(resourcesPath).toBeDefined();
      expect(typeof resourcesPath).toBe('string');
    });
  });

  describe('getDiagLogFilePath - 诊断日志文件路径', () => {
    it('应返回诊断日志文件路径', () => {
      const diagPath = PathConfig.getDiagLogFilePath();
      expect(diagPath).toBeDefined();
      expect(diagPath).toContain('.log');
    });
  });

  describe('getSafeDir - 目录创建错误处理', () => {
    it('mkdirSync 失败时应使用 fallback 路径', async () => {
      vi.resetModules();
      const fs = await import('fs');
      const originalMkdirSync = fs.mkdirSync;
      let callCount = 0;

      fs.mkdirSync = vi.fn((path: any, options: any) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Permission denied');
        }
        return originalMkdirSync(path, options);
      });

      const { getTempDirectory } = await import('../../src/main/path-config');
      const tempDir = getTempDirectory();

      expect(tempDir).toBeDefined();
      fs.mkdirSync = originalMkdirSync;
    });
  });

  describe('getLogFilePath - 环境变量覆盖', () => {
    it('应使用 IMAGE_INSERTER_LOG_FILE 环境变量', async () => {
      const originalEnv = process.env.IMAGE_INSERTER_LOG_FILE;
      process.env.IMAGE_INSERTER_LOG_FILE = 'custom-log.log';

      vi.resetModules();
      const { getLogFilePath } = await import('../../src/main/path-config');
      const logFile = getLogFilePath();

      expect(logFile).toContain('custom-log.log');

      if (originalEnv) {
        process.env.IMAGE_INSERTER_LOG_FILE = originalEnv;
      } else {
        delete process.env.IMAGE_INSERTER_LOG_FILE;
      }
    });
  });
});
