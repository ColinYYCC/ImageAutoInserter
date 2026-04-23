import * as fs from 'fs';
import * as path from 'path';
import { getLogFilePath, getLogDirectory } from '../path-config';
import { safeAppendFile, safeWriteFile } from '../utils/async-file';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4,
}

const LOG_LEVEL_NAMES: Record<number, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

const LOG_LEVEL_FROM_STRING: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  off: LogLevel.OFF,
};

export interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
}

const MAX_LOG_ENTRIES = 2000;
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024;

class CentralLogManager {
  private currentLevel: LogLevel;
  private logFileInitialized = false;
  private initPromise: Promise<void> | null = null;
  private recentEntries: LogEntry[] = [];
  private writeQueue: string[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.currentLevel = process.env.NODE_ENV === 'production'
      ? LogLevel.INFO
      : LogLevel.DEBUG;
  }

  setLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'off'): void {
    this.currentLevel = LOG_LEVEL_FROM_STRING[level] ?? LogLevel.INFO;
  }

  getLevel(): string {
    return LOG_LEVEL_NAMES[this.currentLevel] || 'INFO';
  }

  private formatTimestamp(): string {
    const now = new Date();
    const offset = 8 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const chinaTime = new Date(utc + (offset * 60000));
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${chinaTime.getFullYear()}-${pad(chinaTime.getMonth() + 1)}-${pad(chinaTime.getDate())}T${pad(chinaTime.getHours())}:${pad(chinaTime.getMinutes())}:${pad(chinaTime.getSeconds())}.${now.getMilliseconds().toString().padStart(3, '0')}+08:00`;
  }

  private getRotatedLogFilePath(): string {
    const logFile = getLogFilePath();
    const dir = path.dirname(logFile);
    const baseName = path.basename(logFile, '.log');
    return path.join(dir, `${baseName}.1.log`);
  }

  private async cleanupRotatedLogFile(): Promise<void> {
    try {
      const rotated = this.getRotatedLogFilePath();
      await fs.promises.access(rotated);
      await fs.promises.unlink(rotated);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to cleanup rotated log file:', error);
      }
    }
  }

  private ensureLogDir(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          const logDir = getLogDirectory();
          await fs.promises.mkdir(logDir, { recursive: true });
          await this.cleanupRotatedLogFile();
        } catch (e) {
          console.error('Failed to create log directory:', e);
        }
      })();
    }
    return this.initPromise;
  }

  write(level: LogLevel, module: string, message: string): void {
    if (level < this.currentLevel) return;

    const timestamp = this.formatTimestamp();
    const levelName = LOG_LEVEL_NAMES[level] || 'INFO';
    const entry: LogEntry = { timestamp, level: levelName, module, message };
    const line = `[${timestamp}] [${levelName}] [${module}] ${message}`;

    this.recentEntries.push(entry);
    if (this.recentEntries.length > MAX_LOG_ENTRIES) {
      this.recentEntries = this.recentEntries.slice(-MAX_LOG_ENTRIES);
    }

    if (level >= LogLevel.ERROR) {
      console.error(line);
    } else if (level === LogLevel.WARN) {
      console.warn(line);
    } else {
      console.log(line);
    }

    this.writeQueue.push(line + '\n');
    this.flushQueue();
  }

  private flushQueue(): void {
    if (this.isProcessingQueue || this.writeQueue.length === 0) return;
    this.isProcessingQueue = true;

    const lines = this.writeQueue.splice(0);
    const content = lines.join('');

    this.ensureLogDir()
      .then(() => {
        const logFile = getLogFilePath();
        if (!this.logFileInitialized) {
          this.logFileInitialized = true;
          return safeWriteFile(logFile, content);
        }
        return safeAppendFile(logFile, content);
      })
      .then(() => this.rotateIfNeeded())
      .catch(() => {})
      .finally(() => {
        this.isProcessingQueue = false;
        if (this.writeQueue.length > 0) {
          this.flushQueue();
        }
      });
  }

  private async rotateIfNeeded(): Promise<void> {
    try {
      const logFile = getLogFilePath();
      const stat = fs.statSync(logFile);
      if (stat.size > MAX_LOG_FILE_SIZE) {
        const rotated = this.getRotatedLogFilePath();
        if (fs.existsSync(rotated)) {
          fs.unlinkSync(rotated);
        }
        fs.renameSync(logFile, rotated);
        this.logFileInitialized = false;
      }
    } catch {}
  }

  getRecentEntries(filter?: { level?: string; module?: string; search?: string; limit?: number }): LogEntry[] {
    let entries = this.recentEntries;

    if (filter?.level) {
      const targetLevel = filter.level.toUpperCase();
      entries = entries.filter(e => e.level === targetLevel);
    }
    if (filter?.module) {
      entries = entries.filter(e => e.module === filter.module);
    }
    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      entries = entries.filter(e => e.message.toLowerCase().includes(searchLower));
    }

    const limit = filter?.limit ?? 500;
    return entries.slice(-limit);
  }

  async readLogFileLines(options?: { lines?: number; level?: string; search?: string }): Promise<LogEntry[]> {
    try {
      const logFile = getLogFilePath();
      const content = await fs.promises.readFile(logFile, 'utf-8');
      const allLines = content.trim().split('\n').filter(Boolean);
      const tailLines = allLines.slice(-(options?.lines ?? 200));

      const entries: LogEntry[] = [];
      const pattern = /^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(?:\[([^\]]+)\]\s*)?(.+)$/;

      for (const line of tailLines) {
        const match = line.match(pattern);
        if (!match) continue;

        const entry: LogEntry = {
          timestamp: match[1],
          level: match[2],
          module: match[3] || 'app',
          message: match[4],
        };

        if (options?.level && entry.level !== options.level.toUpperCase()) continue;
        if (options?.search && !entry.message.toLowerCase().includes(options.search.toLowerCase())) continue;

        entries.push(entry);
      }

      return entries;
    } catch {
      return [];
    }
  }

  getLogStats(): { totalEntries: number; levelCounts: Record<string, number>; logFileSize: number } {
    const levelCounts: Record<string, number> = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0 };
    for (const entry of this.recentEntries) {
      if (entry.level in levelCounts) {
        levelCounts[entry.level]++;
      }
    }

    let logFileSize = 0;
    try {
      const logFile = getLogFilePath();
      if (fs.existsSync(logFile)) {
        logFileSize = fs.statSync(logFile).size;
      }
    } catch {}

    return {
      totalEntries: this.recentEntries.length,
      levelCounts,
      logFileSize,
    };
  }

  async clearLogFile(): Promise<boolean> {
    try {
      const logFile = getLogFilePath();
      await safeWriteFile(logFile, '');
      this.recentEntries = [];
      this.logFileInitialized = false;
      return true;
    } catch {
      return false;
    }
  }

  async exportLogs(): Promise<string | null> {
    try {
      const logFile = getLogFilePath();
      const content = await fs.promises.readFile(logFile, 'utf-8');
      const exportDir = path.join(getLogDirectory(), 'exports');
      await fs.promises.mkdir(exportDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportPath = path.join(exportDir, `logs-${timestamp}.log`);
      await fs.promises.writeFile(exportPath, content, 'utf-8');
      return exportPath;
    } catch {
      return null;
    }
  }

  flushSync(): void {
    if (this.writeQueue.length === 0) return;
    try {
      const logFile = getLogFilePath();
      const logDir = path.dirname(logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const content = this.writeQueue.join('');
      if (!this.logFileInitialized) {
        this.logFileInitialized = true;
        fs.writeFileSync(logFile, content);
      } else {
        fs.appendFileSync(logFile, content);
      }
      this.writeQueue = [];
    } catch {}
  }
}

export const logManager = new CentralLogManager();

export function logDebug(msg: string, module: string = 'app') { logManager.write(LogLevel.DEBUG, module, msg); }
export function logInfo(msg: string, module: string = 'app') { logManager.write(LogLevel.INFO, module, msg); }
export function logWarn(msg: string, module: string = 'app') { logManager.write(LogLevel.WARN, module, msg); }
export function logError(msg: string, module: string = 'app') { logManager.write(LogLevel.ERROR, module, msg); }
export function logWithLevel(level: 'debug' | 'info' | 'warn' | 'error', msg: string, module: string = 'app'): void {
  logManager.write(LOG_LEVEL_FROM_STRING[level] ?? LogLevel.INFO, module, msg);
}

export function setLogLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'off'): void {
  logManager.setLevel(level);
}

export function getLogLevel(): string {
  return logManager.getLevel();
}

export function flushLogManager(): void {
  logManager.flushSync();
}
