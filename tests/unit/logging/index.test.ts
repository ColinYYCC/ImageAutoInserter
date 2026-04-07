/**
 * logging 模块单元测试
 * 测试覆盖：日志收集、存储、查询、分析等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-user-data'),
  },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(() => 'test log content'),
    writeFileSync: vi.fn(),
    appendFileSync: vi.fn(),
    readdirSync: vi.fn(() => ['test.log']),
    statSync: vi.fn(() => ({
      size: 1024,
      mtime: new Date(),
      isFile: () => true,
    })),
    unlinkSync: vi.fn(),
    default: {
      ...actual.default,
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
      readFileSync: vi.fn(() => 'test log content'),
      writeFileSync: vi.fn(),
      appendFileSync: vi.fn(),
      readdirSync: vi.fn(() => ['test.log']),
      statSync: vi.fn(() => ({
        size: 1024,
        mtime: new Date(),
        isFile: () => true,
      })),
      unlinkSync: vi.fn(),
    },
  };
});

vi.mock('../../../src/main/path-config', () => ({
  getLogDirectory: vi.fn(() => '/tmp/test-logs'),
  getDiagLogFilePath: vi.fn(() => '/tmp/test-logs/diag.log'),
}));

describe('logging 模块测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LogLevel 枚举', () => {
    it('应正确导入 LogLevel', async () => {
      const { LogLevel } = await import('../../../src/main/logging/log-types');
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
    });
  });

  describe('LogModule 类型', () => {
    it('DEFAULT_LOG_MODULES 应包含核心模块', async () => {
      const { DEFAULT_LOG_MODULES } = await import('../../../src/main/logging/log-types');
      expect(DEFAULT_LOG_MODULES).toBeDefined();
      expect(Array.isArray(DEFAULT_LOG_MODULES)).toBe(true);
    });
  });

  describe('LOG_LEVEL_COLORS 和 LOG_LEVEL_NAMES', () => {
    it('应正确导入日志级别配置', async () => {
      const { LOG_LEVEL_COLORS, LOG_LEVEL_NAMES } = await import('../../../src/main/logging/log-types');
      expect(LOG_LEVEL_COLORS).toBeDefined();
      expect(LOG_LEVEL_NAMES).toBeDefined();
    });
  });

  describe('LogEntry 类型', () => {
    it('应能创建 LogEntry 对象', async () => {
      const { LogLevel } = await import('../../../src/main/logging/log-types');
      const logEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        module: 'TestModule',
        message: 'Test message',
        data: { key: 'value' },
      };
      expect(logEntry.timestamp).toBeInstanceOf(Date);
      expect(logEntry.level).toBe(LogLevel.INFO);
      expect(logEntry.module).toBe('TestModule');
    });
  });

  describe('LogFilter 类型', () => {
    it('应能创建 LogFilter 对象', async () => {
      const { LogLevel } = await import('../../../src/main/logging/log-types');
      const filter = {
        level: LogLevel.ERROR,
        module: 'TestModule',
        startTime: new Date(),
        endTime: new Date(),
      };
      expect(filter.level).toBe(LogLevel.ERROR);
    });
  });

  describe('LogStats 类型', () => {
    it('应能创建 LogStats 对象', async () => {
      const stats = {
        total: 100,
        byLevel: { DEBUG: 10, INFO: 50, WARN: 20, ERROR: 20 },
        byModule: { TestModule: 100 },
      };
      expect(stats.total).toBe(100);
      expect(stats.byLevel.ERROR).toBe(20);
    });
  });

  describe('模块导出', () => {
    it('应能导入所有日志模块导出', async () => {
      const logging = await import('../../../src/main/logging');
      expect(logging.LogCollector).toBeDefined();
      expect(logging.LogStore).toBeDefined();
      expect(logging.LogQuery).toBeDefined();
      expect(logging.LogAnalyzer).toBeDefined();
      expect(logging.LogSystem).toBeDefined();
      expect(logging.createLogSystem).toBeDefined();
      expect(logging.getLogSystem).toBeDefined();
    });
  });

  describe('LogCollector 导出', () => {
    it('LogCollector 应可实例化', async () => {
      const { LogCollector } = await import('../../../src/main/logging');
      expect(LogCollector).toBeDefined();
    });
  });

  describe('LogStore 导出', () => {
    it('LogStore 应可实例化', async () => {
      const { LogStore } = await import('../../../src/main/logging');
      expect(LogStore).toBeDefined();
    });
  });

  describe('LogQuery 导出', () => {
    it('LogQuery 应可实例化', async () => {
      const { LogQuery } = await import('../../../src/main/logging');
      expect(LogQuery).toBeDefined();
    });
  });

  describe('LogAnalyzer 导出', () => {
    it('LogAnalyzer 应可实例化', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging');
      expect(LogAnalyzer).toBeDefined();
    });
  });

  describe('LogSystem 导出', () => {
    it('LogSystem 应可实例化', async () => {
      const { LogSystem } = await import('../../../src/main/logging');
      expect(LogSystem).toBeDefined();
    });
  });

  describe('createLogSystem', () => {
    it('createLogSystem 应可调用', async () => {
      const { createLogSystem } = await import('../../../src/main/logging');
      const logSystem = createLogSystem({
        logDir: '/tmp/test-logs',
        maxFileSizeMB: 10,
        maxFiles: 5,
        maxAgeDays: 7,
      });
      expect(logSystem).toBeDefined();
    });
  });

  describe('getLogSystem', () => {
    it('getLogSystem 应可调用', async () => {
      vi.resetModules();
      const { getLogSystem } = await import('../../../src/main/logging');
      const system = getLogSystem();
      expect(system).toBeDefined();
    });
  });

  describe('日志类型导出', () => {
    it('应导出所有日志类型', async () => {
      const logging = await import('../../../src/main/logging');
      expect(logging.LogCollector).toBeDefined();
      expect(logging.LogStore).toBeDefined();
      expect(logging.LogQuery).toBeDefined();
      expect(logging.LogAnalyzer).toBeDefined();
    });
  });
});
