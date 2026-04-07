/**
 * 日志分析模块
 *
 * 提供日志分析功能，包括错误趋势、性能分析、异常检测等
 */

import { LogEntry, LogLevel } from './log-types';
import { LogQuery } from './log-query';

export interface ErrorPattern {
  pattern: string;
  count: number;
  lastOccurrence: number;
  severity: 'low' | 'medium' | 'high';
  examples: string[];
}

export interface PerformanceInsight {
  metric: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export interface LogAnalysis {
  summary: {
    totalEntries: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    errorRate: number;
  };
  timeDistribution: {
    hour: number;
    count: number;
    errors: number;
  }[];
  topErrors: ErrorPattern[];
  topModules: {
    module: string;
    count: number;
    errors: number;
  }[];
  insights: PerformanceInsight[];
  recommendations: string[];
}

export class LogAnalyzer {
  private static instance: LogAnalyzer;
  private logQuery: LogQuery;

  private constructor() {
    this.logQuery = LogQuery.getInstance();
  }

  static getInstance(): LogAnalyzer {
    if (!LogAnalyzer.instance) {
      LogAnalyzer.instance = new LogAnalyzer();
    }
    return LogAnalyzer.instance;
  }

  async analyze(
    startTime?: number,
    endTime?: number,
    limit: number = 10000
  ): Promise<LogAnalysis> {
    const entries = await this.logQuery.query({
      startTime,
      endTime,
      limit,
    });

    return this.performAnalysis(entries);
  }

  private performAnalysis(entries: LogEntry[]): LogAnalysis {
    const summary = this.calculateSummary(entries);
    const timeDistribution = this.calculateTimeDistribution(entries);
    const topErrors = this.findTopErrors(entries);
    const topModules = this.calculateTopModules(entries);
    const insights = this.generateInsights(entries, summary);
    const recommendations = this.generateRecommendations(summary, topErrors, insights);

    return {
      summary,
      timeDistribution,
      topErrors,
      topModules,
      insights,
      recommendations,
    };
  }

  private calculateSummary(entries: LogEntry[]): LogAnalysis['summary'] {
    const errorCount = entries.filter(e => e.level === LogLevel.ERROR).length;
    const warningCount = entries.filter(e => e.level === LogLevel.WARN).length;
    const infoCount = entries.filter(e => e.level === LogLevel.INFO).length;

    return {
      totalEntries: entries.length,
      errorCount,
      warningCount,
      infoCount,
      errorRate: entries.length > 0 ? (errorCount / entries.length) * 100 : 0,
    };
  }

  private calculateTimeDistribution(
    entries: LogEntry[]
  ): LogAnalysis['timeDistribution'] {
    const hourCounts: Record<number, { count: number; errors: number }> = {};

    for (let i = 0; i < 24; i++) {
      hourCounts[i] = { count: 0, errors: 0 };
    }

    for (const entry of entries) {
      const hour = new Date(entry.timestamp).getHours();
      hourCounts[hour].count++;
      if (entry.level === LogLevel.ERROR) {
        hourCounts[hour].errors++;
      }
    }

    return Object.entries(hourCounts).map(([hour, data]) => ({
      hour: parseInt(hour),
      count: data.count,
      errors: data.errors,
    }));
  }

  private findTopErrors(entries: LogEntry[]): ErrorPattern[] {
    const errorEntries = entries.filter(e => e.level === LogLevel.ERROR);
    const patternMap: Map<string, { count: number; lastOccurrence: number; firstMessage: string }> = new Map();

    for (const entry of errorEntries) {
      const pattern = this.extractErrorPattern(entry.message);
      const existing = patternMap.get(pattern);

      if (existing) {
        existing.count++;
        existing.lastOccurrence = Math.max(existing.lastOccurrence, entry.timestamp);
      } else {
        patternMap.set(pattern, {
          count: 1,
          lastOccurrence: entry.timestamp,
          firstMessage: entry.message,
        });
      }
    }

    const patterns: ErrorPattern[] = [];
    for (const [pattern, data] of patternMap) {
      const severity = this.calculateSeverity(pattern, data.count);
      patterns.push({
        pattern,
        count: data.count,
        lastOccurrence: data.lastOccurrence,
        severity,
        examples: [data.firstMessage],
      });
    }

    return patterns
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private extractErrorPattern(message: string): string {
    return message
      .replace(/\d+/g, '#')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .replace(/path[\\\/][^\\\/\n]+/gi, 'PATH')
      .replace(/[^\x00-\x7F]+/g, '')
      .trim()
      .substring(0, 100);
  }

  private calculateSeverity(_pattern: string, count: number): 'low' | 'medium' | 'high' {
    if (count > 10) return 'high';
    if (count > 3) return 'medium';
    return 'low';
  }

  private calculateTopModules(
    entries: LogEntry[]
  ): LogAnalysis['topModules'] {
    const moduleMap: Map<string, { count: number; errors: number }> = new Map();

    for (const entry of entries) {
      const existing = moduleMap.get(entry.module);
      if (existing) {
        existing.count++;
        if (entry.level === LogLevel.ERROR) {
          existing.errors++;
        }
      } else {
        moduleMap.set(entry.module, {
          count: 1,
          errors: entry.level === LogLevel.ERROR ? 1 : 0,
        });
      }
    }

    const modules: LogAnalysis['topModules'] = [];
    for (const [module, data] of moduleMap) {
      modules.push({
        module,
        count: data.count,
        errors: data.errors,
      });
    }

    return modules.sort((a, b) => b.count - a.count).slice(0, 10);
  }

  private generateInsights(
    entries: LogEntry[],
    summary: LogAnalysis['summary']
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    if (summary.errorRate > 10) {
      insights.push({
        metric: 'errorRate',
        value: summary.errorRate,
        unit: '%',
        trend: 'up',
        description: `错误率偏高 (${summary.errorRate.toFixed(2)}%)，需要关注`,
      });
    } else if (summary.errorRate < 1) {
      insights.push({
        metric: 'errorRate',
        value: summary.errorRate,
        unit: '%',
        trend: 'down',
        description: '错误率处于正常范围',
      });
    }

    const errorEntries = entries.filter(e => e.level === LogLevel.ERROR);
    if (errorEntries.length > 0) {
      const errorTimestamps = errorEntries.map(e => e.timestamp).sort((a, b) => a - b);
      const timeSpans: number[] = [];
      for (let i = 1; i < errorTimestamps.length; i++) {
        timeSpans.push(errorTimestamps[i] - errorTimestamps[i - 1]);
      }

      if (timeSpans.length > 0) {
        const avgSpan = timeSpans.reduce((a, b) => a + b, 0) / timeSpans.length;
        const hourInMs = 60 * 60 * 1000;

        insights.push({
          metric: 'avgErrorInterval',
          value: avgSpan / 1000,
          unit: 's',
          trend: avgSpan < hourInMs ? 'down' : 'stable',
          description: avgSpan < hourInMs
            ? '错误发生频率较高'
            : '错误发生频率正常',
        });
      }
    }

    return insights;
  }

  private generateRecommendations(
    summary: LogAnalysis['summary'],
    topErrors: ErrorPattern[],
    _insights: PerformanceInsight[]
  ): string[] {
    const recommendations: string[] = [];

    if (summary.errorRate > 10) {
      recommendations.push('建议立即检查最近的错误日志，定位问题根源');
    }

    if (topErrors.length > 0) {
      recommendations.push(`最常见的错误: "${topErrors[0].pattern}" (出现 ${topErrors[0].count} 次)`);
    }

    const highSeverityErrors = topErrors.filter(e => e.severity === 'high');
    if (highSeverityErrors.length > 0) {
      recommendations.push(`检测到 ${highSeverityErrors.length} 个高严重性错误模式，建议优先处理`);
    }

    if (recommendations.length === 0) {
      recommendations.push('系统运行正常，未发现明显问题');
    }

    return recommendations;
  }

  async getErrorTrends(
    startTime: number,
    endTime: number,
    intervalMs: number = 60 * 60 * 1000
  ): Promise<{ time: number; count: number }[]> {
    const entries = await this.logQuery.query({
      startTime,
      endTime,
      limit: 50000,
    });

    const errorEntries = entries.filter(e => e.level === LogLevel.ERROR);
    const trends: Map<number, number> = new Map();

    for (let t = startTime; t <= endTime; t += intervalMs) {
      trends.set(t, 0);
    }

    for (const entry of errorEntries) {
      const bucket = Math.floor(entry.timestamp / intervalMs) * intervalMs;
      trends.set(bucket, (trends.get(bucket) || 0) + 1);
    }

    return Array.from(trends.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time - b.time);
  }

  async detectAnomalies(
    startTime?: number,
    endTime?: number
  ): Promise<{ type: string; description: string; timestamp: number }[]> {
    const entries = await this.logQuery.query({
      startTime,
      endTime,
      limit: 5000,
    });

    const anomalies: { type: string; description: string; timestamp: number }[] = [];

    const errorEntries = entries.filter(e => e.level === LogLevel.ERROR);
    if (errorEntries.length >= 5) {
      const recentErrors = errorEntries.slice(0, 5);
      const timeSpans = recentErrors.map((_, i) =>
        i > 0 ? recentErrors[i].timestamp - recentErrors[i - 1].timestamp : 0
      ).filter(t => t > 0);

      if (timeSpans.length > 0) {
        const avgSpan = timeSpans.reduce((a, b) => a + b, 0) / timeSpans.length;
        if (avgSpan < 60000) {
          anomalies.push({
            type: 'error_burst',
            description: `检测到错误爆发: 5个错误在 ${(avgSpan / 1000).toFixed(1)} 秒内发生`,
            timestamp: recentErrors[0].timestamp,
          });
        }
      }
    }

    const warnEntries = entries.filter(e => e.level === LogLevel.WARN);
    const warnByModule: Map<string, number> = new Map();
    for (const entry of warnEntries) {
      warnByModule.set(entry.module, (warnByModule.get(entry.module) || 0) + 1);
    }

    for (const [module, count] of warnByModule) {
      if (count > 10) {
        anomalies.push({
          type: 'high_warn_module',
          description: `模块 ${module} 产生大量警告 (${count} 次)`,
          timestamp: Date.now(),
        });
      }
    }

    return anomalies;
  }
}
