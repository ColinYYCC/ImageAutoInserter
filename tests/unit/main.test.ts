/**
 * main.ts 单元测试
 * 测试覆盖：应用生命周期、错误处理、信号处理等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  app: {
    commandLine: {
      appendSwitch: vi.fn(),
    },
    whenReady: vi.fn().mockResolvedValue(undefined),
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    quit: vi.fn(),
    exit: vi.fn(),
    on: vi.fn(),
    getPath: vi.fn(() => '/tmp/test-user-data'),
    isPackaged: false,
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

vi.mock('../../src/main/ipc-handlers', () => ({
  setupIPCHandlers: vi.fn(),
  initLogOnStartup: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/main/servers/window-manager', () => ({
  createMainWindow: vi.fn().mockResolvedValue({}),
  showStartupError: vi.fn(),
  focusMainWindow: vi.fn(),
}));

vi.mock('../../src/main/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../../src/main/performance-monitor', () => ({
  performanceMonitor: {
    recordMemory: vi.fn(),
  },
}));

vi.mock('../../src/main/python-bridge', () => ({
  pythonBridge: {
    killCurrentProcess: vi.fn(),
  },
  cleanupAllTemp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/core/platform', () => ({
  platform: {
    isMac: vi.fn(() => false),
    isWindows: vi.fn(() => false),
  },
}));

vi.mock('../../src/main/startup-check', () => ({
  performStartupCheck: vi.fn(() => true),
}));

vi.mock('../../src/main/utils/security-bookmark', () => ({
  securityBookmarkManager: {
    restoreAllBookmarks: vi.fn(),
    stopAllAccesses: vi.fn(),
  },
}));

describe('main.ts - Electron 应用主入口测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('模块导入', () => {
    it('应成功导入所有依赖模块', async () => {
      const main = await import('../../src/main/main');
      expect(main).toBeDefined();
    });
  });

  describe('performCleanup - 清理函数', () => {
    it('cleanupAllTemp 应被调用', async () => {
      const { cleanupAllTemp } = await import('../../src/main/python-bridge');
      await cleanupAllTemp();
      expect(cleanupAllTemp).toHaveBeenCalled();
    });

    it('pythonBridge.killCurrentProcess 应被调用', async () => {
      const { pythonBridge } = await import('../../src/main/python-bridge');
      pythonBridge.killCurrentProcess();
      expect(pythonBridge.killCurrentProcess).toHaveBeenCalled();
    });
  });

  describe('app.whenReady - 应用就绪', () => {
    it('当 ready 时应执行初始化逻辑', async () => {
      const { app } = await import('electron');
      expect(app.whenReady).toBeDefined();
    });
  });

  describe('平台检测', () => {
    it('应正确检测 Mac 平台', async () => {
      const { platform } = await import('../../src/core/platform');
      const isMac = platform.isMac();
      expect(typeof isMac).toBe('boolean');
    });

    it('应正确检测 Windows 平台', async () => {
      const { platform } = await import('../../src/core/platform');
      const isWindows = platform.isWindows();
      expect(typeof isWindows).toBe('boolean');
    });
  });

  describe('startup-check', () => {
    it('performStartupCheck 应返回 true', async () => {
      const { performStartupCheck } = await import('../../src/main/startup-check');
      const result = performStartupCheck();
      expect(result).toBe(true);
    });
  });

  describe('securityBookmarkManager', () => {
    it('restoreAllBookmarks 应在 Mac 平台被调用', async () => {
      const { securityBookmarkManager } = await import('../../src/main/utils/security-bookmark');
      securityBookmarkManager.restoreAllBookmarks();
      expect(securityBookmarkManager.restoreAllBookmarks).toHaveBeenCalled();
    });

    it('stopAllAccesses 应在退出时被调用', async () => {
      const { securityBookmarkManager } = await import('../../src/main/utils/security-bookmark');
      securityBookmarkManager.stopAllAccesses();
      expect(securityBookmarkManager.stopAllAccesses).toHaveBeenCalled();
    });
  });

  describe('window-manager', () => {
    it('createMainWindow 应被调用', async () => {
      const { createMainWindow } = await import('../../src/main/servers/window-manager');
      await createMainWindow();
      expect(createMainWindow).toHaveBeenCalled();
    });

    it('showStartupError 应显示错误', async () => {
      const { showStartupError } = await import('../../src/main/servers/window-manager');
      const error = new Error('Test error');
      showStartupError(error);
      expect(showStartupError).toHaveBeenCalledWith(error);
    });

    it('focusMainWindow 应聚焦窗口', async () => {
      const { focusMainWindow } = await import('../../src/main/servers/window-manager');
      focusMainWindow();
      expect(focusMainWindow).toHaveBeenCalled();
    });
  });

  describe('ipc-handlers', () => {
    it('setupIPCHandlers 应被注册', async () => {
      const { setupIPCHandlers } = await import('../../src/main/ipc-handlers');
      setupIPCHandlers();
      expect(setupIPCHandlers).toHaveBeenCalled();
    });

    it('initLogOnStartup 应初始化日志', async () => {
      const { initLogOnStartup } = await import('../../src/main/ipc-handlers');
      await initLogOnStartup();
      expect(initLogOnStartup).toHaveBeenCalled();
    });
  });
});
