/**
 * 渲染进程日志工具
 *
 * 提供统一的日志格式、级别管理和日志收集功能
 * 用于调试和问题诊断
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  module: string;
  message: string;
  data?: unknown;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableTimestamp: boolean;
  enableColors: boolean;
  maxEntries: number;
  onLog?: (entry: LogEntry) => void;
}

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.DEBUG,
  enableTimestamp: true,
  enableColors: true,
  maxEntries: 500,
};

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

const LOG_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '#6c757d',
  [LogLevel.INFO]: '#17a2b8',
  [LogLevel.WARN]: '#ffc107',
  [LogLevel.ERROR]: '#dc3545',
};

class LogCollector {
  private entries: LogEntry[] = [];
  private config: LoggerConfig;
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  constructor(config: LoggerConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  addEntry(entry: LogEntry): void {
    if (entry.level < this.config.minLevel) {
      return;
    }

    this.entries.push(entry);
    if (this.entries.length > this.config.maxEntries) {
      this.entries.shift();
    }

    this.listeners.forEach((listener) => listener(entry));
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter((e) => e.level === level);
  }

  getEntriesByModule(module: string): LogEntry[] {
    return this.entries.filter((e) => e.module === module);
  }

  clear(): void {
    this.entries = [];
  }

  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getStats(): { total: number; byLevel: Record<LogLevel, number>; byModule: Record<string, number> } {
    const stats = {
      total: this.entries.length,
      byLevel: { [LogLevel.DEBUG]: 0, [LogLevel.INFO]: 0, [LogLevel.WARN]: 0, [LogLevel.ERROR]: 0 } as Record<LogLevel, number>,
      byModule: {} as Record<string, number>,
    };

    this.entries.forEach((entry) => {
      stats.byLevel[entry.level]++;
      stats.byModule[entry.module] = (stats.byModule[entry.module] || 0) + 1;
    });

    return stats;
  }
}

function getTimestamp(): string {
  const now = new Date();
  const offset = 8 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const chinaTime = new Date(utc + offset * 60000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${chinaTime.getFullYear()}-${pad(chinaTime.getMonth() + 1)}-${pad(chinaTime.getDate())}T${pad(chinaTime.getHours())}:${pad(chinaTime.getMinutes())}:${pad(chinaTime.getSeconds())}.${now.getMilliseconds().toString().padStart(3, '0')}+08:00`;
}

function formatMessage(entry: LogEntry, config: LoggerConfig): string {
  const parts: string[] = [];

  if (config.enableTimestamp) {
    parts.push(`[${entry.timestamp}]`);
  }

  parts.push(`[${entry.levelName}]`);
  parts.push(`[${entry.module}]`);
  parts.push(entry.message);

  return parts.join(' ');
}

class RendererLogger {
  private module: string;
  private collector: LogCollector;
  private config: LoggerConfig;

  constructor(module: string, collector: LogCollector, config: LoggerConfig) {
    this.module = module;
    this.collector = collector;
    this.config = config;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.config.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: getTimestamp(),
      level,
      levelName: LOG_LEVEL_NAMES[level],
      module: this.module,
      message,
      data,
    };

    const formattedMessage = formatMessage(entry, this.config);

    const color = LOG_COLORS[level];
    const outputData = data !== undefined ? ` ${JSON.stringify(data)}` : '';

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`%c${formattedMessage}${outputData}`, `color: ${color}`);
        break;
      case LogLevel.INFO:
        console.info(`%c${formattedMessage}${outputData}`, `color: ${color}`);
        break;
      case LogLevel.WARN:
        console.warn(`%c${formattedMessage}${outputData}`, `color: ${color}`);
        break;
      case LogLevel.ERROR:
        console.error(`%c${formattedMessage}${outputData}`, `color: ${color}`);
        break;
    }

    this.collector.addEntry(entry);
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }
}

const globalCollector = new LogCollector();

export function createRendererLogger(module: string): RendererLogger {
  return new RendererLogger(module, globalCollector, { ...DEFAULT_CONFIG });
}

export function getLogCollector(): LogCollector {
  return globalCollector;
}

export function setGlobalLogLevel(level: LogLevel): void {
  globalCollector.setConfig({ minLevel: level });
}

export function clearLogs(): void {
  globalCollector.clear();
}

export function getLogStats() {
  return globalCollector.getStats();
}

export function getFilteredLogs(options: { level?: LogLevel; module?: string }): LogEntry[] {
  let entries = globalCollector.getEntries();
  if (options.level !== undefined) {
    entries = entries.filter((e) => e.level === options.level);
  }
  if (options.module !== undefined) {
    entries = entries.filter((e) => e.module === options.module);
  }
  return entries;
}
