import { getLogDirectory } from './path-config';
import { asyncFileManager, safeAppendFile, safeWriteFile } from './utils/async-file';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4,
}

export interface LogConfig {
  level: LogLevel;
  enableFile: boolean;
  enableConsole: boolean;
  maxFileSizeMB: number;
  maxFiles: number;
  logDir: string;
}

function parseLogLevel(level: string | undefined): LogLevel {
  if (!level) return LogLevel.INFO;
  const upperLevel = level.toUpperCase();
  switch (upperLevel) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'OFF': return LogLevel.OFF;
    default: return LogLevel.INFO;
  }
}

export const DEFAULT_LOG_CONFIG: LogConfig = {
  level: parseLogLevel(process.env.LOG_LEVEL) || (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG),
  enableFile: process.env.LOG_ENABLE_FILE !== 'false',
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false' && process.env.NODE_ENV !== 'production',
  maxFileSizeMB: parseInt(process.env.LOG_MAX_FILE_SIZE_MB || '10', 10),
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
  logDir: process.env.LOG_DIR || 'logs',
};

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

export class Logger {
  private static instance: Logger;
  private config: LogConfig;
  private logFile: string | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor(config: Partial<LogConfig> = {}) {
    this.config = { ...DEFAULT_LOG_CONFIG, ...config };
  }

  static getInstance(config?: Partial<LogConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  static resetInstance(): void {
    Logger.instance = undefined as any;
  }

  private async ensureInitializedAsync(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    if (this.config.enableFile && !this.logFile) {
      this.initPromise = (async () => {
        try {
          const logDir = getLogDirectory();

          await asyncFileManager.ensureDir(logDir);

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const path = await import('path');
          this.logFile = path.join(logDir, `app-${timestamp}.log`);

          await safeWriteFile(this.logFile, '');
          this.initialized = true;
        } catch (e) {
          console.error('Failed to initialize logger:', e);
        }
      })();

      await this.initPromise;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: LogLevel, module: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level] || 'UNKNOWN';
    let formatted = `[${timestamp}] [${levelName}] [${module}] ${message}`;

    if (data !== undefined) {
      if (data instanceof Error) {
        formatted += `\n  Error: ${data.message}\n  Stack: ${data.stack}`;
      } else if (typeof data === 'object') {
        formatted += `\n  Data: ${JSON.stringify(data, null, 2)}`;
      } else {
        formatted += `\n  Data: ${String(data)}`;
      }
    }

    return formatted;
  }

  private write(level: LogLevel, module: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    this.ensureInitializedAsync().catch(() => {});

    const formatted = this.formatMessage(level, module, message, data);

    if (this.config.enableConsole) {
      const consoleMethod = level >= LogLevel.ERROR ? 'error' : level === LogLevel.WARN ? 'warn' : 'log';
      console[consoleMethod](formatted);
    }

    if (this.config.enableFile && this.logFile) {
      safeAppendFile(this.logFile, formatted + '\n').catch(() => {});
    }
  }

  debug(module: string, message: string, data?: unknown): void {
    this.write(LogLevel.DEBUG, module, message, data);
  }

  info(module: string, message: string, data?: unknown): void {
    this.write(LogLevel.INFO, module, message, data);
  }

  warn(module: string, message: string, data?: unknown): void {
    this.write(LogLevel.WARN, module, message, data);
  }

  error(module: string, message: string, data?: unknown): void {
    this.write(LogLevel.ERROR, module, message, data);
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  static setGlobalLevel(level: LogLevel): void {
    DEFAULT_LOG_CONFIG.level = level;
  }
}

export const logger = Logger.getInstance();
export default logger;
