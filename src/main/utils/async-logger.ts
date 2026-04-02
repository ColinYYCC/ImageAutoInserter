import * as path from 'path';
import { asyncFileManager, safeAppendFile } from './async-file';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelStr: string;
  message: string;
  data?: unknown;
}

export interface LoggerConfig {
  logDir: string;
  maxFileSize: number;
  maxFiles: number;
  minLevel: LogLevel;
}

const LOG_DIR = 'logs';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;
const MIN_LEVEL = LogLevel.DEBUG;

class AsyncLogger {
  private logDir: string = LOG_DIR;
  private maxFileSize: number = MAX_FILE_SIZE;
  private maxFiles: number = MAX_FILES;
  private minLevel: LogLevel = MIN_LEVEL;
  private currentFile: string = '';
  private currentFileSize: number = 0;
  private logQueue: Promise<void> = Promise.resolve();
  private initialized: boolean = false;

  async initialize(logDir?: string, maxFileSize?: number, maxFiles?: number, minLevel?: LogLevel): Promise<void> {
    if (this.initialized) return;

    if (logDir) this.logDir = logDir;
    if (maxFileSize) this.maxFileSize = maxFileSize;
    if (maxFiles) this.maxFiles = maxFiles;
    if (minLevel !== undefined) this.minLevel = minLevel;

    await this.rotateLogFile();
    this.initialized = true;
  }

  private formatMessage(level: LogLevel, message: string, ...data: unknown[]): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    let logLine = `[${timestamp}] [${levelStr}] ${message}`;

    if (data.length > 0) {
      const dataStr = data.map(d => {
        if (d instanceof Error) {
          return `${d.message}\n${d.stack}`;
        }
        return typeof d === 'object' ? JSON.stringify(d) : String(d);
      }).join(' ');
      logLine += ` ${dataStr}`;
    }

    return logLine;
  }

  private async rotateLogFile(): Promise<void> {
    const fileName = `app_${new Date().toISOString().split('T')[0]}.log`;
    this.currentFile = path.join(this.logDir, fileName);
    this.currentFileSize = 0;

    try {
      const files = await asyncFileManager.listDir(this.logDir);
      const logFiles = files.filter(f => f.startsWith('app_') && f.endsWith('.log'));

      if (logFiles.length > this.maxFiles) {
        logFiles.sort();
        const filesToDelete = logFiles.slice(0, logFiles.length - this.maxFiles);
        for (const file of filesToDelete) {
          await asyncFileManager.deleteFile(path.join(this.logDir, file));
        }
      }

      const exists = await asyncFileManager.exists(this.currentFile);
      if (exists) {
        const stats = require('fs').statSync(this.currentFile);
        this.currentFileSize = stats.size;
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private async writeToFile(message: string): Promise<void> {
    if (this.currentFileSize >= this.maxFileSize) {
      await this.rotateLogFile();
    }

    await safeAppendFile(this.currentFile, message + '\n');
    this.currentFileSize += Buffer.byteLength(message, 'utf-8') + 1;
  }

  private enqueue(level: LogLevel, message: string, ...data: unknown[]): void {
    if (level < this.minLevel) return;

    this.logQueue = this.logQueue.then(async () => {
      try {
        const logMessage = this.formatMessage(level, message, ...data);
        await this.writeToFile(logMessage);
      } catch (error) {
        console.error('Failed to write log:', error);
      }
    });
  }

  debug(message: string, ...data: unknown[]): void {
    this.enqueue(LogLevel.DEBUG, message, ...data);
  }

  info(message: string, ...data: unknown[]): void {
    this.enqueue(LogLevel.INFO, message, ...data);
  }

  warn(message: string, ...data: unknown[]): void {
    this.enqueue(LogLevel.WARN, message, ...data);
  }

  error(message: string, ...data: unknown[]): void {
    this.enqueue(LogLevel.ERROR, message, ...data);
  }

  async flush(): Promise<void> {
    await this.logQueue;
  }
}

export const asyncLogger = new AsyncLogger();
