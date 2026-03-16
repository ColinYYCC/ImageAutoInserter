import { ipcMain, dialog, BrowserWindow } from 'electron';
import { FileInfo, ProcessingResult, AppError } from '../shared/types';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { updateManager } from './update-manager';

let pythonProcess: ChildProcess | null = null;

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

export function setupIPCHandlers(mainWindow: BrowserWindow) {
  console.log('🔧 Setting up IPC handlers...');
  
  // 清除所有已存在的处理程序（防止重复注册）
  ipcMain.removeHandler('select-file');
  ipcMain.removeHandler('validate-file');
  ipcMain.removeHandler('validate-image-source');
  ipcMain.removeHandler('validate-excel-columns');
  ipcMain.removeHandler('start-process');
  ipcMain.removeHandler('cancel-process');
  ipcMain.removeHandler('open-file');
  ipcMain.removeHandler('check-for-updates');
  ipcMain.removeHandler('download-update');
  ipcMain.removeHandler('quit-and-install');
  ipcMain.removeHandler('get-app-version');

  console.log('🧹 Cleared existing handlers');
  
  ipcMain.handle('select-file', async (_, { accept, title, isFolder }) => {
    try {
      // 根据 accept 参数判断是否允许选择压缩包
      const acceptTypes = accept.split(',').map((t: string) => t.trim().toLowerCase());
      const isImageSource = acceptTypes.some((t: string) => 
        ['.zip', '.rar', '.7z', '.folder'].includes(t)
      );
      
      // 图片来源：同时支持文件和文件夹
      // Excel文件：只支持文件
      const properties: any[] = isImageSource 
        ? ['openFile', 'openDirectory']  // 图片来源允许两者
        : isFolder ? ['openDirectory'] : ['openFile'];
      
      // 根据 accept 参数动态设置过滤器
      let filters: any[] = [];
      if (isImageSource) {
        // 图片来源选择器（压缩文件 + 文件夹）
        filters = [
          { name: 'Image Archives', extensions: ['zip', 'rar', '7z'] },
          { name: 'All Files', extensions: ['*'] }
        ];
      } else if (accept.includes('.xlsx')) {
        // Excel 文件选择器
        filters = [
          { name: 'Excel Files', extensions: ['xlsx'] },
          { name: 'All Files', extensions: ['*'] }
        ];
      } else if (isFolder) {
        // 文件夹选择器
        filters = [];
      } else {
        filters = [{ name: 'All Files', extensions: ['*'] }];
      }

      console.log('[select-file] accept:', accept, 'filters:', filters, 'properties:', properties);

      const result = await dialog.showOpenDialog(mainWindow, {
        title: title || '选择文件',
        filters,
        properties,
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        
        // 立即返回基本信息，不等待文件状态获取
        // 文件大小和类型将在验证阶段异步获取
        const ext = path.extname(filePath).toLowerCase();
        let type: FileInfo['type'] = 'file';
        
        if (isImageSource) {
          if (ext === '.zip') type = 'zip';
          else if (ext === '.rar') type = 'rar';
          else if (ext === '.7z') type = '7z';
          else type = 'file';
        } else if (isFolder) {
          type = 'folder';
        } else if (ext === '.xlsx') {
          type = 'excel';
        }
        
        console.log('[select-file] 文件选择成功:', path.basename(filePath), '类型:', type);
        
        // 立即返回，不获取文件大小（避免阻塞）
        return {
          path: filePath,
          name: path.basename(filePath),
          size: 0, // 大小将在验证阶段获取
          type,
        } as FileInfo;
      }
      return null;
    } catch (error) {
      console.error('文件选择错误:', error);
      return null;
    }
  });

  ipcMain.handle('validate-file', async (_, filePath: string, accept: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: '文件不存在' };
      }

      const stat = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();

      if (stat.isDirectory()) {
        const acceptTypes = accept.split(',').map(t => t.trim().toLowerCase());
        const hasArchiveType = acceptTypes.some(t => 
          ['.zip', '.rar', '.7z', '.folder'].includes(t)
        );
        if (!hasArchiveType) {
          return { valid: false, error: '不支持的文件夹类型' };
        }
        return { valid: true };
      }

      const acceptTypes = accept.split(',').map(t => t.trim().toLowerCase());
      if (acceptTypes.length > 0 && !acceptTypes.some(t => 
        t === '*' || t === '.*' || ext === t || (ext === '' && t === '.folder')
      )) {
        return { valid: false, error: '文件类型不符合要求' };
      }

      return { valid: true };
    } catch (error) {
      console.error('文件验证错误:', error);
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
            
            for (const entry of zipEntries) {
              if (!entry.isDirectory) {
                const entryExt = path.extname(entry.entryName).toLowerCase();
                if (SUPPORTED_IMAGE_EXTENSIONS.includes(entryExt)) {
                  supportedCount++;
                }
              }
            }

            if (supportedCount === 0) {
              return { 
                valid: false, 
                error: 'ZIP 文件中没有找到支持的图片文件',
                resolution: '请确保 ZIP 文件中包含 JPG、PNG、GIF、BMP 或 WebP 格式的图片'
              };
            }
          } catch (zipError) {
            return { 
              valid: false, 
              error: 'ZIP 文件损坏或无法读取',
              resolution: '请检查 ZIP 文件是否完整'
            };
          }
        } else if (ext === '.rar') {
          return {
            valid: true,
            supportedCount: 0,
            totalFiles: 0,
            warning: 'RAR 文件验证需要安装额外工具，将在处理时验证'
          };
        } else if (ext === '.7z') {
          return {
            valid: true,
            supportedCount: 0,
            totalFiles: 0,
            warning: '7z 文件验证需要安装额外工具，将在处理时验证'
          };
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
      console.error('图片来源验证错误:', error);
      return { 
        valid: false, 
        error: '图片来源验证失败: ' + (error instanceof Error ? error.message : String(error)) 
      };
    }
  });

  // 使用自适应处理器验证 Excel 文件
  ipcMain.handle('validate-excel-columns', async (_, filePath: string) => {
    try {
      // 导入自适应处理器
      const { validateExcelAdaptive, canProcessFile } = await import('../core/framework/AdaptiveFileProcessor');

      // 使用异步方式检查文件是否存在（避免阻塞）
      const fsPromises = await import('fs/promises');
      let stat;
      try {
        stat = await fsPromises.stat(filePath);
      } catch {
        return { valid: false, error: 'Excel 文件不存在' };
      }

      const fileSizeMB = stat.size / (1024 * 1024);
      console.log(`[Excel验证] 文件大小: ${fileSizeMB.toFixed(2)} MB`);

      // 检查文件是否可处理（最大支持 2GB）
      const checkResult = canProcessFile(stat.size, 2 * 1024 * 1024 * 1024);
      if (!checkResult.canProcess) {
        return {
          valid: false,
          error: checkResult.reason,
          resolution: '请选择更小的文件（最大支持 2GB）'
        };
      }

      // 创建文件信息对象
      const fileInfo = {
        path: filePath,
        name: path.basename(filePath),
        size: stat.size,
        type: 'excel' as import('../core/framework/types').FileType,
        extension: path.extname(filePath).toLowerCase().replace('.', '')
      };

      // 使用自适应处理器进行验证
      const result = await validateExcelAdaptive(fileInfo, {
        progressCallback: (progress) => {
          // 发送进度到渲染进程
          if (mainWindow) {
            mainWindow.webContents.send('validation-progress', progress);
          }
          console.log(`[Excel验证] ${progress.percent}% - ${progress.message}`);
        }
      });

      // 如果验证成功，返回表头信息
      if (result.valid && result.metadata?.headers) {
        return {
          valid: true,
          headers: result.metadata.headers,
          metadata: {
            strategy: result.metadata.strategy,
            strategyDescription: result.metadata.strategyDescription,
            fileSizeMB: result.metadata.fileSizeMB,
            duration: result.metadata.duration,
            totalRows: result.metadata.totalRows
          }
        };
      }

      return result;
    } catch (error) {
      console.error('Excel 列验证错误:', error);
      return {
        valid: false,
        error: 'Excel 验证失败: ' + (error instanceof Error ? error.message : String(error)),
        resolution: '请检查文件是否损坏或格式是否正确'
      };
    }
  });

  ipcMain.handle('start-process', async (_, { excelPath, imageSourcePath }) => {
    return new Promise((resolve) => {
      try {
        // 根据环境确定 Python 脚本路径
        const isDev = process.env.NODE_ENV === 'development';
        let pythonScriptPath: string;
        let cwd: string;
        
        if (isDev) {
          // 开发环境：使用项目根目录下的 dist/python
          pythonScriptPath = path.join(__dirname, '../python/gui_processor.py');
          cwd = path.join(__dirname, '../..');
        } else {
          // 生产环境：Python 文件在 app.asar.unpacked 或 Resources/python
          // __dirname 在打包后是 app.asar/dist/main/
          // Python 文件在 app.asar.unpacked/python/ 或 Resources/python/
          const resourcesPath = process.resourcesPath; // /Applications/ImageAutoInserter.app/Contents/Resources
          pythonScriptPath = path.join(resourcesPath, 'python', 'gui_processor.py');
          cwd = resourcesPath;
        }
        
        console.log('🐍 Starting Python process:');
        console.log('   Script:', pythonScriptPath);
        console.log('   CWD:', cwd);
        console.log('   Excel:', excelPath);
        console.log('   Images:', imageSourcePath);
        
        // 验证 Python 脚本是否存在
        if (!fs.existsSync(pythonScriptPath)) {
          console.error('❌ Python script not found:', pythonScriptPath);
          resolve({
            success: false,
            error: {
              type: 'CONFIG_ERROR',
              message: '找不到 Python 处理脚本',
              resolution: '请重新安装应用程序'
            } as AppError
          });
          return;
        }
        
        pythonProcess = spawn('python3', [
          pythonScriptPath,
          excelPath,
          imageSourcePath
        ], {
          cwd: cwd,
        });

        pythonProcess.stdout?.on('data', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'progress') {
              mainWindow.webContents.send('progress', message.payload);
            } else if (message.type === 'complete') {
              resolve({ success: true, result: message.payload as ProcessingResult });
            } else if (message.type === 'error') {
              resolve({ success: false, error: message.payload as AppError });
            }
          } catch (err) {
            console.error('解析 Python 输出失败:', err);
          }
        });

        pythonProcess.stderr?.on('data', (data) => {
          console.error('Python stderr:', data.toString());
        });

        pythonProcess.on('close', (code) => {
          if (code !== 0 && code !== null) {
            resolve({
              success: false,
              error: {
                type: 'PROCESS_ERROR',
                message: `Python 进程异常退出，代码：${code}`,
                resolution: '请检查 Python 脚本和输入文件'
              } as AppError
            });
          }
          pythonProcess = null;
        });

        pythonProcess.on('error', (err) => {
          resolve({
            success: false,
            error: {
              type: 'SYSTEM_ERROR',
              message: `无法启动 Python 进程：${err.message}`,
              resolution: '请确保 Python 3.8+ 已安装并在 PATH 中'
            } as AppError
          });
          pythonProcess = null;
        });

      } catch (err) {
        resolve({
          success: false,
          error: {
            type: 'SYSTEM_ERROR',
            message: `启动处理失败：${err}`,
            resolution: '请重试或重启应用'
          } as AppError
        });
      }
    });
  });

  ipcMain.handle('cancel-process', () => {
    if (pythonProcess) {
      pythonProcess.kill('SIGTERM');
      pythonProcess = null;
      return { success: true };
    }
    return { success: false, error: '没有正在处理的进程' };
  });

  ipcMain.handle('open-file', async (_, filePath) => {
    try {
      await require('electron').shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      console.error('打开文件错误:', error);
      return { success: false, error: 'Failed to open file' };
    }
  });

  // ============ 更新相关 IPC 处理程序 ============

  ipcMain.handle('check-for-updates', async () => {
    try {
      await updateManager.checkForUpdates();
      return { success: true };
    } catch (error) {
      console.error('检查更新错误:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('download-update', async () => {
    try {
      await updateManager.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('下载更新错误:', error);
      return { success: false, error: String(error) };
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
}
