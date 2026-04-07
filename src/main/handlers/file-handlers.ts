import { ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { FileInfo } from '../../shared/types';
import { writeLog } from '../utils/logging';
import { getMainWindow } from '../servers/window-manager';
import { getDesktopPath, getDocumentsPath } from '../path-config';
import { platform } from '../../core/platform';
import { securityBookmarkManager } from '../utils/security-bookmark';

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
const IMAGE_SOURCE_TYPES = ['.zip', '.rar', '.7z', '.folder'];
const IMAGE_ARCHIVE_TYPES = ['.zip', '.rar', '.7z'];

async function validateRarWithWasm(sourcePath: string): Promise<{ valid: boolean; supportedCount?: number; totalFiles?: number; error?: string; resolution?: string }> {
  try {
    writeLog('[validateRarWithWasm] 开始验证 RAR 文件:', sourcePath);

    const unrar = require('node-unrar-js');
    const createExtractor = unrar.createExtractorFromData || unrar.default?.createExtractorFromData;

    if (!createExtractor) {
      writeLog('[validateRarWithWasm] createExtractorFromData 函数不可用');
      return {
        valid: false,
        supportedCount: 0,
        totalFiles: 0,
        error: 'RAR 验证模块不可用',
        resolution: '请重新安装应用程序',
      };
    }

    const fileBuffer = fs.readFileSync(sourcePath);
    const data = Uint8Array.from(fileBuffer).buffer;
    const extractor = await createExtractor({ data });

    const list = extractor.getFileList();
    const fileHeaders = [...list.fileHeaders];

    let totalFiles = 0;
    let supportedCount = 0;

    for (const file of fileHeaders) {
      if (file.flags?.directory) continue;

      totalFiles++;
      const ext = path.extname(file.name || '').toLowerCase();
      if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
        supportedCount++;
      }
    }

    if (supportedCount === 0) {
      return {
        valid: false,
        error: 'RAR 文件中没有找到支持的图片文件',
        resolution: '请确保 RAR 文件中包含 JPG、PNG、GIF、BMP 或 WebP 格式的图片',
        supportedCount,
        totalFiles,
      };
    }

    return {
      valid: true,
      supportedCount,
      totalFiles,
    };
  } catch (error) {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { message: String(error) };
    writeLog('[validateRarWithWasm] RAR 验证失败:', errorDetails);
    return {
      valid: false,
      supportedCount: 0,
      totalFiles: 0,
      error: `RAR 文件验证失败: ${error instanceof Error ? error.message : String(error)}`,
      resolution: '请确保 RAR 文件未损坏',
    };
  }
}

async function validate7zWith7zipMin(sourcePath: string): Promise<{ valid: boolean; supportedCount?: number; totalFiles?: number; error?: string; resolution?: string }> {
  try {
    writeLog('[validate7zWith7zipMin] 开始验证 7Z 文件:', sourcePath);

    const sevenZip = require('7zip-min');
    const list = typeof sevenZip.list === 'function' 
      ? sevenZip.list 
      : (sevenZip.default?.list ?? null);

    if (!list) {
      writeLog('[validate7zWith7zipMin] list 函数不可用');
      return {
        valid: false,
        supportedCount: 0,
        totalFiles: 0,
        error: '7Z 验证模块不可用',
        resolution: '请重新安装应用程序',
      };
    }

    const listResult = await list(sourcePath);
    writeLog('[validate7zWith7zipMin] list 结果类型:', typeof listResult);
    writeLog('[validate7zWith7zipMin] list 结果:', listResult);

    let totalFiles = 0;
    let supportedCount = 0;

    if (Array.isArray(listResult)) {
      for (const file of listResult) {
        const filePath = typeof file === 'string' ? file : (file.path || file.name || '');
        if (!filePath || typeof filePath !== 'string') continue;

        const fileLower = filePath.toLowerCase();
        const isDirectory = fileLower.endsWith('/') || fileLower.endsWith('\\') || file.isDirectory;
        if (isDirectory) continue;

        totalFiles++;
        const ext = path.extname(filePath).toLowerCase();
        if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
          supportedCount++;
        }
      }
    }

    if (supportedCount === 0) {
      return {
        valid: false,
        error: '7Z 文件中没有找到支持的图片文件',
        resolution: '请确保 7Z 文件中包含 JPG、PNG、GIF、BMP 或 WebP 格式的图片',
        supportedCount,
        totalFiles,
      };
    }

    return {
      valid: true,
      supportedCount,
      totalFiles,
    };
  } catch (error) {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { message: String(error) };
    writeLog('[validate7zWith7zipMin] 7Z 验证失败:', errorDetails);
    return {
      valid: false,
      supportedCount: 0,
      totalFiles: 0,
      error: `7Z 文件验证失败: ${error instanceof Error ? error.message : String(error)}`,
      resolution: '请确保 7Z 文件未损坏',
    };
  }
}

export function registerFileHandlers(): void {
  ipcMain.handle('select-file', async (_, { accept, title, isFolder }: { accept: string; title: string; isFolder: boolean }) => {
    try {
      const acceptTypes = accept.split(',').map((t: string) => t.trim().toLowerCase());
      const isImageSource = acceptTypes.some((t: string) => IMAGE_SOURCE_TYPES.includes(t));

      let properties: ('openFile' | 'openDirectory')[] = [];
      let filters: { name: string; extensions: string[] }[] = [];

      if (isFolder) {
        properties = ['openDirectory'];
      } else if (isImageSource) {
        properties = ['openFile', 'openDirectory'];
      } else {
        properties = ['openFile'];
        if (accept.includes('.xlsx')) {
          filters = [
            { name: 'Excel Files', extensions: ['xlsx'] },
            { name: 'All Files', extensions: ['*'] }
          ];
        } else {
          filters = [{ name: 'All Files', extensions: ['*'] }];
        }
      }

      let defaultPath: string | undefined;
      if (platform.isWindows() || platform.isMac()) {
        const desktopPath = getDesktopPath();
        const documentsPath = getDocumentsPath();
        if (fs.existsSync(desktopPath)) {
          defaultPath = desktopPath;
        } else if (fs.existsSync(documentsPath)) {
          defaultPath = documentsPath;
        }
      }

      const dialogOptions: Electron.OpenDialogOptions = {
        title: title || '选择文件',
        filters,
        properties,
        defaultPath,
        securityScopedBookmarks: platform.isMac(),
      };

      const mainWindow = getMainWindow();
      if (!mainWindow) {
        throw new Error('主窗口未初始化，请重启应用');
      }

      const result = await dialog.showOpenDialog(mainWindow as Electron.BrowserWindow, dialogOptions);

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const filePath = result.filePaths[0];
      
      if (platform.isMac() && result.bookmarks && result.bookmarks.length > 0) {
        const bookmark = result.bookmarks[0];
        if (typeof bookmark === 'string') {
          securityBookmarkManager.requestFolderAccess(path.dirname(filePath));
        }
      }
      const ext = path.extname(filePath).toLowerCase();
      let type: FileInfo['type'] = 'file';

      if (isImageSource) {
        const typeMap: Record<string, FileInfo['type']> = {
          '.zip': 'zip',
          '.rar': 'rar',
          '.7z': '7z',
        };
        type = typeMap[ext] || 'folder';
      } else if (isFolder) {
        type = 'folder';
      } else if (ext === '.xlsx') {
        type = 'excel';
      }

      return {
        path: filePath,
        name: path.basename(filePath),
        size: 0,
        type,
      } as FileInfo;
    } catch (error) {
      const errorDetails = error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : { message: String(error) };
      writeLog('[select-file] 文件选择错误:', errorDetails);
      throw error;
    }
  });

  ipcMain.handle('validate-file', async (_, filePath: string, accept: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: '文件不存在' };
      }

      const stat = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const acceptTypes = accept.split(',').map(t => t.trim().toLowerCase());
      const isImageSource = acceptTypes.some(t => IMAGE_SOURCE_TYPES.includes(t));

      if (stat.isDirectory()) {
        if (!isImageSource) {
          return { valid: false, error: '不支持的文件夹类型' };
        }
        return { valid: true };
      }

      if (isImageSource) {
        if (!IMAGE_ARCHIVE_TYPES.includes(ext)) {
          return { valid: false, error: '不支持的文件格式，请使用 ZIP、RAR 或 7Z 格式' };
        }
      } else if (accept.toLowerCase().includes('.xlsx') && ext !== '.xlsx') {
        return { valid: false, error: '请选择 .xlsx 格式的 Excel 文件' };
      }

      return { valid: true };
    } catch (error) {
      const errorDetails = error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : { message: String(error) };
      writeLog('[validate-file] 文件验证错误:', errorDetails);
      return { valid: false, error: '文件验证失败: ' + (error instanceof Error ? error.message : String(error)) };
    }
  });

  ipcMain.handle('validate-image-source', async (_, sourcePath: string) => {
    try {
      if (!fs.existsSync(sourcePath)) {
        return { valid: false, error: '图片来源不存在' };
      }

      const stat = fs.statSync(sourcePath);
      let supportedCount = 0;
      let totalFiles = 0;

      if (stat.isDirectory()) {
        const files = fs.readdirSync(sourcePath);
        totalFiles = files.length;

        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
            supportedCount++;
          }
        }

        if (supportedCount === 0) {
          return {
            valid: false,
            error: '文件夹中没有找到支持的图片文件',
            resolution: '请确保文件夹中包含 JPG、PNG、GIF、BMP 或 WebP 格式的图片'
          };
        }
      } else {
        const ext = path.extname(sourcePath).toLowerCase();

        if (ext === '.zip') {
          try {
            const zip = new AdmZip(sourcePath);
            const zipEntries = zip.getEntries();
            totalFiles = zipEntries.length;

            const MAX_SAMPLE_SIZE = 1000;
            const sampleEntries = totalFiles > MAX_SAMPLE_SIZE
              ? zipEntries.slice(0, MAX_SAMPLE_SIZE)
              : zipEntries;

            let sampledSupportedCount = 0;
            for (const entry of sampleEntries) {
              if (!entry.isDirectory) {
                const entryExt = path.extname(entry.entryName).toLowerCase();
                if (SUPPORTED_IMAGE_EXTENSIONS.includes(entryExt)) {
                  sampledSupportedCount++;
                }
              }
            }

            if (totalFiles > MAX_SAMPLE_SIZE) {
              const sampleRatio = sampledSupportedCount / sampleEntries.length;
              supportedCount = Math.round(sampleRatio * totalFiles);
            } else {
              supportedCount = sampledSupportedCount;
            }

            if (supportedCount === 0) {
              return {
                valid: false,
                error: 'ZIP 文件中没有找到支持的图片文件',
                resolution: '请确保 ZIP 文件中包含 JPG、PNG、GIF、BMP 或 WebP 格式的图片'
              };
            }
          } catch (zipError) {
            const errorDetails = zipError instanceof Error
              ? { message: zipError.message, stack: zipError.stack, name: zipError.name }
              : { message: String(zipError) };
            writeLog('[validate-image-source] ZIP 验证错误:', errorDetails);
            return {
              valid: false,
              error: 'ZIP 文件损坏或无法读取',
              resolution: '请检查 ZIP 文件是否完整'
            };
          }
        } else if (ext === '.rar') {
          const result = await validateRarWithWasm(sourcePath);
          return result;
        } else if (ext === '.7z') {
          return await validate7zWith7zipMin(sourcePath);
        } else {
          return {
            valid: false,
            error: '不支持的文件格式',
            resolution: '请使用文件夹、ZIP、RAR 或 7z 格式'
          };
        }
      }

      return {
        valid: true,
        supportedCount,
        totalFiles
      };
    } catch (error) {
      const errorDetails = error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : { message: String(error) };
      writeLog('[validate-image-source] 图片来源验证错误:', errorDetails);
      return {
        valid: false,
        error: '图片来源验证失败: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  });

  writeLog('[IPC] File handlers registered');
}
