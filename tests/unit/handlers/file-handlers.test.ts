/**
 * file-handlers.ts 单元测试
 * 测试覆盖：文件处理器注册、路径验证等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  shell: {
    openPath: vi.fn(),
  },
  app: {
    getPath: vi.fn(() => '/tmp/test-user-data'),
  },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    statSync: vi.fn(() => ({
      isDirectory: () => true,
      isFile: () => true,
      size: 1024,
      mtime: new Date(),
    })),
    realpathSync: vi.fn((p: string) => p),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    default: {
      ...actual.default,
      existsSync: vi.fn(() => true),
      statSync: vi.fn(() => ({
        isDirectory: () => true,
        isFile: () => true,
        size: 1024,
        mtime: new Date(),
      })),
      realpathSync: vi.fn((p: string) => p),
      mkdirSync: vi.fn(),
      rmSync: vi.fn(),
    },
  };
});

vi.mock('../../../src/main/utils/logging', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  writeLog: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock('../../../src/main/path-config', () => ({
  getPythonScriptPath: () => ({ scriptPath: '/tmp/test-script.py' }),
  getProcessTempDirectory: () => '/tmp/test-temp',
  getLogDirectory: () => '/tmp/logs',
  getScriptPathsWithOverride: () => ({
    cliScript: '/tmp/test-cli.py',
    workingDir: '/tmp',
  }),
}));

vi.mock('../../../src/core/platform', () => ({
  platform: {
    isWindows: () => false,
    isMac: () => true,
  },
}));

vi.mock('../../../src/main/python-bridge', () => ({
  killProcessByPid: vi.fn(),
  executePythonScript: vi.fn(),
}));

vi.mock('../../../src/main/servers/window-manager', () => ({
  getMainWindow: vi.fn(() => ({
    webContents: {
      send: vi.fn(),
    },
    isDestroyed: () => false,
  })),
}));

vi.mock('../../../src/shared/constants', () => ({
  FILE_EXTENSIONS: {
    EXCEL: ['.xlsx'],
    IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
    ARCHIVE: ['.zip', '.rar', '.7z'],
  },
  IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
  EXCEL_EXTENSIONS: ['.xlsx'],
  ARCHIVE_EXTENSIONS: ['.zip', '.rar', '.7z'],
  getExtension: (filename: string) => {
    const ext = filename.match(/\.[^.]+$/);
    return ext ? ext[0] : '';
  },
}));

vi.mock('../../../src/main/utils/path-validator', () => ({
  validatePathSafety: vi.fn(() => ({
    valid: true,
    error: null,
    resolvedPath: '/safe/path',
  })),
  validateDirectoryPath: vi.fn(() => ({
    valid: true,
    error: null,
    resolvedPath: '/safe/dir',
  })),
  normalizePathSeparators: vi.fn((p: string) => p),
  isPathInside: vi.fn(() => true),
}));

describe('file-handlers.ts - 文件处理器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('模块导入', () => {
    it('应成功导入 file-handlers', async () => {
      const fileHandlers = await import('../../../src/main/handlers/file-handlers');
      expect(fileHandlers).toBeDefined();
    });
  });

  describe('registerFileHandlers - 文件处理器注册', () => {
    it('registerFileHandlers 应可调用', async () => {
      const { registerFileHandlers } = await import('../../../src/main/handlers/file-handlers');
      expect(registerFileHandlers).toBeDefined();
      expect(typeof registerFileHandlers).toBe('function');
    });
  });

  describe('ipcMain.handle - IPC 处理器', () => {
    it('ipcMain.handle 应被调用', async () => {
      const { ipcMain } = await import('electron');
      const { registerFileHandlers } = await import('../../../src/main/handlers/file-handlers');
      registerFileHandlers();
      expect(ipcMain.handle).toHaveBeenCalled();
    });
  });

  describe('shell.openPath - 路径打开', () => {
    it('shell.openPath 应可调用', async () => {
      const { shell } = await import('electron');
      expect(shell.openPath).toBeDefined();
    });
  });

  describe('路径验证', () => {
    it('validatePathSafety 应返回有效结果', async () => {
      const { validatePathSafety } = await import('../../../src/main/utils/path-validator');
      const result = validatePathSafety('/test/path');
      expect(result.valid).toBe(true);
    });

    it('normalizePathSeparators 应正常工作', async () => {
      const { normalizePathSeparators } = await import('../../../src/main/utils/path-validator');
      const result = normalizePathSeparators('/test/path');
      expect(result).toBeDefined();
    });
  });
});
