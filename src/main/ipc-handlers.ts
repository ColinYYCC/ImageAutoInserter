import fs from 'fs';
import { ipcMain } from 'electron';
import { getLogDirectory } from './path-config';
import { registerFileHandlers } from './handlers/file-handlers';
import { registerProcessHandlers } from './handlers/process-handlers';
import { registerUpdateHandlers } from './handlers/update-handlers';
import { registerExcelValidationHandler } from './handlers/excel-validation-handler';
import { registerLogHandlers } from './handlers/log-handlers';
import { createLogSystem, getLogSystem } from './logging';
import { logInfo } from './utils/logging';
import { LogLevel } from './logging/log-types';

let logInitialized = false;
let handlersRegistered = false;

export async function initLogOnStartup(): Promise<void> {
  if (logInitialized) return;
  try {
    const logDir = getLogDirectory();
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logSystem = createLogSystem({
      logDir,
      minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      maxFileSizeMB: 10,
      maxFiles: 10,
      maxAgeDays: 7,
    });

    await logSystem.initialize();
    logInfo('[ImageInserter] 集中式日志系统初始化完成');

    logInitialized = true;
  } catch (e) {
    console.error('[ImageInserter] 日志初始化失败:', e);
  }
}

export function setupIPCHandlers(): void {
  if (handlersRegistered) {
    logInfo('[IPC] IPC handlers already registered, skipping');
    return;
  }

  logInfo('[IPC] 注册 IPC 处理器...');

  ipcMain.on('renderer-log', (_event, logEntry) => {
    try {
      const logSystem = getLogSystem();
      if (logSystem) {
        const { level, module, message, data } = logEntry;
        if (level === 'ERROR') {
          logSystem.error(module, message, data);
        } else if (level === 'WARN') {
          logSystem.warn(module, message, data);
        } else if (level === 'INFO') {
          logSystem.info(module, message, data);
        } else {
          logSystem.debug(module, message, data);
        }
      }
    } catch {
      // 日志系统可能未初始化，静默忽略
    }
  });

  registerFileHandlers();
  registerProcessHandlers();
  registerUpdateHandlers();
  registerExcelValidationHandler();
  registerLogHandlers();

  handlersRegistered = true;
  logInfo('[IPC] 所有 IPC 处理器注册完成');
}
