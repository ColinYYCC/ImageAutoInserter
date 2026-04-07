/**
 * log-analyzer.ts 单元测试
 * 测试覆盖：日志分析、错误趋势、异常检测、性能洞察等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/main/logging/log-query', () => ({
  LogQuery: {
    getInstance: vi.fn(() => ({
      query: vi.fn().mockResolvedValue([]),
      getLogsByTimeRange: vi.fn().mockResolvedValue([]),
      getRecentLogs: vi.fn().mockResolvedValue([]),
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
}));

describe('log-analyzer.ts - 日志分析器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LogAnalyzer 单例', () => {
    it('getInstance 应返回实例', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      expect(instance).toBeDefined();
    });

    it('getInstance 应返回相同实例', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance1 = LogAnalyzer.getInstance();
      const instance2 = LogAnalyzer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('LogAnalyzer 实例方法', () => {
    it('analyze 应可调用', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      expect(typeof instance.analyze).toBe('function');
    });

    it('getErrorTrends 应可调用', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      expect(typeof instance.getErrorTrends).toBe('function');
    });

    it('detectAnomalies 应可调用', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      expect(typeof instance.detectAnomalies).toBe('function');
    });
  });

  describe('analyze - 分析日志', () => {
    it('analyze 应返回分析结果', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      const result = await instance.analyze();
      expect(result).toBeDefined();
    });

    it('analyze 应包含 summary', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      const result = await instance.analyze();
      expect(result).toHaveProperty('summary');
    });

    it('analyze 应能指定时间范围', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      const now = Date.now();
      const result = await instance.analyze(now - 3600000, now);
      expect(result).toBeDefined();
    });
  });

  describe('getErrorTrends - 获取错误趋势', () => {
    it('getErrorTrends 应返回数组', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      const now = Date.now();
      const result = await instance.getErrorTrends(now - 3600000, now);
      expect(Array.isArray(result)).toBe(true);
    });

    it('getErrorTrends 应能指定时间间隔', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      const now = Date.now();
      const result = await instance.getErrorTrends(now - 3600000, now, 60000);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('detectAnomalies - 检测异常', () => {
    it('detectAnomalies 应返回数组', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      const result = await instance.detectAnomalies();
      expect(Array.isArray(result)).toBe(true);
    });

    it('detectAnomalies 应能指定时间范围', async () => {
      const { LogAnalyzer } = await import('../../../src/main/logging/log-analyzer');
      const instance = LogAnalyzer.getInstance();
      const now = Date.now();
      const result = await instance.detectAnomalies(now - 3600000, now);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('ErrorPattern 类型', () => {
    it('ErrorPattern 应包含必要字段', async () => {
      const { ErrorPattern } = await import('../../../src/main/logging/log-analyzer');
      const pattern: ErrorPattern = {
        pattern: 'Test error',
        count: 5,
        lastOccurrence: Date.now(),
        severity: 'high',
        examples: ['error 1', 'error 2'],
      };
      expect(pattern.pattern).toBe('Test error');
      expect(pattern.count).toBe(5);
      expect(pattern.severity).toBe('high');
    });

    it('ErrorPattern 应支持不同严重级别', async () => {
      const { ErrorPattern } = await import('../../../src/main/logging/log-analyzer');
      const pattern: ErrorPattern = {
        pattern: 'Warning pattern',
        count: 10,
        lastOccurrence: Date.now(),
        severity: 'medium',
        examples: ['warn 1'],
      };
      expect(pattern.severity).toBe('medium');
    });
  });

  describe('PerformanceInsight 类型', () => {
    it('PerformanceInsight 应包含必要字段', async () => {
      const { PerformanceInsight } = await import('../../../src/main/logging/log-analyzer');
      const insight: PerformanceInsight = {
        metric: 'response_time',
        value: 150,
        unit: 'ms',
        trend: 'down',
        description: 'Response time improved',
      };
      expect(insight.metric).toBe('response_time');
      expect(insight.value).toBe(150);
      expect(insight.trend).toBe('down');
    });

    it('PerformanceInsight 应支持不同趋势', async () => {
      const { PerformanceInsight } = await import('../../../src/main/logging/log-analyzer');
      const insight: PerformanceInsight = {
        metric: 'cpu_usage',
        value: 85,
        unit: 'percent',
        trend: 'up',
        description: 'CPU usage increased',
      };
      expect(insight.trend).toBe('up');
    });
  });

  describe('LogAnalysis 类型', () => {
    it('LogAnalysis 应包含摘要信息', async () => {
      const { LogAnalysis } = await import('../../../src/main/logging/log-analyzer');
      const analysis: LogAnalysis = {
        summary: {
          totalEntries: 100,
          errorCount: 10,
          warningCount: 20,
          infoCount: 70,
          errorRate: 0.1,
        },
        timeDistribution: [],
        topErrors: [],
        topModules: [],
        insights: [],
        recommendations: [],
      };
      expect(analysis.summary.totalEntries).toBe(100);
      expect(analysis.summary.errorRate).toBe(0.1);
    });

    it('LogAnalysis 应包含时间分布', async () => {
      const { LogAnalysis } = await import('../../../src/main/logging/log-analyzer');
      const analysis: LogAnalysis = {
        summary: {
          totalEntries: 100,
          errorCount: 10,
          warningCount: 20,
          infoCount: 70,
          errorRate: 0.1,
        },
        timeDistribution: [
          { timestamp: Date.now(), count: 50 },
        ],
        topErrors: [],
        topModules: [],
        insights: [],
        recommendations: [],
      };
      expect(analysis.timeDistribution).toHaveLength(1);
    });

    it('LogAnalysis 应包含错误列表', async () => {
      const { LogAnalysis, ErrorPattern } = await import('../../../src/main/logging/log-analyzer');
      const analysis: LogAnalysis = {
        summary: {
          totalEntries: 100,
          errorCount: 10,
          warningCount: 20,
          infoCount: 70,
          errorRate: 0.1,
        },
        timeDistribution: [],
        topErrors: [
          {
            pattern: 'Error pattern 1',
            count: 5,
            lastOccurrence: Date.now(),
            severity: 'high',
            examples: ['error 1'],
          },
        ],
        topModules: [],
        insights: [],
        recommendations: [],
      };
      expect(analysis.topErrors).toHaveLength(1);
    });

    it('LogAnalysis 应包含洞察和建议', async () => {
      const { LogAnalysis } = await import('../../../src/main/logging/log-analyzer');
      const analysis: LogAnalysis = {
        summary: {
          totalEntries: 100,
          errorCount: 10,
          warningCount: 20,
          infoCount: 70,
          errorRate: 0.1,
        },
        timeDistribution: [],
        topErrors: [],
        topModules: [],
        insights: [
          {
            metric: 'error_rate',
            value: 0.1,
            unit: 'percent',
            trend: 'stable',
            description: 'Error rate is stable',
          },
        ],
        recommendations: ['Recommendation 1', 'Recommendation 2'],
      };
      expect(analysis.insights).toHaveLength(1);
      expect(analysis.recommendations).toHaveLength(2);
    });
  });

  describe('ErrorTrend 类型', () => {
    it('ErrorTrend 应包含时间戳和计数', async () => {
      const { ErrorTrend } = await import('../../../src/main/logging/log-analyzer');
      const trend: ErrorTrend = {
        timestamp: Date.now(),
        count: 5,
        rate: 0.05,
      };
      expect(trend.timestamp).toBeDefined();
      expect(trend.count).toBe(5);
      expect(trend.rate).toBe(0.05);
    });
  });

  describe('Anomaly 类型', () => {
    it('Anomaly 应包含必要字段', async () => {
      const { Anomaly } = await import('../../../src/main/logging/log-analyzer');
      const anomaly: Anomaly = {
        type: 'error_spike',
        severity: 'high',
        description: 'Error count increased significantly',
        timestamp: Date.now(),
        value: 100,
        threshold: 20,
      };
      expect(anomaly.type).toBe('error_spike');
      expect(anomaly.severity).toBe('high');
      expect(anomaly.value).toBe(100);
    });

    it('Anomaly 应支持不同类型', async () => {
      const { Anomaly } = await import('../../../src/main/logging/log-analyzer');
      const anomaly: Anomaly = {
        type: 'performance_degradation',
        severity: 'medium',
        description: 'Response time increased',
        timestamp: Date.now(),
        value: 500,
        threshold: 200,
      };
      expect(anomaly.type).toBe('performance_degradation');
    });
  });
});
