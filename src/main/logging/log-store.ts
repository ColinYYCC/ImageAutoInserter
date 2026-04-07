/**
 * 日志存储模块
 *
 * 负责日志的持久化存储，支持日志轮转和自动清理
 */

import * as fs from 'fs';
import * as path from 'path';
import { LogEntry } from './log-types';

export interface LogStoreConfig {
  logDir: string;
  maxFileSizeMB: number;
  maxFiles: number;
  maxAgeDays: number;
  flushInterval: number;
  enableConsole: boolean;
}

const DEFAULT_CONFIG: LogStoreConfig = {
  logDir: '',
  maxFileSizeMB: 10,
  maxFiles: 10,
  maxAgeDays: 7,
  flushInterval: 5000,
  enableConsole: true,
};

export class LogStore {
  private static instance: LogStore;
  private config: LogStoreConfig;
  private entries: LogEntry[] = [];
  private currentFile: string = '';
  private currentFileSize: number = 0;
  private flushTimer: NodeJS.Timeout | null = null;
  private writeStream: fs.WriteStream | null = null;
  private initialized: boolean = false;
  private maxEntriesInMemory: number = 5000;

  private constructor(config?: Partial<LogStoreConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<LogStoreConfig>): LogStore {
    if (!LogStore.instance) {
      LogStore.instance = new LogStore(config);
    }
    return LogStore.instance;
  }

  static resetInstance(): void {
    if (LogStore.instance) {
      LogStore.instance.shutdown();
      LogStore.instance = undefined as any;
    }
  }

  async initialize(logDir?: string): Promise<void> {
    if (this.initialized) return;

    if (logDir) {
      this.config.logDir = logDir;
    }

    if (!this.config.logDir) {
      throw new Error('Log directory not configured');
    }

    try {
      await this.ensureDir(this.config.logDir);
      await this.rotateIfNeeded();
      this.startFlushTimer();
      this.initialized = true;
    } catch (error) {
      console.error('[LogStore] Failed to initialize:', error);
      throw error;
    }
  }

  private async ensureDir(dirPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private getLogFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    return `app_${dateStr}.log`;
  }

  private async rotateIfNeeded(): Promise<void> {
    const fileName = this.getLogFileName();
    const filePath = path.join(this.config.logDir, fileName);

    if (this.currentFile !== filePath) {
      await this.openNewFile(filePath);
      await this.cleanOldFiles();
    }
  }

  private async openNewFile(filePath: string): Promise<void> {
    if (this.writeStream) {
      await this.closeFile();
    }

    const dirPath = path.dirname(filePath);
    await this.ensureDir(dirPath);

    this.writeStream = fs.createWriteStream(filePath, { flags: 'a', encoding: 'utf-8' });
    this.currentFile = filePath;

    try {
      const stats = await this.getFileStats(filePath);
      this.currentFileSize = stats.size;
    } catch {
      this.currentFileSize = 0;
    }
  }

  private closeFile(): Promise<void> {
    return new Promise((resolve) => {
      if (this.writeStream) {
        this.writeStream.end(() => {
          this.writeStream = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private getFileStats(filePath: string): Promise<fs.Stats> {
    return new Promise((resolve, reject) => {
      fs.stat(filePath, (err, stats) => {
        if (err) reject(err);
        else resolve(stats);
      });
    });
  }

  private async cleanOldFiles(): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.readdir(this.config.logDir, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        const logFiles = files
          .filter(f => f.startsWith('app_') && f.endsWith('.log'))
          .map(f => ({
            name: f,
            path: path.join(this.config.logDir, f),
            time: 0,
          }));

        let cleaned = 0;
        const cutoffTime = Date.now() - (this.config.maxAgeDays * 24 * 60 * 60 * 1000);
        let totalSize = 0;

        const cleanFile = (index: number) => {
          if (index >= logFiles.length) {
            resolve();
            return;
          }

          const file = logFiles[index];
          fs.stat(file.path, (err, stats) => {
            if (err) {
              cleanFile(index + 1);
              return;
            }

            file.time = stats.mtimeMs;
            totalSize += stats.size;

            const tooOld = stats.mtimeMs < cutoffTime;
            const tooMany = logFiles.length > this.config.maxFiles;

            if (tooOld || (tooMany && logFiles.length - cleaned > this.config.maxFiles)) {
              fs.unlink(file.path, (unlinkErr) => {
                if (!unlinkErr) cleaned++;
                cleanFile(index + 1);
              });
            } else {
              cleanFile(index + 1);
            }
          });
        };

        cleanFile(0);
      });
    });
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  async store(entry: LogEntry): Promise<void> {
    this.entries.push(entry);

    if (this.entries.length > this.maxEntriesInMemory) {
      this.entries = this.entries.slice(-this.maxEntriesInMemory);
    }

    await this.writeToFile(entry);
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.initialized || !this.writeStream) return;

    const line = this.formatEntry(entry) + '\n';
    const lineBytes = Buffer.byteLength(line, 'utf-8');

    if (this.currentFileSize + lineBytes > this.config.maxFileSizeMB * 1024 * 1024) {
      await this.rotateIfNeeded();
    }

    if (this.writeStream) {
      await new Promise<void>((resolve, reject) => {
        this.writeStream!.write(line, (err) => {
          if (err) reject(err);
          else resolve();
        });
        this.currentFileSize += lineBytes;
      });
    }
  }

  private formatEntry(entry: LogEntry): string {
    let line = `[${entry.datetime}] [${entry.levelStr}] [${entry.module}] ${entry.message}`;
    if (entry.data !== undefined) {
      if (entry.data instanceof Error) {
        line += `\n  Error: ${entry.data.message}\n  Stack: ${entry.data.stack}`;
      } else if (typeof entry.data === 'object') {
        line += `\n  Data: ${JSON.stringify(entry.data)}`;
      } else {
        line += `\n  Data: ${String(entry.data)}`;
      }
    }
    return line;
  }

  async flush(): Promise<void> {
    if (this.writeStream) {
      await new Promise<void>((resolve) => {
        this.writeStream!.write('', () => resolve());
      });
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.closeFile();
    this.initialized = false;
  }

  getConfig(): LogStoreConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<LogStoreConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
