import * as fs from 'fs';
import * as path from 'path';
import { getLogFilePath } from '../path-config';
import { LogLevel } from '../logger';

const LOG_LEVEL_PRIORITY: Record<number, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

let currentLogLevel: LogLevel = LogLevel.INFO;

export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

const logQueue: Array<{ level: LogLevel; message: string }> = [];
let isProcessingQueue = false;
let fsAvailable = true;

export function setFsAvailable(available: boolean): void {
  fsAvailable = available;
}

async function processQueue(): Promise<void> {
  if (isProcessingQueue || !fsAvailable) return;
  isProcessingQueue = true;

  while (logQueue.length > 0) {
    const item = logQueue.shift();
    if (!item) continue;

    try {
      const logPath = getLogFilePath();
      const logDir = path.dirname(logPath);
      await fs.promises.mkdir(logDir, { recursive: true });
      const logLine = `[${formatTimestamp()}] [${item.level}] ${item.message}\n`;

      await fs.promises.appendFile(logPath, logLine);
    } catch {
    }
  }

  isProcessingQueue = false;
}

function writeLogToFile(level: LogLevel, message: string): void {
  if (!shouldLog(level)) {
    return;
  }

  if (fsAvailable) {
    logQueue.push({ level, message });
    processQueue();
  } else {
    logQueue.push({ level, message });
  }
}

function writeLogInternal(level: LogLevel, ...args: unknown[]): void {
  const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  writeLogToFile(level, message);
}

export const log = {
  debug: (...args: unknown[]) => writeLogInternal(LogLevel.DEBUG, ...args),
  info: (...args: unknown[]) => writeLogInternal(LogLevel.INFO, ...args),
  warn: (...args: unknown[]) => writeLogInternal(LogLevel.WARN, ...args),
  error: (...args: unknown[]) => writeLogInternal(LogLevel.ERROR, ...args),
};

export function logDebug(msg: string) { writeLogInternal(LogLevel.DEBUG, msg); }
export function logInfo(msg: string) { writeLogInternal(LogLevel.INFO, msg); }
export function logWarn(msg: string) { writeLogInternal(LogLevel.WARN, msg); }
export function logError(msg: string) { writeLogInternal(LogLevel.ERROR, msg); }
export function writeLog(...args: unknown[]): void { writeLogInternal(LogLevel.INFO, ...args); }

export async function flushLogs(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 100));
}
