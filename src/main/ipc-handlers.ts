import fs from 'fs';
import path from 'path';
import { getLogFilePath } from './path-config';
import { registerFileHandlers } from './handlers/file-handlers';
import { registerProcessHandlers } from './handlers/process-handlers';
import { registerUpdateHandlers } from './handlers/update-handlers';
import { registerExcelValidationHandler } from './handlers/excel-validation-handler';
import { registerLogHandlers } from './handlers/log-handlers';
import { logInfo } from './logging';
import { safeWriteFile } from './utils/async-file';

let logInitialized = false;
let handlersRegistered = false;

export function initLogOnStartup(): void {
  if (logInitialized) return;
  try {
    const LOG_FILE = getLogFilePath();
    const logDir = path.dirname(LOG_FILE);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    safeWriteFile(LOG_FILE, '').catch(() => {});

    logInitialized = true;
    logInfo('[ImageInserter] 日志文件已初始化');
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

  registerFileHandlers();
  registerProcessHandlers();
  registerUpdateHandlers();
  registerExcelValidationHandler();
  registerLogHandlers();

  handlersRegistered = true;
  logInfo('[IPC] 所有 IPC 处理器注册完成');
}
