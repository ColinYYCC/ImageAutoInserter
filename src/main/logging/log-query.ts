/**
 * 日志查询模块
 *
 * 提供强大的日志查询功能，支持多维度筛选和全文搜索
 */

import * as fs from 'fs';
import * as path from 'path';
import { LogEntry, LogLevel, LogFilter, LogStats, LogSource } from './log-types';

export class LogQuery {
  private static instance: LogQuery;
  private logDir: string = '';
  private cachedEntries: Map<string, LogEntry[]> = new Map();
  private cacheTimeout: number = 60000;
  private lastCacheTime: number = 0;

  private constructor() {}

  static getInstance(): LogQuery {
    if (!LogQuery.instance) {
      LogQuery.instance = new LogQuery();
    }
    return LogQuery.instance;
  }

  setLogDir(logDir: string): void {
    this.logDir = logDir;
    this.invalidateCache();
  }

  invalidateCache(): void {
    this.cachedEntries.clear();
    this.lastCacheTime = 0;
  }

  private parseLogLine(line: string): LogEntry | null {
    try {
      const match = line.match(/^\[([^\]]+)\] \[(\w+)\] \[([^\]]+)\] (.+)$/);
      if (!match) return null;

      const [, datetime, levelStr, module, rest] = match;

      const levelMap: Record<string, LogLevel> = {
        'DEBUG': LogLevel.DEBUG,
        'INFO': LogLevel.INFO,
        'WARN': LogLevel.WARN,
        'ERROR': LogLevel.ERROR,
      };

      const level = levelMap[levelStr] ?? LogLevel.INFO;

      let message = rest;
      let data: unknown;

      const dataMatch = rest.match(/^(.+?)\n\s+Data: (.+)$/s);
      if (dataMatch) {
        message = dataMatch[1];
        try {
          data = JSON.parse(dataMatch[2]);
        } catch {
          data = dataMatch[2];
        }
      }

      const errorMatch = rest.match(/^(.+?)\n\s+Error: (.+?)\n\s+Stack: (.+)$/s);
      if (errorMatch) {
        message = errorMatch[1];
        data = {
          error: {
            message: errorMatch[2],
            stack: errorMatch[3],
          },
        };
      }

      const timestamp = new Date(datetime).getTime();

      return {
        id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        datetime,
        level,
        levelStr,
        module,
        source: LogSource.MAIN,
        message,
        data,
      };
    } catch {
      return null;
    }
  }

  async loadLogsFromFile(filePath: string): Promise<LogEntry[]> {
    return new Promise((resolve, reject) => {
      const entries: LogEntry[] = [];

      if (!fs.existsSync(filePath)) {
        resolve(entries);
        return;
      }

      const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      let buffer = '';

      readStream.on('data', (chunk: string | Buffer) => {
        const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
        buffer += chunkStr;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const entry = this.parseLogLine(line);
          if (entry) {
            entries.push(entry);
          }
        }
      });

      readStream.on('end', () => {
        if (buffer.trim()) {
          const entry = this.parseLogLine(buffer.trim());
          if (entry) {
            entries.push(entry);
          }
        }
        resolve(entries);
      });

      readStream.on('error', reject);
    });
  }

  async loadAllLogs(): Promise<LogEntry[]> {
    const now = Date.now();
    if (now - this.lastCacheTime < this.cacheTimeout && this.cachedEntries.has('all')) {
      return this.cachedEntries.get('all') || [];
    }

    if (!this.logDir || !fs.existsSync(this.logDir)) {
      return [];
    }

    const files = fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('app_') && f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(this.logDir, f),
        time: fs.statSync(path.join(this.logDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    const allEntries: LogEntry[] = [];

    for (const file of files) {
      const entries = await this.loadLogsFromFile(file.path);
      allEntries.push(...entries);
    }

    allEntries.sort((a, b) => b.timestamp - a.timestamp);

    this.cachedEntries.set('all', allEntries);
    this.lastCacheTime = now;

    return allEntries;
  }

  async query(filter: LogFilter): Promise<LogEntry[]> {
    const allEntries = await this.loadAllLogs();

    let result = allEntries;

    if (filter.level !== undefined) {
      result = result.filter(e => e.level === filter.level);
    }

    if (filter.levelMin !== undefined) {
      result = result.filter(e => e.level >= filter.levelMin!);
    }

    if (filter.levelMax !== undefined) {
      result = result.filter(e => e.level <= filter.levelMax!);
    }

    if (filter.modules && filter.modules.length > 0) {
      result = result.filter(e => filter.modules!.includes(e.module));
    }

    if (filter.sources && filter.sources.length > 0) {
      result = result.filter(e => filter.sources!.includes(e.source));
    }

    if (filter.startTime !== undefined) {
      result = result.filter(e => e.timestamp >= filter.startTime!);
    }

    if (filter.endTime !== undefined) {
      result = result.filter(e => e.timestamp <= filter.endTime!);
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      result = result.filter(e =>
        e.message.toLowerCase().includes(searchLower) ||
        e.module.toLowerCase().includes(searchLower) ||
        (e.data && JSON.stringify(e.data).toLowerCase().includes(searchLower))
      );
    }

    const offset = filter.offset || 0;
    const limit = filter.limit || result.length;

    return result.slice(offset, offset + limit);
  }

  async getStats(): Promise<LogStats> {
    const entries = await this.loadAllLogs();

    if (entries.length === 0) {
      return {
        total: 0,
        byLevel: {},
        byModule: {},
        bySource: {},
        timeRange: { start: 0, end: 0 },
        errorRate: 0,
      };
    }

    const byLevel: Record<number, number> = {};
    const byModule: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const entry of entries) {
      byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
      byModule[entry.module] = (byModule[entry.module] || 0) + 1;
      bySource[entry.source] = (bySource[entry.source] || 0) + 1;
    }

    const errorCount = byLevel[LogLevel.ERROR] || 0;

    return {
      total: entries.length,
      byLevel,
      byModule,
      bySource,
      timeRange: {
        start: entries[entries.length - 1].timestamp,
        end: entries[0].timestamp,
      },
      errorRate: entries.length > 0 ? (errorCount / entries.length) * 100 : 0,
    };
  }

  async getRecentLogs(count: number = 100): Promise<LogEntry[]> {
    return this.query({ limit: count });
  }

  async getLogsByLevel(level: LogLevel): Promise<LogEntry[]> {
    return this.query({ level, limit: 500 });
  }

  async getLogsByModule(module: string): Promise<LogEntry[]> {
    return this.query({ modules: [module], limit: 500 });
  }

  async searchLogs(keyword: string): Promise<LogEntry[]> {
    return this.query({ searchText: keyword, limit: 200 });
  }

  async getLogsInTimeRange(startTime: number, endTime: number): Promise<LogEntry[]> {
    return this.query({ startTime, endTime, limit: 1000 });
  }

  async getLogFiles(): Promise<{ name: string; path: string; size: number; modified: number }[]> {
    if (!this.logDir || !fs.existsSync(this.logDir)) {
      return [];
    }

    return fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('app_') && f.endsWith('.log'))
      .map(f => {
        const filePath = path.join(this.logDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: stats.size,
          modified: stats.mtimeMs,
        };
      })
      .sort((a, b) => b.modified - a.modified);
  }

  async deleteOldLogs(daysToKeep: number): Promise<number> {
    if (!this.logDir || !fs.existsSync(this.logDir)) {
      return 0;
    }

    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('app_') && f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(this.logDir, f),
        mtime: fs.statSync(path.join(this.logDir, f)).mtimeMs,
      }));

    let deletedCount = 0;
    for (const file of files) {
      if (file.mtime < cutoffTime) {
        fs.unlinkSync(file.path);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.invalidateCache();
    }

    return deletedCount;
  }
}
