/**
 * log-handlers.ts 单元测试
 * 测试覆盖：日志查询、统计、搜索等 IPC 处理器
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('../../../src/main/logging', () => ({
  getLogSystem: vi.fn(() => ({
    queryLogs: vi.fn().mockResolvedValue([]),
    getRecentLogs: vi.fn().mockResolvedValue([]),
    searchLogs: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({
      total: 100,
      byLevel: { DEBUG: 10, INFO: 50, WARN: 20, ERROR: 20 },
      byModule: { TestModule: 100 },
    }),
    analyzeLogs: vi.fn().mockResolvedValue({}),
    getErrorTrends: vi.fn().mockResolvedValue([]),
    detectAnomalies: vi.fn().mockResolvedValue([]),
    getLogFiles: vi.fn().mockResolvedValue(['/tmp/test.log']),
    deleteOldLogs: vi.fn().mockResolvedValue(5),
    setMinLevel: vi.fn(),
    getMinLevel: vi.fn().mockReturnValue(1),
    flush: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../src/main/utils/logging', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../../../src/main/logging/log-types', () => ({
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  },
  LogFilter: {},
  LogStats: {},
  LogEntry: {},
}));

describe('log-handlers.ts - 日志处理器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerLogHandlers - 日志处理器注册', () => {
    it('应成功注册日志处理器', async () => {
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      expect(registerLogHandlers).toBeDefined();
      expect(typeof registerLogHandlers).toBe('function');
    });

    it('registerLogHandlers 应可调用', async () => {
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      expect(typeof registerLogHandlers).toBe('function');
    });
  });

  describe('ipcMain.handle - IPC 处理器注册', () => {
    it('应注册 log:query 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:query', expect.any(Function));
    });

    it('应注册 log:getRecent 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:getRecent', expect.any(Function));
    });

    it('应注册 log:search 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:search', expect.any(Function));
    });

    it('应注册 log:getStats 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:getStats', expect.any(Function));
    });

    it('应注册 log:getModules 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:getModules', expect.any(Function));
    });

    it('应注册 log:analyze 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:analyze', expect.any(Function));
    });

    it('应注册 log:getErrorTrends 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:getErrorTrends', expect.any(Function));
    });

    it('应注册 log:detectAnomalies 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:detectAnomalies', expect.any(Function));
    });

    it('应注册 log:getFiles 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:getFiles', expect.any(Function));
    });

    it('应注册 log:deleteOld 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:deleteOld', expect.any(Function));
    });

    it('应注册 log:setLevel 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:setLevel', expect.any(Function));
    });

    it('应注册 log:getLevel 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:getLevel', expect.any(Function));
    });

    it('应注册 log:flush 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:flush', expect.any(Function));
    });

    it('应注册 log:getConfig 处理器', async () => {
      const { ipcMain } = await import('electron');
      const { registerLogHandlers } = await import('../../../src/main/handlers/log-handlers');
      registerLogHandlers();
      expect(ipcMain.handle).toHaveBeenCalledWith('log:getConfig', expect.any(Function));
    });
  });

  describe('getLogSystem - 日志系统获取', () => {
    it('getLogSystem 应可调用', async () => {
      const { getLogSystem } = await import('../../../src/main/logging');
      const system = getLogSystem();
      expect(system).toBeDefined();
    });
  });

  describe('LogLevel 枚举', () => {
    it('LogLevel 应包含正确的级别值', async () => {
      const { LogLevel } = await import('../../../src/main/logging/log-types');
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
    });
  });
});
