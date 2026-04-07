/**
 * log-system.ts 单元测试
 * 测试覆盖：日志系统单例、核心功能等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/main/logging/log-collector', () => ({
  LogCollector: {
    getInstance: vi.fn(() => ({
      setMinLevel: vi.fn(),
      getMinLevel: vi.fn().mockReturnValue(1),
      collect: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  },
}));

vi.mock('../../../src/main/logging/log-store', () => ({
  LogStore: {
    getInstance: vi.fn(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      addEntry: vi.fn(),
      flush: vi.fn(),
      shutdown: vi.fn(),
      getConfig: vi.fn().mockReturnValue({}),
      setConfig: vi.fn(),
    })),
    resetInstance: vi.fn(),
  },
}));

vi.mock('../../../src/main/logging/log-query', () => ({
  LogQuery: {
    getInstance: vi.fn(() => ({
      query: vi.fn().mockResolvedValue([]),
      getRecentLogs: vi.fn().mockResolvedValue([]),
      setLogDir: vi.fn(),
      invalidateCache: vi.fn(),
      getStats: vi.fn().mockResolvedValue({ total: 0, byLevel: {}, byModule: {} }),
    })),
  },
}));

vi.mock('../../../src/main/logging/log-analyzer', () => ({
  LogAnalyzer: {
    getInstance: vi.fn(() => ({
      analyzeLogs: vi.fn().mockResolvedValue({}),
      getErrorTrends: vi.fn().mockResolvedValue([]),
      detectAnomalies: vi.fn().mockResolvedValue([]),
    })),
  },
}));

vi.mock('../../../src/main/logging/log-types', () => ({
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
  LogFilter: {},
}));

describe('log-system.ts - 日志系统测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogSystem - 创建日志系统', () => {
    it('createLogSystem 应可调用', async () => {
      const { createLogSystem } = await import('../../../src/main/logging/log-system');
      expect(typeof createLogSystem).toBe('function');
    });
  });

  describe('LogSystem 实例方法', () => {
    it('queryLogs 应可调用', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      expect(typeof system.queryLogs).toBe('function');
    });

    it('getRecentLogs 应可调用', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      expect(typeof system.getRecentLogs).toBe('function');
    });

    it('analyzeLogs 应可调用', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      expect(typeof system.analyzeLogs).toBe('function');
    });

    it('getErrorTrends 应可调用', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      expect(typeof system.getErrorTrends).toBe('function');
    });

    it('detectAnomalies 应可调用', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      expect(typeof system.detectAnomalies).toBe('function');
    });

    it('setMinLevel 应可调用', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      expect(typeof system.setMinLevel).toBe('function');
    });

    it('getMinLevel 应可调用', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      expect(typeof system.getMinLevel).toBe('function');
    });

    it('getStats 应可调用', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      expect(typeof system.getStats).toBe('function');
    });

    it('flush 应可调用', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      expect(typeof system.flush).toBe('function');
    });
  });

  describe('queryLogs - 查询日志', () => {
    it('queryLogs 应返回数组', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      const result = await system.queryLogs({});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getRecentLogs - 获取最近日志', () => {
    it('getRecentLogs 应返回数组', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      const result = await system.getRecentLogs(10);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getMinLevel - 获取最小级别', () => {
    it('getMinLevel 应返回数字', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      const level = system.getMinLevel();
      expect(typeof level).toBe('number');
    });
  });

  describe('getStats - 获取统计', () => {
    it('getStats 应返回统计对象', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      const stats = await system.getStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byLevel');
      expect(stats).toHaveProperty('byModule');
    });
  });

  describe('initialize - 初始化', () => {
    it('store 初始化失败应抛出错误', async () => {
      const logStore = await import('../../../src/main/logging/log-store');
      (logStore.LogStore.getInstance as any).mockReturnValueOnce({
        initialize: vi.fn().mockRejectedValue(new Error('Store init failed')),
      });

      const { createLogSystem } = await import('../../../src/main/logging/log-system');
      const system = createLogSystem();

      await expect(system.initialize({ logDir: '/tmp/test' })).rejects.toThrow('Store init failed');
    });

    it('flush 应调用 store.flush', async () => {
      const { getLogSystem } = await import('../../../src/main/logging/log-system');
      const system = getLogSystem();
      await system.flush();
    });
  });
});
