import { ipcMain } from 'electron';
import { logManager, setLogLevel, getLogLevel } from '../logging';

export interface LogFilter {
  level?: string;
  module?: string;
  search?: string;
  limit?: number;
}

export interface LogQueryOptions {
  lines?: number;
  level?: string;
  search?: string;
}

export function registerLogHandlers(): void {
  ipcMain.handle('get-log-entries', async (_, filter?: LogFilter) => {
    return logManager.getRecentEntries(filter);
  });

  ipcMain.handle('read-log-file', async (_, options?: LogQueryOptions) => {
    return logManager.readLogFileLines(options);
  });

  ipcMain.handle('get-log-stats', async () => {
    return logManager.getLogStats();
  });

  ipcMain.handle('clear-log-file', async () => {
    return logManager.clearLogFile();
  });

  ipcMain.handle('export-logs', async () => {
    return logManager.exportLogs();
  });

  ipcMain.handle('set-log-level', async (_, level: string) => {
    setLogLevel(level as 'debug' | 'info' | 'warn' | 'error' | 'off');
    return { success: true, level: getLogLevel() };
  });

  ipcMain.handle('get-log-level', async () => {
    return { level: getLogLevel() };
  });
}
