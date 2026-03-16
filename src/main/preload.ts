import { contextBridge, ipcRenderer } from 'electron';
import { FileInfo } from '../shared/types';

// 暴露安全的 IPC 接口给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 选择文件（支持文件夹）
  selectFile: (accept: string, title: string, isFolder?: boolean) =>
    ipcRenderer.invoke('select-file', { accept, title, isFolder: isFolder || false }),

  // 验证文件
  validateFile: (filePath: string, accept: string) =>
    ipcRenderer.invoke('validate-file', filePath, accept),

  // 验证图片来源中是否包含支持的图片格式
  validateImageSource: (sourcePath: string) =>
    ipcRenderer.invoke('validate-image-source', sourcePath),

  // 验证 Excel 文件是否包含"商品编码"列
  validateExcelColumns: (filePath: string) =>
    ipcRenderer.invoke('validate-excel-columns', filePath),

  // 开始处理
  startProcess: (excelPath: string, imageSourcePath: string) =>
    ipcRenderer.invoke('start-process', { excelPath, imageSourcePath }),

  // 取消处理
  cancelProcess: () =>
    ipcRenderer.invoke('cancel-process'),

  // 打开文件
  openFile: (filePath: string) =>
    ipcRenderer.invoke('open-file', filePath),

  // ============ 更新相关 API ============

  // 检查更新
  checkForUpdates: () =>
    ipcRenderer.invoke('check-for-updates'),

  // 下载更新
  downloadUpdate: () =>
    ipcRenderer.invoke('download-update'),

  // 退出并安装更新
  quitAndInstall: () =>
    ipcRenderer.invoke('quit-and-install'),

  // 获取应用版本
  getAppVersion: () =>
    ipcRenderer.invoke('get-app-version'),

  // 监听进度更新
  onProgress: (callback: (data: { percent: number; current: string; total?: number; current_row?: number }) => void) => {
    const subscription = (_: any, data: { percent: number; current: string; total?: number; current_row?: number }) => callback(data);
    ipcRenderer.on('progress', subscription);
    return () => ipcRenderer.removeListener('progress', subscription);
  },

  // 监听完成
  onComplete: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('complete', subscription);
    return () => ipcRenderer.removeListener('complete', subscription);
  },

  // 监听错误
  onError: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('error', subscription);
    return () => ipcRenderer.removeListener('error', subscription);
  },

  // 监听验证进度（新增）
  onValidationProgress: (callback: (data: { percent: number; current: number; total: number; stage: string; message?: string }) => void) => {
    const subscription = (_: any, data: { percent: number; current: number; total: number; stage: string; message?: string }) => callback(data);
    ipcRenderer.on('validation-progress', subscription);
    return () => ipcRenderer.removeListener('validation-progress', subscription);
  },

  // 监听更新相关事件
  onUpdateChecking: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('update-checking', subscription);
    return () => ipcRenderer.removeListener('update-checking', subscription);
  },

  onUpdateAvailable: (callback: (data: { version: string; releaseNotes?: string }) => void) => {
    const subscription = (_: any, data: { version: string; releaseNotes?: string }) => callback(data);
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },

  onUpdateNotAvailable: (callback: (data: { version: string }) => void) => {
    const subscription = (_: any, data: { version: string }) => callback(data);
    ipcRenderer.on('update-not-available', subscription);
    return () => ipcRenderer.removeListener('update-not-available', subscription);
  },

  onUpdateProgress: (callback: (data: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => {
    const subscription = (_: any, data: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => callback(data);
    ipcRenderer.on('update-progress', subscription);
    return () => ipcRenderer.removeListener('update-progress', subscription);
  },

  onUpdateDownloaded: (callback: (data: { version: string }) => void) => {
    const subscription = (_: any, data: { version: string }) => callback(data);
    ipcRenderer.on('update-downloaded', subscription);
    return () => ipcRenderer.removeListener('update-downloaded', subscription);
  },

  onUpdateError: (callback: (data: { error: string }) => void) => {
    const subscription = (_: any, data: { error: string }) => callback(data);
    ipcRenderer.on('update-error', subscription);
    return () => ipcRenderer.removeListener('update-error', subscription);
  },
});

// 类型声明
declare global {
  interface Window {
    electronAPI: {
      selectFile: (accept: string, title: string, isFolder?: boolean) => Promise<FileInfo | null>;
      validateFile: (filePath: string, accept: string) => Promise<{ valid: boolean; error?: string }>;
      validateImageSource: (sourcePath: string) => Promise<{ valid: boolean; error?: string; resolution?: string; supportedCount?: number; totalFiles?: number }>;
      validateExcelColumns: (filePath: string) => Promise<{ valid: boolean; error?: string; resolution?: string }>;
      startProcess: (excelPath: string, imageSourcePath: string) => Promise<any>;
      cancelProcess: () => Promise<any>;
      openFile: (filePath: string) => Promise<any>;
      // 更新相关 API
      checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      quitAndInstall: () => Promise<{ success: boolean }>;
      getAppVersion: () => Promise<{ version: string }>;
      onProgress: (callback: (data: { percent: number; current: string; total?: number; current_row?: number }) => void) => () => void;
      onComplete: (callback: (data: any) => void) => () => void;
      onError: (callback: (data: any) => void) => () => void;
      onValidationProgress: (callback: (data: { percent: number; current: number; total: number; stage: string; message?: string }) => void) => () => void;
      onUpdateChecking: (callback: () => void) => () => void;
      onUpdateAvailable: (callback: (data: { version: string; releaseNotes?: string }) => void) => () => void;
      onUpdateNotAvailable: (callback: (data: { version: string }) => void) => () => void;
      onUpdateProgress: (callback: (data: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => () => void;
      onUpdateDownloaded: (callback: (data: { version: string }) => void) => () => void;
      onUpdateError: (callback: (data: { error: string }) => void) => () => void;
    };
  }
}
