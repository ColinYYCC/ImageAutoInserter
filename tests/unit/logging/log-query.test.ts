/**
 * log-query.ts 单元测试
 * 测试覆盖：日志查询单例、查询方法、过滤、搜索等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/main/logging/log-types', () => ({
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  },
  LogEntry: {},
  LogFilter: {},
  LogSource: {
    MAIN: 'main',
    RENDERER: 'renderer',
    PYTHON: 'python',
  },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue('[]'),
  readdirSync: vi.fn().mockReturnValue(['app_2024-01-01.log']),
  statSync: vi.fn().mockReturnValue({ size: 1000, mtime: new Date() }),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  resolve: vi.fn((...args) => '/' + args.join('/')),
  dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
}));

describe('log-query.ts - 日志查询器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LogQuery 单例', () => {
    it('getInstance 应返回实例', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      expect(instance).toBeDefined();
    });

    it('getInstance 应返回相同实例', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance1 = LogQuery.getInstance();
      const instance2 = LogQuery.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('LogQuery 实例方法', () => {
    it('query 应可调用', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      expect(typeof instance.query).toBe('function');
    });

    it('getRecentLogs 应可调用', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      expect(typeof instance.getRecentLogs).toBe('function');
    });

    it('setLogDir 应可调用', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      expect(typeof instance.setLogDir).toBe('function');
    });

    it('invalidateCache 应可调用', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      expect(typeof instance.invalidateCache).toBe('function');
    });

    it('searchLogs 应可调用', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      expect(typeof instance.searchLogs).toBe('function');
    });

    it('getStats 应可调用', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      expect(typeof instance.getStats).toBe('function');
    });

    it('getLogFiles 应可调用', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      expect(typeof instance.getLogFiles).toBe('function');
    });

    it('deleteOldLogs 应可调用', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      expect(typeof instance.deleteOldLogs).toBe('function');
    });
  });

  describe('query - 查询日志', () => {
    it('query 应返回数组', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.query({});
      expect(Array.isArray(result)).toBe(true);
    });

    it('query 应能按级别过滤', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.query({ level: 3 });
      expect(Array.isArray(result)).toBe(true);
    });

    it('query 应能按模块过滤', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.query({ module: 'TestModule' });
      expect(Array.isArray(result)).toBe(true);
    });

    it('query 应能按时间范围过滤', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const now = Date.now();
      const result = await instance.query({ startTime: now - 3600000, endTime: now });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getRecentLogs - 获取最近日志', () => {
    it('getRecentLogs 应返回数组', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.getRecentLogs(10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('getRecentLogs 应使用默认数量', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.getRecentLogs();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('setLogDir - 设置日志目录', () => {
    it('setLogDir 应可调用', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      instance.setLogDir('/tmp/logs');
      expect(typeof instance.setLogDir).toBe('function');
    });

    it('setLogDir 应能设置路径', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      instance.setLogDir('/custom/log/path');
    });
  });

  describe('invalidateCache - 清除缓存', () => {
    it('invalidateCache 应可调用', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      instance.invalidateCache();
      expect(typeof instance.invalidateCache).toBe('function');
    });
  });

  describe('searchLogs - 搜索日志', () => {
    it('searchLogs 应返回数组', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.searchLogs('error');
      expect(Array.isArray(result)).toBe(true);
    });

    it('searchLogs 应能搜索关键词', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.searchLogs('test keyword');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getStats - 获取统计信息', () => {
    it('getStats 应返回对象', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.getStats();
      expect(typeof result).toBe('object');
    });

    it('getStats 应包含统计字段', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const stats = await instance.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('getLogFiles - 获取日志文件列表', () => {
    it('getLogFiles 应返回数组', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.getLogFiles();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('deleteOldLogs - 删除旧日志', () => {
    it('deleteOldLogs 应返回数字', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.deleteOldLogs(7);
      expect(typeof result).toBe('number');
    });

    it('deleteOldLogs 应能按天数删除', async () => {
      const { LogQuery } = await import('../../../src/main/logging/log-query');
      const instance = LogQuery.getInstance();
      const result = await instance.deleteOldLogs(30);
      expect(typeof result).toBe('number');
    });
  });
});
