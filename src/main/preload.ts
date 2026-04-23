import { contextBridge, ipcRenderer } from 'electron';
import { FileInfo, AppError } from '../shared/types';

interface StartProcessResult {
  success: boolean;
  result?: {
    total: number;
    success: number;
    failed: number;
    successRate: number;
    outputPath: string;
  };
  error?: AppError;
}

interface CancelProcessResult {
  success: boolean;
  error?: string;
}

interface OpenFileResult {
  success: boolean;
  error?: string;
}

interface ProgressData {
  percent: number;
  current: string;
  total?: number;
  current_row?: number;
}

interface CompleteData {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  outputPath: string;
}

interface ErrorData {
  type: string;
  message: string;
  resolution?: string;
}

interface ValidationProgressData {
  percent: number;
  current: number;
  total: number;
  stage: string;
  message?: string;
}

interface UpdateAvailableData {
  version: string;
  releaseNotes?: string;
}

interface UpdateNotAvailableData {
  version: string;
}

interface UpdateProgressData {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

interface UpdateDownloadedData {
  version: string;
}

interface UpdateErrorData {
  error: string;
}

interface ErrorReportData {
  success: boolean;
  report?: Record<string, unknown>;
  error?: string;
}

interface ExportErrorReportData {
  success: boolean;
  path?: string;
  error?: string;
}

interface CloseErrorReportData {
  success: boolean;
  error?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: (accept: string, title: string, isFolder?: boolean) =>
    ipcRenderer.invoke('select-file', { accept, title, isFolder: isFolder || false }),

  validateFile: (filePath: string, accept: string) =>
    ipcRenderer.invoke('validate-file', filePath, accept),

  validateImageSource: (sourcePath: string) =>
    ipcRenderer.invoke('validate-image-source', sourcePath),

  validateExcelColumns: (filePath: string) =>
    ipcRenderer.invoke('validate-excel-columns', filePath),

  startProcess: (excelPath: string, imageSourcePath: string) =>
    ipcRenderer.invoke('start-process', { excelPath, imageSourcePath }),

  cancelProcess: () =>
    ipcRenderer.invoke('cancel-process'),

  openFile: (filePath: string) =>
    ipcRenderer.invoke('open-file', filePath),

  checkForUpdates: () =>
    ipcRenderer.invoke('check-for-updates'),

  downloadUpdate: () =>
    ipcRenderer.invoke('download-update'),

  quitAndInstall: () =>
    ipcRenderer.invoke('quit-and-install'),

  getAppVersion: () =>
    ipcRenderer.invoke('get-app-version'),

  onProgress: (callback: (data: ProgressData) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: ProgressData) => callback(data);
    ipcRenderer.on('progress', subscription);
    return () => ipcRenderer.removeListener('progress', subscription);
  },

  onComplete: (callback: (data: CompleteData) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: CompleteData) => callback(data);
    ipcRenderer.on('complete', subscription);
    return () => ipcRenderer.removeListener('complete', subscription);
  },

  onError: (callback: (data: ErrorData) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: ErrorData) => callback(data);
    ipcRenderer.on('error', subscription);
    return () => ipcRenderer.removeListener('error', subscription);
  },

  onValidationProgress: (callback: (data: ValidationProgressData) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: ValidationProgressData) => callback(data);
    ipcRenderer.on('validation-progress', subscription);
    return () => ipcRenderer.removeListener('validation-progress', subscription);
  },

  onUpdateChecking: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('update-checking', subscription);
    return () => ipcRenderer.removeListener('update-checking', subscription);
  },

  onUpdateAvailable: (callback: (data: UpdateAvailableData) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: UpdateAvailableData) => callback(data);
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },

  onUpdateNotAvailable: (callback: (data: UpdateNotAvailableData) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: UpdateNotAvailableData) => callback(data);
    ipcRenderer.on('update-not-available', subscription);
    return () => ipcRenderer.removeListener('update-not-available', subscription);
  },

  onUpdateProgress: (callback: (data: UpdateProgressData) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: UpdateProgressData) => callback(data);
    ipcRenderer.on('update-progress', subscription);
    return () => ipcRenderer.removeListener('update-progress', subscription);
  },

  onUpdateDownloaded: (callback: (data: UpdateDownloadedData) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: UpdateDownloadedData) => callback(data);
    ipcRenderer.on('update-downloaded', subscription);
    return () => ipcRenderer.removeListener('update-downloaded', subscription);
  },

  onUpdateError: (callback: (data: UpdateErrorData) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: UpdateErrorData) => callback(data);
    ipcRenderer.on('update-error', subscription);
    return () => ipcRenderer.removeListener('update-error', subscription);
  },

  onUpdateWillInstall: (callback: (data: { message: string; timeout: number }) => void) => {
    const subscription = (_: Electron.IpcRendererEvent, data: { message: string; timeout: number }) => callback(data);
    ipcRenderer.on('update-will-install', subscription);
    return () => ipcRenderer.removeListener('update-will-install', subscription);
  },

  getErrorReport: (reportId: string) =>
    ipcRenderer.invoke('get-error-report', reportId),

  exportErrorReport: (reportId: string) =>
    ipcRenderer.invoke('export-error-report', reportId),

  closeErrorReport: (reportId: string, exported: boolean) =>
    ipcRenderer.invoke('close-error-report', { reportId, exported }),

  getLogEntries: (filter?: { level?: string; module?: string; search?: string; limit?: number }) =>
    ipcRenderer.invoke('get-log-entries', filter),

  readLogFile: (options?: { lines?: number; level?: string; search?: string }) =>
    ipcRenderer.invoke('read-log-file', options),

  getLogStats: () =>
    ipcRenderer.invoke('get-log-stats'),

  clearLogFile: () =>
    ipcRenderer.invoke('clear-log-file'),

  exportLogs: () =>
    ipcRenderer.invoke('export-logs'),

  setLogLevel: (level: string) =>
    ipcRenderer.invoke('set-log-level', level),

  getLogLevel: () =>
    ipcRenderer.invoke('get-log-level'),
});

declare global {
  interface Window {
    electronAPI: {
      selectFile: (accept: string, title: string, isFolder?: boolean) => Promise<FileInfo | null>;
      validateFile: (filePath: string, accept: string) => Promise<{ valid: boolean; error?: string }>;
      validateImageSource: (sourcePath: string) => Promise<{ valid: boolean; error?: string; resolution?: string; supportedCount?: number; totalFiles?: number }>;
      validateExcelColumns: (filePath: string) => Promise<{ valid: boolean; error?: string; resolution?: string }>;
      startProcess: (excelPath: string, imageSourcePath: string) => Promise<StartProcessResult>;
      cancelProcess: () => Promise<CancelProcessResult>;
      openFile: (filePath: string) => Promise<OpenFileResult>;
      checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      quitAndInstall: () => Promise<{ success: boolean }>;
      getAppVersion: () => Promise<{ version: string }>;
      onProgress: (callback: (data: ProgressData) => void) => () => void;
      onComplete: (callback: (data: CompleteData) => void) => () => void;
      onError: (callback: (data: ErrorData) => void) => () => void;
      onValidationProgress: (callback: (data: ValidationProgressData) => void) => () => void;
      onUpdateChecking: (callback: () => void) => () => void;
      onUpdateAvailable: (callback: (data: UpdateAvailableData) => void) => () => void;
      onUpdateNotAvailable: (callback: (data: UpdateNotAvailableData) => void) => () => void;
      onUpdateProgress: (callback: (data: UpdateProgressData) => void) => () => void;
      onUpdateDownloaded: (callback: (data: UpdateDownloadedData) => void) => () => void;
      onUpdateError: (callback: (data: UpdateErrorData) => void) => () => void;
      onUpdateWillInstall: (callback: (data: { message: string; timeout: number }) => void) => () => void;
      getErrorReport: (reportId: string) => Promise<ErrorReportData>;
      exportErrorReport: (reportId: string) => Promise<ExportErrorReportData>;
      closeErrorReport: (reportId: string, exported: boolean) => Promise<CloseErrorReportData>;
      getLogEntries: (filter?: { level?: string; module?: string; search?: string; limit?: number }) => Promise<LogEntry[]>;
      readLogFile: (options?: { lines?: number; level?: string; search?: string }) => Promise<LogEntry[]>;
      getLogStats: () => Promise<{ totalEntries: number; levelCounts: Record<string, number>; logFileSize: number }>;
      clearLogFile: () => Promise<boolean>;
      exportLogs: () => Promise<string | null>;
      setLogLevel: (level: string) => Promise<{ success: boolean; level: string }>;
      getLogLevel: () => Promise<{ level: string }>;
    };
  }
}
