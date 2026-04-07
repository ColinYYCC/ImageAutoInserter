/**
 * log-store.ts 单元测试
 * 测试覆盖：日志存储单例、配置、存储、刷新等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockWriteStream = {
  write: vi.fn(),
  end: vi.fn((cb) => cb && cb()),
  on: vi.fn(),
};

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  createWriteStream: vi.fn().mockReturnValue(mockWriteStream),
  appendFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue('[]'),
  mkdir: vi.fn((path, opts, cb) => cb && cb(null)),
  readdir: vi.fn((path, cb) => cb && cb(null, [])),
  stat: vi.fn((path, cb) => cb && cb(null, { size: 100 })),
  unlink: vi.fn((path, cb) => cb && cb(null)),
  rmdir: vi.fn((path, cb) => cb && cb(null)),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  resolve: vi.fn((...args) => '/' + args.join('/')),
  dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
}));

vi.mock('../../../src/main/logging/log-types', () => ({
  LogEntry: {},
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  },
}));

describe('log-store.ts - 日志存储测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LogStore 单例', () => {
    it('getInstance 应返回实例', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      expect(instance).toBeDefined();
    });

    it('getInstance 应返回相同实例', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance1 = LogStore.getInstance();
      const instance2 = LogStore.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('LogStore 实例方法', () => {
    it('getConfig 应可调用', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      expect(typeof instance.getConfig).toBe('function');
    });

    it('setConfig 应可调用', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      expect(typeof instance.setConfig).toBe('function');
    });

    it('store 应可调用', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      expect(typeof instance.store).toBe('function');
    });

    it('flush 应可调用', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      expect(typeof instance.flush).toBe('function');
    });

    it('shutdown 应可调用', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      expect(typeof instance.shutdown).toBe('function');
    });
  });

  describe('getConfig - 获取配置', () => {
    it('getConfig 应返回配置对象', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      const config = instance.getConfig();
      expect(config).toBeDefined();
      expect(config).toHaveProperty('logDir');
      expect(config).toHaveProperty('maxFileSizeMB');
      expect(config).toHaveProperty('maxFiles');
      expect(config).toHaveProperty('maxAgeDays');
      expect(config).toHaveProperty('flushInterval');
      expect(config).toHaveProperty('enableConsole');
    });
  });

  describe('setConfig - 设置配置', () => {
    it('setConfig 应可调用', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      instance.setConfig({ maxFiles: 20 });
      expect(typeof instance.setConfig).toBe('function');
    });

    it('setConfig 应能更新 maxFiles', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      instance.setConfig({ maxFiles: 20 });
      expect(instance.getConfig().maxFiles).toBe(20);
    });

    it('setConfig 应能更新 maxFileSizeMB', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      instance.setConfig({ maxFileSizeMB: 20 });
      expect(instance.getConfig().maxFileSizeMB).toBe(20);
    });
  });

  describe('LogStoreConfig 配置', () => {
    it('LogStoreConfig 应包含必要字段', async () => {
      const { LogStoreConfig } = await import('../../../src/main/logging/log-store');
      const config: LogStoreConfig = {
        logDir: '/tmp/test',
        maxFileSizeMB: 10,
        maxFiles: 5,
        maxAgeDays: 7,
        flushInterval: 5000,
        enableConsole: true,
      };
      expect(config.logDir).toBe('/tmp/test');
      expect(config.maxFileSizeMB).toBe(10);
    });
  });

  describe('resetInstance - 重置单例', () => {
    it('resetInstance 应可调用', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      expect(typeof LogStore.resetInstance).toBe('function');
    });

    it('resetInstance 应能重置实例', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      LogStore.resetInstance();
      const instance = LogStore.getInstance();
      expect(instance).toBeDefined();
    });
  });

  describe('store - 存储日志', () => {
    it('store 应能存储 LogEntry', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const { LogEntry } = await import('../../../src/main/logging/log-types');
      const instance = LogStore.getInstance();
      const entry: LogEntry = {
        id: 'test-1',
        timestamp: Date.now(),
        datetime: '2024-01-01 00:00:00.000',
        level: 1,
        levelStr: 'INFO',
        module: 'Test',
        source: 'main',
        message: 'Test message',
      };
      await instance.store(entry);
    });

    it('store 应能处理多个 LogEntry', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const { LogEntry } = await import('../../../src/main/logging/log-types');
      const instance = LogStore.getInstance();
      for (let i = 0; i < 5; i++) {
        const entry: LogEntry = {
          id: `test-${i}`,
          timestamp: Date.now(),
          datetime: '2024-01-01 00:00:00.000',
          level: 1,
          levelStr: 'INFO',
          module: 'Test',
          source: 'main',
          message: `Test message ${i}`,
        };
        await instance.store(entry);
      }
    });
  });

  describe('flush - 刷新缓冲区', () => {
    it('flush 应可调用', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      await instance.flush();
    });

    it('flush 应能刷新所有待处理的日志', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const { LogEntry } = await import('../../../src/main/logging/log-types');
      const instance = LogStore.getInstance();
      const entry: LogEntry = {
        id: 'test-flush',
        timestamp: Date.now(),
        datetime: '2024-01-01 00:00:00.000',
        level: 1,
        levelStr: 'INFO',
        module: 'Test',
        source: 'main',
        message: 'Test flush',
      };
      await instance.store(entry);
      await instance.flush();
    });
  });

  describe('shutdown - 关闭存储', () => {
    it('shutdown 应能正常关闭', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      await instance.shutdown();
    });
  });

  describe('initialize - 初始化', () => {
    it('重复初始化应直接返回', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      await instance.initialize('/tmp/test-logs');
      await instance.initialize('/tmp/test-logs-2');
    });

    it('未配置 logDir 应抛出错误', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      LogStore.resetInstance();
      const instance = LogStore.getInstance({ logDir: '' });
      await expect(instance.initialize()).rejects.toThrow('Log directory not configured');
    });
  });

  describe('rotateIfNeeded - 日志轮转', () => {
    it('应生成正确的日志文件名', async () => {
      const { LogStore } = await import('../../../src/main/logging/log-store');
      const instance = LogStore.getInstance();
      const fileName = (instance as any).getLogFileName();
      expect(fileName).toMatch(/^app_\d{4}-\d{2}-\d{2}\.log$/);
    });
  });
});
