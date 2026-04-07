/**
 * 统一日志门面模块
 *
 * 提供跨进程的统一日志接口
 * - 主进程：直接使用日志系统
 * - 渲染进程：使用 console API
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;

function getTimestamp(): string {
  const now = new Date();
  const offset = 8 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const chinaTime = new Date(utc + (offset * 60000));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${chinaTime.getFullYear()}-${pad(chinaTime.getMonth() + 1)}-${pad(chinaTime.getDate())}T${pad(chinaTime.getHours())}:${pad(chinaTime.getMinutes())}:${pad(chinaTime.getSeconds())}.${now.getMilliseconds().toString().padStart(3, '0')}+08:00`;
}

function formatMessage(level: LogLevel, module: string, message: string, data?: unknown): string {
  const timestamp = getTimestamp();
  const levelName = LOG_LEVEL_NAMES[level] || 'INFO';
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${levelName}] [${module}] ${message}${dataStr}`;
}

class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const formattedMessage = formatMessage(level, this.module, message, data);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
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

export function createLogger(module: string): Logger {
  return new Logger(module);
}

export function createModuleLogger(moduleName: string) {
  const logger = new Logger(moduleName);

  return {
    debug: (message: string, data?: unknown) => logger.debug(message, data),
    info: (message: string, data?: unknown) => logger.info(message, data),
    warn: (message: string, data?: unknown) => logger.warn(message, data),
    error: (message: string, data?: unknown) => logger.error(message, data),
    module: moduleName
  };
}

export const logger = {
  debug: (message: string, data?: unknown) => new Logger('App').debug(message, data),
  info: (message: string, data?: unknown) => new Logger('App').info(message, data),
  warn: (message: string, data?: unknown) => new Logger('App').warn(message, data),
  error: (message: string, data?: unknown) => new Logger('App').error(message, data),
};
