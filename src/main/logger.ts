import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const LOG_FILE = path.join(app.getPath('userData'), 'app.log');

export function ensureLogDir() {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function writeLog(level: string, message: string) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${level}] ${message}`;

  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, entry + '\n');
  } catch (e) {
    // 忽略文件写入错误
  }

  console.log(entry);
}

export function logInfo(msg: string) { writeLog('INFO', msg); }
export function logError(msg: string) { writeLog('ERROR', msg); }
export function logWarn(msg: string) { writeLog('WARN', msg); }
