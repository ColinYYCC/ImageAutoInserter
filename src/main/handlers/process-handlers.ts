import { ipcMain, shell, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { FILE_EXTENSIONS, getExtension, PROGRESS_CONFIG } from '../../shared/constants';
import { logWarn, writeLog } from '../utils/logging';
import { getMainWindow } from '../servers/window-manager';
import { validateProcessPath } from '../utils/path-validator';
import { extractArchiveIfNeeded, safeCleanupTempDir, ExtractProgress } from '../utils/archive-extractor';
import { ProcessManager, createProcessErrorResult, parseErrorResolution } from '../utils/process-manager';
import { safeParseJSON } from '../utils/result-parser';

export { validateProcessPath } from '../utils/path-validator';
export { safeParseJSON };
export { parseErrorResolution };

interface StartProcessParams {
  excelPath: string;
  imageSourcePath: string;
}

let processManager: ProcessManager | null = null;
let isProcessing = false;

function sendProgressIfValid(percent: number, current: string): void {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('progress', { percent, current });
  }
}

export function registerProcessHandlers(): void {
  ipcMain.handle('start-process', async (_, { excelPath, imageSourcePath }: StartProcessParams) => {
    writeLog('[IPC] start-process 被调用');
    writeLog('   excelPath:', excelPath);
    writeLog('   imageSourcePath:', imageSourcePath);

    const excelValidation = validateProcessPath(excelPath, 'excel');
    if (!excelValidation.valid) {
      logWarn(`[SEC] Excel 路径验证失败: ${excelValidation.error}`);
      return createProcessErrorResult(
        'VALIDATION_ERROR',
        `Excel 文件验证失败: ${excelValidation.error}`,
        '请选择有效的 Excel 文件'
      );
    }

    const imageValidation = validateProcessPath(imageSourcePath, 'image');
    if (!imageValidation.valid) {
      logWarn(`[SEC] 图片来源路径验证失败: ${imageValidation.error}`);
      return createProcessErrorResult(
        'VALIDATION_ERROR',
        `图片来源验证失败: ${imageValidation.error}`,
        '请选择有效的图片来源'
      );
    }

    if (isProcessing) {
      writeLog('[IPC] 拒绝重复调用，已有处理任务在进行中');
      return createProcessErrorResult(
        'PROCESS_ERROR',
        '已有处理任务在进行中，请等待完成后重试',
        '请勿重复点击开始按钮'
      );
    }

    isProcessing = true;
    let tempExtractedPath: string | null = null;

    const cleanupTemp = () => {
      safeCleanupTempDir(tempExtractedPath);
    };

    const sendExtractProgress = (progress: ExtractProgress) => {
      const adjustedPercent = Math.round(progress.percent * PROGRESS_CONFIG.EXTRACT_MULTIPLIER);
      sendProgressIfValid(adjustedPercent, progress.current);
    };

    return new Promise((resolve) => {
      let isResolved = false;
      const safeResolve = (result: unknown) => {
        if (!isResolved) {
          isResolved = true;
          isProcessing = false;
          cleanupTemp();
          resolve(result);
        }
      };

      (async () => {
        try {
          const extractResult = await extractArchiveIfNeeded(imageSourcePath, sendExtractProgress);

          if (!extractResult.success) {
            safeResolve(createProcessErrorResult(
              'EXTRACT_ERROR',
              extractResult.error || '文件提取失败',
              '请确保压缩文件未损坏'
            ));
            return;
          }

          const effectiveImagePath = extractResult.extractedPath || imageSourcePath;
          if (extractResult.needsCleanup) {
            tempExtractedPath = effectiveImagePath;
          }

          processManager = new ProcessManager();

          await processManager.start({
            excelPath,
            imagePath: effectiveImagePath,
            onProgress: (percent, current) => {
              const adjustedPercent = Math.round(10 + percent * 0.9);
              sendProgressIfValid(adjustedPercent, current);
            },
            onComplete: (result) => {
              const transformedResult = {
                total: result.stats?.total || 0,
                success: result.stats?.success || 0,
                failed: result.stats?.failed || 0,
                successRate: result.stats?.successRate || 0,
                outputPath: result.outputPath || '',
              };
              writeLog('[IPC] 处理完成:', transformedResult);

              const window = getMainWindow();
              if (window) {
                window.webContents.send('complete', transformedResult);
              }
              safeResolve({ success: true, result: transformedResult });
            },
            onError: (error) => {
              writeLog('[IPC] 处理错误:', error);

              const window = getMainWindow();
              if (window) {
                window.webContents.send('error', error);
              }
              safeResolve({ success: false, error });
            },
          });
        } catch (err) {
          writeLog('[IPC] start-process 异常:', err);
          safeResolve(createProcessErrorResult(
            'SYSTEM_ERROR',
            err instanceof Error ? err.message : String(err),
            '请重试'
          ));
        }
      })();
    });
  });

  ipcMain.handle('cancel-process', () => {
    if (processManager) {
      const stopped = processManager.stop();
      if (stopped) {
        processManager = null;
        isProcessing = false;
        sendProgressIfValid(0, '');
        return { success: true };
      }
    }
    return { success: false, error: '没有正在处理的进程' };
  });

  ipcMain.handle('open-file', async (_, filePath: string) => {
    writeLog(`[SEC] open-file 被调用，原始路径: ${filePath}`);
    try {
      const resolvedPath = path.resolve(filePath);
      const normalizedPath = path.normalize(resolvedPath);

      if (!path.isAbsolute(normalizedPath)) {
        logWarn(`[SEC] 拒绝非绝对路径: ${filePath}`);
        return { success: false, error: '只支持绝对路径' };
      }

      const pathParts = normalizedPath.split(path.sep);
      if (pathParts.includes('..')) {
        logWarn(`[SEC] 阻止路径遍历攻击: ${filePath}`);
        return { success: false, error: '不允许路径遍历攻击' };
      }

      const ext = getExtension(normalizedPath);
      if (!FILE_EXTENSIONS.ALL.includes(ext as typeof FILE_EXTENSIONS.ALL[number])) {
        logWarn(`[SEC] 拒绝打开不允许的文件类型: ${ext}`);
        return { success: false, error: `不允许打开此文件类型: ${ext}` };
      }

      let realPath: string;
      try {
        realPath = fs.realpathSync(normalizedPath);
      } catch {
        realPath = normalizedPath;
      }

      const allowedPrefixes = [
        app.getPath('documents'),
        app.getPath('desktop'),
        app.getPath('downloads'),
        app.getPath('temp'),
        app.getPath('userData'),
      ].map(p => path.normalize(p).toLowerCase());

      const realPathLower = realPath.toLowerCase();
      const isAllowed = allowedPrefixes.some(prefix =>
        realPathLower.startsWith(prefix)
      );

      if (!isAllowed) {
        logWarn(`[SEC] 拒绝访问不在允许范围内的路径: ${realPath}`);
        return { success: false, error: '路径不在允许范围内' };
      }

      const systemPathPrefixes = new Set([
        'c:\\windows', 'c:\\program files', 'c:\\program files (x86)',
        '/applications', '/library', '/system', '/private/etc', '/private/tmp',
        '/private/var', '/system/library', '/system/application support'
      ]);
      for (const prefix of systemPathPrefixes) {
        if (realPathLower.startsWith(prefix)) {
          logWarn(`[SEC] 拒绝访问系统目录: ${realPath}`);
          return { success: false, error: '不允许访问系统目录' };
        }
      }

      if (!fs.existsSync(realPath)) {
        logWarn(`[SEC] 文件不存在: ${realPath}`);
        return { success: false, error: '文件不存在' };
      }

      const result = await shell.openPath(realPath);
      if (result) {
        writeLog(`[SEC] 文件打开失败: ${result}`);
        return { success: false, error: `打开文件失败: ${result}` };
      }
      writeLog(`[SEC] 成功打开文件: ${realPath}`);
      return { success: true };
    } catch (error) {
      writeLog(`[SEC] 打开文件异常: ${error}`);
      return { success: false, error: `打开文件时出错: ${error}` };
    }
  });

  writeLog('[IPC] Process handlers registered');
}

export function cancelProcess(): void {
  if (processManager) {
    processManager.stop();
    processManager = null;
    isProcessing = false;
  }
}