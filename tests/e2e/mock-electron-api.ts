const progressCallbacks = [];
const completeCallbacks = [];
const errorCallbacks = [];

window.electronAPI = {
  selectFile: async (accept, title, isFolder) => {
    console.log('[Mock] selectFile', { accept, title, isFolder });
    return { canceled: true, filePaths: [] };
  },

  validateFile: async (filePath, accept) => {
    console.log('[Mock] validateFile', { filePath, accept });
    return { valid: true, supportedCount: 10, totalFiles: 10 };
  },

  validateExcelColumns: async (filePath) => {
    console.log('[Mock] validateExcelColumns', { filePath });
    return { valid: true, columns: ['商品编码', '商品名称'] };
  },

  validateImageSource: async (filePath) => {
    console.log('[Mock] validateImageSource', { filePath });
    return { valid: true, supportedCount: 10, totalFiles: 10 };
  },

  startProcess: async (excelPath, imageSource) => {
    console.log('[Mock] startProcess', { excelPath, imageSource });
    setTimeout(() => {
      completeCallbacks.forEach(cb => cb({
        total: 10,
        success: 10,
        failed: 0,
        successRate: 100,
        outputPath: '/mock/output.xlsx'
      }));
    }, 1000);
    return { success: true };
  },

  cancelProcess: async () => {
    console.log('[Mock] cancelProcess');
    return { success: true };
  },

  openFile: async (filePath) => {
    console.log('[Mock] openFile', { filePath });
    return { success: true };
  },

  onProgress: (callback) => {
    progressCallbacks.push(callback);
    return () => {
      const index = progressCallbacks.indexOf(callback);
      if (index > -1) progressCallbacks.splice(index, 1);
    };
  },

  onComplete: (callback) => {
    completeCallbacks.push(callback);
    return () => {
      const index = completeCallbacks.indexOf(callback);
      if (index > -1) completeCallbacks.splice(index, 1);
    };
  },

  onError: (callback) => {
    errorCallbacks.push(callback);
    return () => {
      const index = errorCallbacks.indexOf(callback);
      if (index > -1) errorCallbacks.splice(index, 1);
    };
  },

  getAppVersion: async () => {
    return { version: '1.0.0-test' };
  },

  checkForUpdates: async () => {
    console.log('[Mock] checkForUpdates');
  },

  downloadUpdate: async () => {
    console.log('[Mock] downloadUpdate');
  },

  quitAndInstall: () => {
    console.log('[Mock] quitAndInstall');
  },

  onUpdateChecking: (callback) => () => {},
  onUpdateAvailable: (callback) => () => {},
  onUpdateNotAvailable: (callback) => () => {},
  onUpdateProgress: (callback) => () => {},
  onUpdateDownloaded: (callback) => () => {},
  onUpdateError: (callback) => () => {},
  onUpdateWillInstall: (callback) => () => {},

  getLogs: async () => ({ logs: [] }),
  getLogModules: async () => ({ modules: ['App', 'PythonBridge'] }),
  exportErrorReport: async () => ({ success: true, path: '/mock/report.json' }),
  closeErrorReport: async () => ({ success: true }),
};

console.log('[Mock] electronAPI initialized');