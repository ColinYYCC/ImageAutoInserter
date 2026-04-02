import { getLogFilePath, getLogDirectory } from './path-config';
import { asyncFileManager, safeAppendFile, safeWriteFile } from './utils/async-file';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4,
}

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

let currentLogLevel: LogLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

let logFileInitialized = false;
let initPromise: Promise<void> | null = null;

export function ensureLogDir(): Promise<void> {
  const logDir = getLogDirectory();

  if (!initPromise) {
    initPromise = (async () => {
      try {
        await asyncFileManager.ensureDir(logDir);
      } catch (e) {
        console.error('Failed to create log directory:', e);
      }
    })();
  }

  return initPromise;
}

export function setLogLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'off'): void {
  switch (level) {
    case 'debug':
      currentLogLevel = LogLevel.DEBUG;
      break;
    case 'info':
      currentLogLevel = LogLevel.INFO;
      break;
    case 'warn':
      currentLogLevel = LogLevel.WARN;
      break;
    case 'error':
      currentLogLevel = LogLevel.ERROR;
      break;
    case 'off':
      currentLogLevel = LogLevel.OFF;
      break;
  }
}

export function getLogLevel(): string {
  return LOG_LEVEL_NAMES[currentLogLevel] || 'INFO';
}

function formatTimestamp(): string {
  const now = new Date();
  const offset = 8 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const chinaTime = new Date(utc + (offset * 60000));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${chinaTime.getFullYear()}-${pad(chinaTime.getMonth() + 1)}-${pad(chinaTime.getDate())}T${pad(chinaTime.getHours())}:${pad(chinaTime.getMinutes())}:${pad(chinaTime.getSeconds())}.${now.getMilliseconds().toString().padStart(3, '0')}+08:00`;
}

function writeLog(level: LogLevel, message: string): void {
  if (level < currentLogLevel) return;

  const timestamp = formatTimestamp();
  const levelName = LOG_LEVEL_NAMES[level] || 'INFO';
  const entry = `[${timestamp}] [${levelName}] ${message}`;

  if (level >= LogLevel.ERROR) {
    console.error(entry);
  } else if (level === LogLevel.WARN) {
    console.warn(entry);
  } else {
    console.log(entry);
  }

  ensureLogDir().then(() => {
    const logFile = getLogFilePath();
    if (!logFileInitialized) {
      logFileInitialized = true;
      safeWriteFile(logFile, entry + '\n').catch(() => {});
    } else {
      safeAppendFile(logFile, entry + '\n').catch(() => {});
    }
  }).catch(() => {});
}

export function logWithLevel(level: 'debug' | 'info' | 'warn' | 'error', msg: string): void {
  switch (level) {
    case 'debug':
      writeLog(LogLevel.DEBUG, msg);
      break;
    case 'info':
      writeLog(LogLevel.INFO, msg);
      break;
    case 'warn':
      writeLog(LogLevel.WARN, msg);
      break;
    case 'error':
      writeLog(LogLevel.ERROR, msg);
      break;
  }
}

export function logDebug(msg: string) { writeLog(LogLevel.DEBUG, msg); }
export function logInfo(msg: string) { writeLog(LogLevel.INFO, msg); }
export function logWarn(msg: string) { writeLog(LogLevel.WARN, msg); }
export function logError(msg: string) { writeLog(LogLevel.ERROR, msg); }
