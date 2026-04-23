import { ipcMain } from 'electron';
import path from 'path';
import { logInfo, logError } from '../utils/logging';
import { getMainWindow } from '../servers/window-manager';

interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: string;
  extension: string;
}

export function registerExcelValidationHandler(): void {
  ipcMain.handle('validate-excel-columns', async (_, filePath: string) => {
    try {
      const { validateExcelAdaptive, canProcessFile } = await import('../../core/framework/AdaptiveFileProcessor');

      const fsPromises = await import('fs/promises');
      let stat;
      try {
        stat = await fsPromises.stat(filePath);
      } catch {
        return { valid: false, error: 'Excel 文件不存在' };
      }

      const fileSizeMB = stat.size / (1024 * 1024);
      logInfo(`[validate-excel] 文件大小: ${fileSizeMB.toFixed(2)} MB`);

      const checkResult = canProcessFile(stat.size, 2 * 1024 * 1024 * 1024);
      if (!checkResult.canProcess) {
        return {
          valid: false,
          error: checkResult.reason,
          resolution: '请选择更小的文件（最大支持 2GB）'
        };
      }

      const fileInfo: FileInfo = {
        path: filePath,
        name: path.basename(filePath),
        size: stat.size,
        type: 'excel',
        extension: path.extname(filePath).toLowerCase().replace('.', '')
      };

      const result = await validateExcelAdaptive(fileInfo, {
        progressCallback: (progress) => {
          const mainWindow = getMainWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('validation-progress', progress);
          }
          logInfo(`[validate-excel] ${progress.percent}% - ${progress.message}`);
        }
      });

      if (result.valid && result.metadata?.headers) {
        return {
          valid: true,
          headers: result.metadata.headers,
          metadata: {
            strategy: result.metadata.strategy,
            strategyDescription: result.metadata.strategyDescription,
            fileSizeMB: result.metadata.fileSizeMB,
            totalRows: result.metadata.totalRows
          }
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError('[validate-excel] Excel 列验证错误: ' + errorMessage);
      return {
        valid: false,
        error: 'Excel 验证失败: ' + errorMessage,
        resolution: '请检查文件是否损坏或格式是否正确'
      };
    }
  });

  logInfo('[IPC] Excel validation handler registered');
}
