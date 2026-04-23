import { ipcMain } from 'electron';
import { updateManager } from '../update-manager';
import { logInfo, logError } from '../utils/logging';

export function registerUpdateHandlers(): void {
  ipcMain.handle('check-for-updates', async () => {
    try {
      await updateManager.checkForUpdates();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError('[ERROR] 检查更新错误: ' + errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('download-update', async () => {
    try {
      await updateManager.downloadUpdate();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError('[ERROR] 下载更新错误: ' + errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('quit-and-install', () => {
    updateManager.quitAndInstall();
    return { success: true };
  });

  ipcMain.handle('get-app-version', () => {
    return {
      version: updateManager.getCurrentVersion()
    };
  });

  logInfo('[IPC] Update handlers registered');
}
