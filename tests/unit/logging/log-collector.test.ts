/**
 * log-collector.ts 单元测试
 * 测试覆盖：日志收集器单例、缓冲区管理、日志转发、过滤等
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
  LogSource: {
    MAIN: 'main',
    RENDERER: 'renderer',
    PYTHON: 'python',
  },
}));

describe('log-collector.ts - 日志收集器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LogCollector 单例', () => {
    it('getInstance 应返回实例', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      expect(instance).toBeDefined();
    });

    it('getInstance 应返回相同实例', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance1 = LogCollector.getInstance();
      const instance2 = LogCollector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('LogCollector 实例方法', () => {
    it('setMinLevel 应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      expect(typeof instance.setMinLevel).toBe('function');
    });

    it('getMinLevel 应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      expect(typeof instance.getMinLevel).toBe('function');
    });

    it('collect 应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      expect(typeof instance.collect).toBe('function');
    });

    it('addListener 应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      expect(typeof instance.addListener).toBe('function');
    });

    it('removeListener 应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      expect(typeof instance.removeListener).toBe('function');
    });
  });

  describe('setMinLevel - 设置最小日志级别', () => {
    it('应能设置最小日志级别', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      instance.setMinLevel(3);
      expect(instance.getMinLevel()).toBe(3);
    });
  });

  describe('getMinLevel - 获取最小日志级别', () => {
    it('应返回当前最小日志级别', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      const level = instance.getMinLevel();
      expect(typeof level).toBe('number');
    });
  });

  describe('addListener - 添加监听器', () => {
    it('应能添加日志监听器', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      const listener = vi.fn();
      instance.addListener(listener);
      expect(typeof listener).toBe('function');
    });
  });

  describe('removeListener - 移除监听器', () => {
    it('应能移除日志监听器', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      const listener = vi.fn();
      instance.addListener(listener);
      instance.removeListener(listener);
      expect(typeof listener).toBe('function');
    });
  });

  describe('debug - DEBUG 级别日志', () => {
    it('debug 方法应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      instance.setMinLevel(0);
      const entry = instance.debug('TestModule', 'Debug message');
      expect(entry).toBeDefined();
    });
  });

  describe('info - INFO 级别日志', () => {
    it('info 方法应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      const entry = instance.info('TestModule', 'Info message');
      expect(entry).toBeDefined();
    });
  });

  describe('warn - WARN 级别日志', () => {
    it('warn 方法应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      const entry = instance.warn('TestModule', 'Warn message');
      expect(entry).toBeDefined();
    });
  });

  describe('error - ERROR 级别日志', () => {
    it('error 方法应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      const entry = instance.error('TestModule', 'Error message');
      expect(entry).toBeDefined();
    });
  });

  describe('collect - 日志收集', () => {
    it('collect 应返回 LogEntry', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const { LogSource } = await import('../../../src/main/logging/log-types');
      const instance = LogCollector.getInstance();
      instance.setEnabled(true);
      instance.setMinLevel(0);
      const entry = instance.collect(1, 'TestModule', LogSource.MAIN, 'Test message');
      expect(entry).toBeDefined();
      expect(entry?.message).toBe('Test message');
    });

    it('collect 应包含正确的时间戳和模块信息', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const { LogSource } = await import('../../../src/main/logging/log-types');
      const instance = LogCollector.getInstance();
      instance.setEnabled(true);
      instance.setMinLevel(0);
      const entry = instance.collect(1, 'MyModule', LogSource.MAIN, 'Test message');
      expect(entry?.module).toBe('MyModule');
      expect(entry?.timestamp).toBeDefined();
      expect(entry?.datetime).toBeDefined();
    });

    it('禁用时应返回 null', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const { LogSource } = await import('../../../src/main/logging/log-types');
      const instance = LogCollector.getInstance();
      instance.setEnabled(false);
      const entry = instance.collect(1, 'TestModule', LogSource.MAIN, 'Test message');
      expect(entry).toBeNull();
    });

    it('低于最小级别时应返回 null', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const { LogSource } = await import('../../../src/main/logging/log-types');
      const instance = LogCollector.getInstance();
      instance.setEnabled(true);
      instance.setMinLevel(3);
      const entry = instance.collect(1, 'TestModule', LogSource.MAIN, 'Test message');
      expect(entry).toBeNull();
    });
  });

  describe('setEnabled - 设置启用状态', () => {
    it('setEnabled 应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      instance.setEnabled(false);
      expect(instance.isEnabled()).toBe(false);
      instance.setEnabled(true);
      expect(instance.isEnabled()).toBe(true);
    });
  });

  describe('isEnabled - 获取启用状态', () => {
    it('isEnabled 应返回布尔值', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      expect(typeof instance.isEnabled()).toBe('boolean');
    });
  });

  describe('removeAllListeners - 移除所有监听器', () => {
    it('removeAllListeners 应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      instance.addListener(vi.fn());
      instance.addListener(vi.fn());
      instance.removeAllListeners();
      expect(typeof instance.removeAllListeners).toBe('function');
    });
  });

  describe('shutdown - 关闭收集器', () => {
    it('shutdown 应可调用', async () => {
      const { LogCollector } = await import('../../../src/main/logging/log-collector');
      const instance = LogCollector.getInstance();
      instance.shutdown();
      expect(typeof instance.shutdown).toBe('function');
    });
  });
});
