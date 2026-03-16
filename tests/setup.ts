import '@testing-library/jest-dom';

// 模拟 Electron API
Object.defineProperty(window, 'electronAPI', {
  value: {
    selectFile: vi.fn(),
    validateFile: vi.fn(),
    startProcess: vi.fn(),
    cancelProcess: vi.fn(),
    openFile: vi.fn(),
    onProgress: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
  },
  writable: true,
});

// 清理 mocks
afterEach(() => {
  vi.clearAllMocks();
});
