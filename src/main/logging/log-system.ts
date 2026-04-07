/**
 * 集中式日志系统主入口
 *
 * 统一管理所有日志模块，提供简单的初始化接口
 */

import { app } from 'electron';
import * as path from 'path';
import { LogCollector } from './log-collector';
import { LogStore } from './log-store';
import { LogQuery } from './log-query';
import { LogAnalyzer } from './log-analyzer';
import { LogLevel, LogEntry, LogFilter, LogStats } from './log-types';

export interface LogSystemConfig {
  logDir?: string;
  minLevel?: LogLevel;
  maxFileSizeMB?: number;
  maxFiles?: number;
  maxAgeDays?: number;
  enableConsole?: boolean;
}

class CentralizedLogSystem {
  private static instance: CentralizedLogSystem;
  private collector: LogCollector;
  private store: LogStore;
  private query: LogQuery;
  private analyzer: LogAnalyzer;
  private initialized: boolean = false;

  private constructor() {
    this.collector = LogCollector.getInstance();
    this.store = LogStore.getInstance();
    this.query = LogQuery.getInstance();
    this.analyzer = LogAnalyzer.getInstance();
  }

  static getInstance(): CentralizedLogSystem {
    if (!CentralizedLogSystem.instance) {
      CentralizedLogSystem.instance = new CentralizedLogSystem();
    }
    return CentralizedLogSystem.instance;
  }

  async initialize(config?: LogSystemConfig): Promise<void> {
    if (this.initialized) return;

    const logDir = config?.logDir || path.join(app.getPath('userData'), 'logs');

    try {
      await this.store.initialize(logDir);
      this.query.setLogDir(logDir);

      if (config?.minLevel !== undefined) {
        this.collector.setMinLevel(config.minLevel);
      }

      this.collector.addListener((entry: LogEntry) => {
        this.store.store(entry).catch(() => {});
      });

      this.initialized = true;

      this.info('LogSystem', `日志系统初始化完成，日志目录: ${logDir}`);
    } catch (error) {
      console.error('[LogSystem] 初始化失败:', error);
      throw error;
    }
  }

  debug(module: string, message: string, data?: unknown): LogEntry | null {
    return this.collector.debug(module, message, data);
  }

  info(module: string, message: string, data?: unknown): LogEntry | null {
    return this.collector.info(module, message, data);
  }

  warn(module: string, message: string, data?: unknown): LogEntry | null {
    return this.collector.warn(module, message, data);
  }

  error(module: string, message: string, data?: unknown): LogEntry | null {
    return this.collector.error(module, message, data);
  }

  async queryLogs(filter: LogFilter): Promise<LogEntry[]> {
    return this.query.query(filter);
  }

  async getStats(): Promise<LogStats> {
    return this.query.getStats();
  }

  async getRecentLogs(count: number = 100): Promise<LogEntry[]> {
    return this.query.getRecentLogs(count);
  }

  async searchLogs(keyword: string): Promise<LogEntry[]> {
    return this.query.searchLogs(keyword);
  }

  async analyzeLogs(
    startTime?: number,
    endTime?: number
  ) {
    return this.analyzer.analyze(startTime, endTime);
  }

  async getErrorTrends(
    startTime: number,
    endTime: number,
    intervalMs?: number
  ) {
    return this.analyzer.getErrorTrends(startTime, endTime, intervalMs);
  }

  async detectAnomalies(startTime?: number, endTime?: number) {
    return this.analyzer.detectAnomalies(startTime, endTime);
  }

  async getLogFiles() {
    return this.query.getLogFiles();
  }

  async deleteOldLogs(daysToKeep: number): Promise<number> {
    return this.query.deleteOldLogs(daysToKeep);
  }

  setMinLevel(level: LogLevel): void {
    this.collector.setMinLevel(level);
  }

  getMinLevel(): LogLevel {
    return this.collector.getMinLevel();
  }

  async flush(): Promise<void> {
    await this.store.flush();
  }

  async shutdown(): Promise<void> {
    this.collector.shutdown();
    await this.store.shutdown();
    this.initialized = false;
  }
}

let logSystemInstance: CentralizedLogSystem | null = null;

export function createLogSystem(_config?: LogSystemConfig): CentralizedLogSystem {
  logSystemInstance = CentralizedLogSystem.getInstance();
  return logSystemInstance;
}

export function getLogSystem(): CentralizedLogSystem {
  if (!logSystemInstance) {
    logSystemInstance = CentralizedLogSystem.getInstance();
  }
  return logSystemInstance;
}

export { CentralizedLogSystem as LogSystem };
