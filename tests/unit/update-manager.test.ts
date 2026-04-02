/**
 * 热更新管理器单元测试
 * 测试覆盖：更新检查、下载、安装、错误处理等核心功能
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock 定义
vi.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    currentVersion: { version: '1.0.0' },
    checkForUpdates: vi.fn().mockResolvedValue({}),
    downloadUpdate: vi.fn().mockResolvedValue([]),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
  },
  BrowserWindow: vi.fn(),
}));

vi.mock('../../src/main/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

// 创建 mock CircuitBreaker 实例
const createMockCircuitBreaker = () => ({
  execute: vi.fn(async (fn: any) => {
    try {
      return await fn();
    } catch (error) {
      throw error;
    }
  }),
  getState: vi.fn().mockReturnValue({ isOpen: false, failureCount: 0, lastFailureTime: 0, lastSuccessTime: 0 }),
  reset: vi.fn(),
});

// 使用 factory 函数避免变量提升问题
vi.mock('../../src/main/retry-handler', () => {
  return {
    withRetry: vi.fn(async (fn: any) => {
      try {
        const result = await fn();
        return { success: true, result, attempts: 1, totalTimeMs: 0 };
      } catch (error) {
        return { success: false, error, attempts: 1, totalTimeMs: 0 };
      }
    }),
    CircuitBreaker: vi.fn(() => createMockCircuitBreaker()),
    ErrorRecoveryManager: {
      getInstance: vi.fn().mockReturnValue({
        registerStrategy: vi.fn(),
        recover: vi.fn().mockResolvedValue(true),
      }),
    },
  };
});

// 动态导入被测试模块
async function loadUpdateManager() {
  const module = await import('../../src/main/update-manager');
  return module;
}

describe('UpdateManager - 热更新管理器测试', () => {
  let UpdateManager: any;
  let updateManager: any;
  let autoUpdater: any;
  let eventHandlers: Map<string, Function>;

  beforeEach(async () => {
    eventHandlers = new Map();
    vi.useFakeTimers();
    vi.resetModules();

    // 获取 mock 的 autoUpdater
    const electronUpdater = await import('electron-updater');
    autoUpdater = electronUpdater.autoUpdater;

    // 捕获事件处理器
    autoUpdater.on.mockImplementation((event: string, handler: Function) => {
      eventHandlers.set(event, handler);
    });

    // 加载被测试模块
    const module = await loadUpdateManager();
    UpdateManager = module.UpdateManager;
    updateManager = new UpdateManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('初始化测试', () => {
    it('应在打包环境下启用自动更新', async () => {
      const manager = new UpdateManager();
      const state = manager.getState();
      expect(state).toBeDefined();
    });

    it('应正确配置autoUpdater参数', () => {
      expect(autoUpdater.autoDownload).toBe(false);
      expect(autoUpdater.autoInstallOnAppQuit).toBe(true);
    });

    it('应注册所有必要的事件监听器', () => {
      const expectedEvents = [
        'checking-for-update',
        'update-available',
        'update-not-available',
        'download-progress',
        'update-downloaded',
        'error',
      ];

      expectedEvents.forEach(event => {
        expect(eventHandlers.has(event)).toBe(true);
      });
    });
  });

  describe('状态管理测试', () => {
    it('应返回正确的初始状态', () => {
      const state = updateManager.getState();
      expect(state.checking).toBe(false);
      expect(state.available).toBe(false);
      expect(state.downloaded).toBe(false);
      expect(state.error).toBeNull();
      expect(state.progress).toBe(0);
    });

    it('应返回当前版本号', () => {
      const version = updateManager.getCurrentVersion();
      expect(version).toBe('1.0.0');
    });

    it('状态更新应触发通知', () => {
      const mockWindow = {
        webContents: {
          send: vi.fn(),
        },
        isDestroyed: vi.fn().mockReturnValue(false),
      };

      updateManager.setMainWindow(mockWindow);

      // 模拟更新可用事件
      const handler = eventHandlers.get('update-available');
      handler?.({ version: '1.1.0', releaseNotes: 'Test release notes' });

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'update-available',
        expect.objectContaining({
          version: '1.1.0',
          releaseNotes: 'Test release notes',
        })
      );
    });
  });

  describe('更新检查测试', () => {
    it('应成功调用checkForUpdates', async () => {
      autoUpdater.checkForUpdates.mockResolvedValue({});

      await updateManager.checkForUpdates();

      expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
    });

    it('应处理404错误（无可用更新）', async () => {
      const notFoundError = new Error('404 Not Found');
      autoUpdater.checkForUpdates.mockRejectedValue(notFoundError);

      await updateManager.checkForUpdates();

      const state = updateManager.getState();
      expect(state.error).toBeNull();
    });

    it('应处理网络超时错误', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      autoUpdater.checkForUpdates.mockRejectedValue(timeoutError);

      const mockWindow = {
        webContents: {
          send: vi.fn(),
        },
        isDestroyed: vi.fn().mockReturnValue(false),
      };
      updateManager.setMainWindow(mockWindow);

      await updateManager.checkForUpdates();

      const state = updateManager.getState();
      expect(state.error).toContain('超时');
    }, 10000);

    it('禁用状态下应跳过更新检查', async () => {
      process.env.DISABLE_AUTO_UPDATE = 'true';
      const manager = new UpdateManager();

      await manager.checkForUpdates();

      expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
      delete process.env.DISABLE_AUTO_UPDATE;
    });
  });

  describe('下载更新测试', () => {
    it('应成功调用downloadUpdate', async () => {
      autoUpdater.downloadUpdate.mockResolvedValue([]);

      await updateManager.downloadUpdate();

      expect(autoUpdater.downloadUpdate).toHaveBeenCalled();
    });

    it('应处理下载错误', async () => {
      const downloadError = new Error('Download failed');
      autoUpdater.downloadUpdate.mockRejectedValue(downloadError);

      const mockWindow = {
        webContents: {
          send: vi.fn(),
        },
        isDestroyed: vi.fn().mockReturnValue(false),
      };
      updateManager.setMainWindow(mockWindow);

      await updateManager.downloadUpdate();

      const state = updateManager.getState();
      expect(state.error).toBe('Download failed');
    });

    it('应正确处理下载进度', () => {
      const mockWindow = {
        webContents: {
          send: vi.fn(),
        },
        isDestroyed: vi.fn().mockReturnValue(false),
      };
      updateManager.setMainWindow(mockWindow);

      const handler = eventHandlers.get('download-progress');
      handler?.({
        percent: 50,
        transferred: 52428800,
        total: 104857600,
        bytesPerSecond: 1048576,
      });

      const state = updateManager.getState();
      expect(state.progress).toBe(50);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'update-progress',
        expect.objectContaining({
          percent: 50,
          transferred: 52428800,
          total: 104857600,
        })
      );
    });
  });

  describe('安装更新测试', () => {
    it('应调用quitAndInstall', () => {
      const mockWindow = {
        webContents: {
          send: vi.fn(),
        },
        isDestroyed: vi.fn().mockReturnValue(false),
      };
      updateManager.setMainWindow(mockWindow);

      updateManager.quitAndInstall();
      
      // 验证通知已发送
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'update-will-install',
        expect.objectContaining({
          message: expect.any(String),
          timeout: expect.any(Number),
        })
      );

      // 快进时间
      vi.advanceTimersByTime(5000);

      expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
    });
  });

  describe('事件清理测试', () => {
    it('应正确移除所有监听器', () => {
      updateManager.removeAllListeners();
      expect(autoUpdater.removeAllListeners).toHaveBeenCalledTimes(6);
    });
  });

  describe('边界条件测试', () => {
    it('窗口销毁时不应发送消息', () => {
      const mockWindow = {
        webContents: {
          send: vi.fn(),
        },
        isDestroyed: vi.fn().mockReturnValue(true),
      };
      updateManager.setMainWindow(mockWindow);

      const handler = eventHandlers.get('update-available');
      handler?.({ version: '1.1.0' });

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('应处理空releaseNotes', () => {
      const mockWindow = {
        webContents: {
          send: vi.fn(),
        },
        isDestroyed: vi.fn().mockReturnValue(false),
      };
      updateManager.setMainWindow(mockWindow);

      const handler = eventHandlers.get('update-available');
      handler?.({ version: '1.1.0' });

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'update-available',
        expect.objectContaining({
          version: '1.1.0',
        })
      );
    });
  });
});
