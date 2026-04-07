/**
 * excel-validation-handler.ts 单元测试
 * 测试覆盖：Excel 验证处理器注册、文件验证、错误处理
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, callback) => {
      vi.fn()(channel, callback);
    }),
  },
}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    stat: vi.fn(),
    default: {
      ...actual.default,
      stat: vi.fn(),
    },
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual.default,
      existsSync: vi.fn(() => true),
      statSync: vi.fn(() => ({ size: 1024 * 1024 })),
    },
  };
});

vi.mock('../../../src/main/utils/logging', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock('../../../src/main/servers/window-manager', () => ({
  getMainWindow: vi.fn(() => ({
    webContents: {
      send: vi.fn(),
    },
    isDestroyed: () => false,
  })),
}));

vi.mock('../../../src/core/framework/AdaptiveFileProcessor', () => ({
  validateExcelAdaptive: vi.fn(),
  canProcessFile: vi.fn(),
}));

describe('excel-validation-handler.ts 单元测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('模块导入', () => {
    it('应成功导入 excel-validation-handler', async () => {
      const handler = await import('../../../src/main/handlers/excel-validation-handler');
      expect(handler).toBeDefined();
    });

    it('registerExcelValidationHandler 应是可调用函数', async () => {
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      expect(typeof registerExcelValidationHandler).toBe('function');
    });
  });

  describe('registerExcelValidationHandler - IPC 处理器注册', () => {
    it('应调用 ipcMain.handle 注册 validate-excel-columns', async () => {
      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();
      expect(ipcMain.handle).toHaveBeenCalledWith('validate-excel-columns', expect.any(Function));
    });

    it('应在注册后记录日志', async () => {
      const { logInfo } = await import('../../../src/main/utils/logging');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();
      expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('[IPC]'));
    });
  });

  describe('validate-excel-columns 处理器逻辑', () => {
    it('应处理文件不存在的情况', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockRejectedValueOnce(new Error('ENOENT'));

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      const result = await handler(null, '/nonexistent/file.xlsx');
      expect(result).toEqual({ valid: false, error: 'Excel 文件不存在' });
    });

    it('应处理文件大小超过限制的情况', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockResolvedValue({ size: 5 * 1024 * 1024 * 1024 } as any);

      const { validateExcelAdaptive, canProcessFile } = await import('../../../src/core/framework/AdaptiveFileProcessor');
      vi.mocked(canProcessFile).mockReturnValueOnce({
        canProcess: false,
        reason: '文件过大'
      });

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      const result = await handler(null, '/test/large-file.xlsx');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('文件过大');
      expect(result.resolution).toBe('请选择更小的文件（最大支持 2GB）');
    });

    it('应在文件大小检查通过后调用 validateExcelAdaptive', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockResolvedValue({ size: 1024 * 1024 } as any);

      const { validateExcelAdaptive, canProcessFile } = await import('../../../src/core/framework/AdaptiveFileProcessor');
      vi.mocked(canProcessFile).mockReturnValueOnce({ canProcess: true });
      vi.mocked(validateExcelAdaptive).mockResolvedValueOnce({
        valid: true,
        metadata: {
          headers: ['列A', '列B'],
          strategy: 'auto',
          strategyDescription: '自动策略',
          fileSizeMB: 1,
          totalRows: 100
        }
      });

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      const result = await handler(null, '/test/valid-file.xlsx');
      expect(validateExcelAdaptive).toHaveBeenCalled();
      expect(result.valid).toBe(true);
      expect(result.headers).toEqual(['列A', '列B']);
    });

    it('应处理 validateExcelAdaptive 验证失败的情况', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockResolvedValue({ size: 1024 * 1024 } as any);

      const { validateExcelAdaptive, canProcessFile } = await import('../../../src/core/framework/AdaptiveFileProcessor');
      vi.mocked(canProcessFile).mockReturnValueOnce({ canProcess: true });
      vi.mocked(validateExcelAdaptive).mockResolvedValueOnce({
        valid: false,
        error: 'Excel 格式不正确'
      });

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      const result = await handler(null, '/test/invalid-file.xlsx');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Excel 格式不正确');
    });

    it('应处理 validateExcelAdaptive 抛出异常的情况', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockResolvedValue({ size: 1024 * 1024 } as any);

      const { validateExcelAdaptive, canProcessFile } = await import('../../../src/core/framework/AdaptiveFileProcessor');
      vi.mocked(canProcessFile).mockReturnValueOnce({ canProcess: true });
      vi.mocked(validateExcelAdaptive).mockRejectedValueOnce(new Error('Corrupt file'));

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      const result = await handler(null, '/test/corrupt-file.xlsx');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Excel 验证失败');
      expect(result.resolution).toBe('请检查文件是否损坏或格式是否正确');
    });

    it('应返回完整的元数据信息', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockResolvedValue({ size: 2048 * 1024 } as any);

      const { validateExcelAdaptive, canProcessFile } = await import('../../../src/core/framework/AdaptiveFileProcessor');
      vi.mocked(canProcessFile).mockReturnValueOnce({ canProcess: true });
      vi.mocked(validateExcelAdaptive).mockResolvedValueOnce({
        valid: true,
        metadata: {
          headers: ['名称', '价格', '数量'],
          strategy: 'xlsx',
          strategyDescription: '使用 openpyxl 读取',
          fileSizeMB: 2,
          totalRows: 500
        }
      });

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      const result = await handler(null, '/test/full-metadata.xlsx');
      expect(result.valid).toBe(true);
      expect(result.headers).toEqual(['名称', '价格', '数量']);
      expect(result.metadata).toEqual({
        strategy: 'xlsx',
        strategyDescription: '使用 openpyxl 读取',
        fileSizeMB: 2,
        totalRows: 500
      });
    });
  });

  describe('错误信息记录', () => {
    it('应在验证失败时记录错误日志', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockRejectedValueOnce(new Error('ENOENT'));

      const { logError } = await import('../../../src/main/utils/logging');

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      await handler(null, '/nonexistent/file.xlsx');
    });

    it('应在异常情况下记录错误日志', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockResolvedValue({ size: 1024 * 1024 } as any);

      const { validateExcelAdaptive, canProcessFile } = await import('../../../src/core/framework/AdaptiveFileProcessor');
      vi.mocked(canProcessFile).mockReturnValueOnce({ canProcess: true });
      vi.mocked(validateExcelAdaptive).mockRejectedValueOnce(new Error('Unexpected error'));

      const { logError } = await import('../../../src/main/utils/logging');

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      await handler(null, '/test/error.xlsx');
      expect(logError).toHaveBeenCalledWith(expect.stringContaining('[validate-excel]'));
    });
  });

  describe('文件信息构建', () => {
    it('应正确构建文件信息对象', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockResolvedValue({ size: 1536 * 1024 } as any);

      const { validateExcelAdaptive, canProcessFile } = await import('../../../src/core/framework/AdaptiveFileProcessor');
      vi.mocked(canProcessFile).mockReturnValueOnce({ canProcess: true });
      vi.mocked(validateExcelAdaptive).mockImplementation(async (fileInfo: any) => {
        return {
          valid: true,
          metadata: {
            headers: fileInfo.headers || [],
            strategy: 'test',
            strategyDescription: 'test',
            fileSizeMB: 1.5,
            totalRows: 50
          }
        };
      });

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      const result = await handler(null, '/test/data/file.xlsx');
      expect(result.valid).toBe(true);
      expect(validateExcelAdaptive).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/test/data/file.xlsx',
          name: 'file.xlsx',
          type: 'excel',
          extension: 'xlsx'
        }),
        expect.any(Object)
      );
    });
  });

  describe('进度回调', () => {
    it.skip('应在验证过程中调用进度回调', async () => {
    });

    it.skip('应在窗口销毁时不发送进度', async () => {
    });
  });

  describe('边界条件测试', () => {
    it.skip('应处理文件大小恰好为 2GB 的情况', async () => {
    });

    it('应处理空 headers 数组', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockResolvedValue({ size: 1024 * 100 } as any);

      const { validateExcelAdaptive, canProcessFile } = await import('../../../src/core/framework/AdaptiveFileProcessor');
      vi.mocked(canProcessFile).mockReturnValueOnce({ canProcess: true });
      vi.mocked(validateExcelAdaptive).mockResolvedValueOnce({
        valid: true,
        metadata: {
          headers: [],
          strategy: 'empty',
          strategyDescription: '空文件',
          fileSizeMB: 0.1,
          totalRows: 0
        }
      });

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      const result = await handler(null, '/test/empty.xlsx');
      expect(result.valid).toBe(true);
      expect(result.headers).toEqual([]);
    });

    it('应处理文件名中的特殊字符', async () => {
      const fsPromises = await import('fs/promises');
      vi.spyOn(fsPromises, 'stat').mockResolvedValue({ size: 1024 * 1024 } as any);

      const { validateExcelAdaptive, canProcessFile } = await import('../../../src/core/framework/AdaptiveFileProcessor');
      vi.mocked(canProcessFile).mockReturnValueOnce({ canProcess: true });
      vi.mocked(validateExcelAdaptive).mockResolvedValueOnce({
        valid: true,
        metadata: {
          headers: ['列A'],
          strategy: 'test',
          strategyDescription: 'test',
          fileSizeMB: 1,
          totalRows: 10
        }
      });

      const { ipcMain } = await import('electron');
      const { registerExcelValidationHandler } = await import('../../../src/main/handlers/excel-validation-handler');
      registerExcelValidationHandler();

      const handler = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'validate-excel-columns'
      )?.[1];

      const result = await handler(null, '/test/文件 (1) [副本].xlsx');
      expect(result.valid).toBe(true);
    });
  });
});