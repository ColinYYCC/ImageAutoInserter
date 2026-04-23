import { crashReporter } from 'electron';
import fs from 'fs';
import path from 'path';
import { getLogDirectory } from '../path-config';
import { writeLog } from './logging';

let isInitialized = false;

export function initCrashReporter(): void {
  if (isInitialized) {
    return;
  }

  try {
    const logDir = getLogDirectory();
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const crashLogPath = path.join(logDir, 'crash.log');

    process.on('uncaughtException', (error) => {
      const timestamp = new Date().toISOString();
      const crashEntry = `[${timestamp}] [UNCAUGHT_EXCEPTION] ${error.message}\nStack: ${error.stack || 'N/A'}\n\n`;

      try {
        fs.appendFileSync(crashLogPath, crashEntry, 'utf-8');
      } catch {
      }

      writeLog(`[CrashReporter] 未捕获异常: ${error.message}`);
    });

    process.on('unhandledRejection', (reason) => {
      const timestamp = new Date().toISOString();
      const reasonStr = reason instanceof Error ? `${reason.message}\nStack: ${reason.stack || 'N/A'}` : String(reason);
      const crashEntry = `[${timestamp}] [UNHANDLED_REJECTION] ${reasonStr}\n\n`;

      try {
        fs.appendFileSync(crashLogPath, crashEntry, 'utf-8');
      } catch {
      }

      writeLog(`[CrashReporter] 未处理的 Promise 拒绝: ${reasonStr}`);
    });

    if (process.type === 'browser') {
      try {
        crashReporter.start({
          submitURL: '',
          uploadToServer: false,
        });
      } catch {
        writeLog('[CrashReporter] crashReporter.start 已初始化或不可用');
      }
    }

    isInitialized = true;
    writeLog('[CrashReporter] 崩溃报告系统已初始化');
  } catch (initError) {
    writeLog(`[CrashReporter] 初始化失败: ${initError}`);
  }
}

export function getCrashLogContent(): string | null {
  try {
    const crashLogPath = path.join(getLogDirectory(), 'crash.log');
    if (fs.existsSync(crashLogPath)) {
      return fs.readFileSync(crashLogPath, 'utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

export function clearCrashLog(): boolean {
  try {
    const crashLogPath = path.join(getLogDirectory(), 'crash.log');
    if (fs.existsSync(crashLogPath)) {
      fs.unlinkSync(crashLogPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
