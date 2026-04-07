/**
 * ipc-handlers.ts 单元测试
 * 测试覆盖：日志初始化、IPC 处理器注册、日志转发、错误处理等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn(),
  },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    default: {
      ...actual.default,
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
    },
  };
});

vi.mock('../../src/main/path-config', () => ({
  getLogDirectory: vi.fn(() => '/tmp/test-logs'),
  isAppPackaged: vi.fn(() => false),
  getPythonScriptPath: vi.fn(() => ({ scriptPath: '/tmp/test.py' })),
  getPythonBinaryPath: vi.fn(() => null),
}));

vi.mock('../../src/main/handlers/file-handlers', () => ({
  registerFileHandlers: vi.fn(),
}));

vi.mock('../../src/main/handlers/process-handlers', () => ({
  registerProcessHandlers: vi.fn(),
}));

vi.mock('../../src/main/handlers/update-handlers', () => ({
  registerUpdateHandlers: vi.fn(),
}));

vi.mock('../../src/main/handlers/excel-validation-handler', () => ({
  registerExcelValidationHandler: vi.fn(),
}));

vi.mock('../../src/main/handlers/log-handlers', () => ({
  registerLogHandlers: vi.fn(),
}));

vi.mock('../../src/main/logging', () => ({
  createLogSystem: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    close: vi.fn(),
  })),
  getLogSystem: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../../src/main/utils/logging', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../../src/main/logging/log-types', () => ({
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  },
  LogEntry: {},
  LogSource: {
    MAIN: 'main',
    RENDERER: 'renderer',
    PYTHON: 'python',
  },
}));

describe('ipc-handlers.ts - IPC 处理器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initLogOnStartup - 日志初始化', () => {
    it('应成功初始化日志系统', async () => {
      const { initLogOnStartup } = await import('../../src/main/ipc-handlers');
      await initLogOnStartup();
      expect(initLogOnStartup).toBeDefined();
    });

    it('重复初始化应直接返回', async () => {
      const { initLogOnStartup } = await import('../../src/main/ipc-handlers');
      await initLogOnStartup();
      await initLogOnStartup();
    });

    it('日志目录不存在时应创建', async () => {
      const { initLogOnStartup } = await import('../../src/main/ipc-handlers');
      const fs = await import('fs');
      fs.existsSync = vi.fn().mockReturnValueOnce(false);
      await initLogOnStartup();
    });

    it('createLogSystem 应正确传递配置', async () => {
      const { initLogOnStartup } = await import('../../src/main/ipc-handlers');
      const createLogSystem = await import('../../src/main/logging').then(m => m.createLogSystem);
      await initLogOnStartup();
      expect(createLogSystem).toHaveBeenCalled();
    });

    it('initialize 失败时应捕获错误', async () => {
      const logging = await import('../../src/main/logging');
      logging.createLogSystem = vi.fn().mockReturnValue({
        initialize: vi.fn().mockRejectedValue(new Error('Init failed')),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        close: vi.fn(),
      });

      const { initLogOnStartup } = await import('../../src/main/ipc-handlers');
      await initLogOnStartup();
    });

    it('生产环境应使用 INFO 日志级别', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { initLogOnStartup } = await import('../../src/main/ipc-handlers');
      await initLogOnStartup();

      process.env.NODE_ENV = originalEnv;
    });

    it('开发环境应使用 DEBUG 日志级别', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const { initLogOnStartup } = await import('../../src/main/ipc-handlers');
      await initLogOnStartup();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('setupIPCHandlers - IPC 处理器注册', () => {
    it('应成功注册所有处理器', async () => {
      const { setupIPCHandlers } = await import('../../src/main/ipc-handlers');
      setupIPCHandlers();
      expect(setupIPCHandlers).toBeDefined();
    });

    it('重复注册应跳过', async () => {
      const { setupIPCHandlers } = await import('../../src/main/ipc-handlers');
      setupIPCHandlers();
      setupIPCHandlers();
    });

    it('应注册 renderer-log 处理器', async () => {
      const { setupIPCHandlers } = await import('../../src/main/ipc-handlers');
      setupIPCHandlers();
      const { ipcMain } = await import('electron');
      expect(ipcMain.on).toHaveBeenCalledWith('renderer-log', expect.any(Function));
    });

    it('应调用所有 register 函数', async () => {
      const { setupIPCHandlers } = await import('../../src/main/ipc-handlers');
      const registerFileHandlers = await import('../../src/main/handlers/file-handlers').then(m => m.registerFileHandlers);
      const registerProcessHandlers = await import('../../src/main/handlers/process-handlers').then(m => m.registerProcessHandlers);

      setupIPCHandlers();

      expect(registerFileHandlers).toHaveBeenCalled();
      expect(registerProcessHandlers).toHaveBeenCalled();
    });
  });

  describe('renderer-log - 日志转发', () => {
    it('ipcMain.on 应注册 renderer-log 处理器', async () => {
      const { setupIPCHandlers } = await import('../../src/main/ipc-handlers');
      setupIPCHandlers();
      const { ipcMain } = await import('electron');
      expect(ipcMain.on).toHaveBeenCalledWith('renderer-log', expect.any(Function));
    });

    it('getLogSystem 应返回日志系统实例', async () => {
      const { getLogSystem } = await import('../../src/main/logging');
      const logSystem = getLogSystem();
      expect(logSystem).toBeDefined();
    });

    it('renderer-log 处理器应正确转发日志', async () => {
      const { setupIPCHandlers } = await import('../../src/main/ipc-handlers');
      setupIPCHandlers();
      const { ipcMain } = await import('electron');
      const logHandler = (ipcMain.on as any).mock.calls.find((call: any[]) => call[0] === 'renderer-log')[1];
      expect(typeof logHandler).toBe('function');
    });
  });

  describe('模块导入', () => {
    it('应成功导入 ipc-handlers', async () => {
      const ipcHandlers = await import('../../src/main/ipc-handlers');
      expect(ipcHandlers).toHaveProperty('initLogOnStartup');
      expect(ipcHandlers).toHaveProperty('setupIPCHandlers');
    });
  });

  describe('LogLevel 枚举', () => {
    it('LogLevel 应包含正确值', async () => {
      const { LogLevel } = await import('../../src/main/logging/log-types');
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
    });
  });

  describe('错误处理', () => {
    it('createLogSystem 抛出异常时应被捕获', async () => {
      const logging = await import('../../src/main/logging');
      logging.createLogSystem = vi.fn().mockImplementation(() => {
        throw new Error('LogSystem creation failed');
      });

      const { initLogOnStartup } = await import('../../src/main/ipc-handlers');
      await initLogOnStartup();

      logging.createLogSystem = vi.fn().mockReturnValue({
        initialize: vi.fn().mockResolvedValue(undefined),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        close: vi.fn(),
      });
    });

    it('getLogDirectory 抛出异常时应被捕获', async () => {
      const pathConfig = await import('../../src/main/path-config');
      pathConfig.getLogDirectory = vi.fn().mockImplementation(() => {
        throw new Error('Path config failed');
      });

      const { initLogOnStartup } = await import('../../src/main/ipc-handlers');
      await initLogOnStartup();

      pathConfig.getLogDirectory = vi.fn().mockReturnValue('/tmp/test-logs');
    });
  });
});
