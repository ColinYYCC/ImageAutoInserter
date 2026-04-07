import { test as base, expect as baseExpect } from '@playwright/test';

export interface MockFileResult {
  canceled: boolean;
  filePaths: string[];
}

export interface MockValidationResult {
  valid: boolean;
  supportedCount: number;
  totalFiles: number;
  error?: string;
}

export interface MockProcessResult {
  success: boolean;
  error?: {
    type: string;
    message: string;
    resolution: string;
  };
}

export interface MockProgressData {
  percent: number;
  current: string;
}

export interface MockCompleteData {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  outputPath: string;
  errors: string[];
}

const progressCallbacks: Array<(progress: MockProgressData) => void> = [];
const completeCallbacks: Array<(result: MockCompleteData) => void> = [];
const errorCallbacks: Array<(error: { type: string; message: string }) => void> = [];

let mockSelectFileDelay = 0;
let mockValidateFileDelay = 0;
let mockStartProcessDelay = 1000;

export const mockConfig = {
  setSelectFileDelay: (ms: number) => { mockSelectFileDelay = ms; },
  setValidateFileDelay: (ms: number) => { mockValidateFileDelay = ms; },
  setStartProcessDelay: (ms: number) => { mockStartProcessDelay = ms; },
  reset: () => {
    mockSelectFileDelay = 0;
    mockValidateFileDelay = 0;
    mockStartProcessDelay = 1000;
    progressCallbacks.length = 0;
    completeCallbacks.length = 0;
    errorCallbacks.length = 0;
  },
};

export const mockElectronAPI = () => {
  (window as any).electronAPI = {
    selectFile: async (_accept?: string[], _title?: string, _isFolder?: boolean): Promise<MockFileResult> => {
      if (mockSelectFileDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, mockSelectFileDelay));
      }
      return { canceled: true, filePaths: [] };
    },

    validateFile: async (_filePath: string, _accept?: string[]): Promise<MockValidationResult> => {
      if (mockValidateFileDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, mockValidateFileDelay));
      }
      return { valid: true, supportedCount: 10, totalFiles: 10 };
    },

    validateExcelColumns: async (_filePath: string): Promise<{ valid: boolean; columns: string[]; error?: string }> => {
      if (mockValidateFileDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, mockValidateFileDelay));
      }
      return { valid: true, columns: ['商品编码', '商品名称'] };
    },

    validateImageSource: async (_filePath: string): Promise<MockValidationResult> => {
      if (mockValidateFileDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, mockValidateFileDelay));
      }
      return { valid: true, supportedCount: 10, totalFiles: 10 };
    },

    startProcess: async (_excelPath: string, _imageSource: string): Promise<MockProcessResult> => {
      if (mockStartProcessDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, mockStartProcessDelay));
      }

      setTimeout(() => {
        completeCallbacks.forEach(cb => cb({
          total: 10,
          success: 10,
          failed: 0,
          successRate: 100,
          outputPath: '/mock/output.xlsx',
          errors: [],
        }));
      }, 100);

      return { success: true };
    },

    cancelProcess: async (): Promise<{ success: boolean }> => {
      return { success: true };
    },

    openFile: async (_filePath: string): Promise<{ success: boolean }> => {
      return { success: true };
    },

    onProgress: (callback: (progress: MockProgressData) => void): (() => void) => {
      progressCallbacks.push(callback);
      return () => {
        const index = progressCallbacks.indexOf(callback);
        if (index > -1) progressCallbacks.splice(index, 1);
      };
    },

    onComplete: (callback: (result: MockCompleteData) => void): (() => void) => {
      completeCallbacks.push(callback);
      return () => {
        const index = completeCallbacks.indexOf(callback);
        if (index > -1) completeCallbacks.splice(index, 1);
      };
    },

    onError: (callback: (error: { type: string; message: string }) => void): (() => void) => {
      errorCallbacks.push(callback);
      return () => {
        const index = errorCallbacks.indexOf(callback);
        if (index > -1) errorCallbacks.splice(index, 1);
      };
    },

    getAppVersion: async (): Promise<{ version: string }> => {
      return { version: '1.0.0-test' };
    },

    checkForUpdates: async (): Promise<void> => {
      console.log('[Mock] checkForUpdates');
    },

    downloadUpdate: async (): Promise<void> => {
      console.log('[Mock] downloadUpdate');
    },

    quitAndInstall: (): void => {
      console.log('[Mock] quitAndInstall');
    },

    onUpdateChecking: (_callback: () => void): (() => void) => () => {},
    onUpdateAvailable: (_callback: (info: any) => void): (() => void) => () => {},
    onUpdateNotAvailable: (_callback: (info: any) => void): (() => void) => () => {},
    onUpdateProgress: (_callback: (progress: any) => void): (() => void) => () => {},
    onUpdateDownloaded: (_callback: (info: any) => void): (() => void) => () => {},
    onUpdateError: (_callback: (error: any) => void): (() => void) => () => {},
    onUpdateWillInstall: (_callback: (info: any) => void): (() => void) => () => {},

    getLogs: async (): Promise<{ logs: any[] }> => ({ logs: [] }),
    getLogModules: async (): Promise<{ modules: string[] }> => ({ modules: ['App', 'PythonBridge'] }),
    exportErrorReport: async (): Promise<{ success: boolean; path: string }> => ({ success: true, path: '/mock/report.json' }),
    closeErrorReport: async (): Promise<{ success: boolean }> => ({ success: true }),
  };
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(mockElectronAPI);
    await use(page);
  },
});

export { expect } from '@playwright/test';

export function simulateProgress(percent: number, current: string): void {
  progressCallbacks.forEach(cb => cb({ percent, current }));
}

export function simulateComplete(result?: Partial<MockCompleteData>): void {
  completeCallbacks.forEach(cb => cb({
    total: 10,
    success: 10,
    failed: 0,
    successRate: 100,
    outputPath: '/mock/output.xlsx',
    errors: [],
    ...result,
  }));
}

export function simulateError(type: string, message: string): void {
  errorCallbacks.forEach(cb => cb({ type, message }));
}
