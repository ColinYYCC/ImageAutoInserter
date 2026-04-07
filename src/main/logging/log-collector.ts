/**
 * 日志收集器
 *
 * 统一收集来自不同模块的日志，并转发到日志存储
 */

import { LogEntry, LogLevel, LogSource } from './log-types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function formatDatetime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${date.getMilliseconds().toString().padStart(3, '0')}`;
}

export class LogCollector {
  private static instance: LogCollector;
  private minLevel: LogLevel = LogLevel.DEBUG;
  private enabled: boolean = true;
  private buffer: LogEntry[] = [];
  private bufferMaxSize: number = 1000;
  private flushInterval: number = 1000;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(entry: LogEntry) => void> = [];

  private constructor() {
    this.startFlushTimer();
  }

  static getInstance(): LogCollector {
    if (!LogCollector.instance) {
      LogCollector.instance = new LogCollector();
    }
    return LogCollector.instance;
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  private flushBuffer(): void {
    if (this.buffer.length === 0) return;
    const entries = this.buffer.splice(0, this.buffer.length);
    for (const entry of entries) {
      this.notifyListeners(entry);
    }
  }

  private notifyListeners(entry: LogEntry): void {
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
      }
    }
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  collect(
    level: LogLevel,
    module: string,
    source: LogSource,
    message: string,
    data?: unknown
  ): LogEntry | null {
    if (!this.enabled || level < this.minLevel) {
      return null;
    }

    const timestamp = Date.now();
    const entry: LogEntry = {
      id: generateId(),
      timestamp,
      datetime: formatDatetime(timestamp),
      level,
      levelStr: this.getLevelString(level),
      module,
      source,
      message,
      data,
    };

    this.buffer.push(entry);

    if (this.buffer.length >= this.bufferMaxSize) {
      this.flushBuffer();
    }

    this.notifyListeners(entry);

    return entry;
  }

  private getLevelString(level: LogLevel): string {
    const names: Record<number, string> = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
    };
    return names[level] || 'UNKNOWN';
  }

  debug(module: string, message: string, data?: unknown): LogEntry | null {
    return this.collect(LogLevel.DEBUG, module, LogSource.MAIN, message, data);
  }

  info(module: string, message: string, data?: unknown): LogEntry | null {
    return this.collect(LogLevel.INFO, module, LogSource.MAIN, message, data);
  }

  warn(module: string, message: string, data?: unknown): LogEntry | null {
    return this.collect(LogLevel.WARN, module, LogSource.MAIN, message, data);
  }

  error(module: string, message: string, data?: unknown): LogEntry | null {
    return this.collect(LogLevel.ERROR, module, LogSource.MAIN, message, data);
  }

  addListener(listener: (entry: LogEntry) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (entry: LogEntry) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  removeAllListeners(): void {
    this.listeners = [];
  }

  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushBuffer();
    this.removeAllListeners();
  }

  static resetInstance(): void {
    if (LogCollector.instance) {
      LogCollector.instance.shutdown();
      (LogCollector.instance as unknown) = undefined as any;
    }
  }
}
