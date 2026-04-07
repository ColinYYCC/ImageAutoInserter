/**
 * AdaptiveFileProcessor 单元测试
 * 测试覆盖：Excel 文件验证、文件大小检查、进度回调等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import {
  validateExcelAdaptive,
  canProcessFile,
  FileInfo,
  ValidationResult,
  DEFAULT_ADAPTIVE_CONFIG,
} from '../../../src/core/framework/AdaptiveFileProcessor';

// Mock fs 模块
vi.mock('fs', () => ({
  statSync: vi.fn(),
  existsSync: vi.fn(),
}));

// Mock xlsx 模块
vi.mock('xlsx', () => ({
  readFile: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

describe('AdaptiveFileProcessor - 自适应文件处理器测试', () => {
  let mockFileInfo: FileInfo;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFileInfo = {
      path: '/test/path/test.xlsx',
      name: 'test.xlsx',
      size: 1024 * 1024, // 1MB
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: '.xlsx',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateExcelAdaptive - Excel 文件验证', () => {
    describe('文件不存在场景', () => {
      it('文件不存在时应返回错误', async () => {
        vi.mocked(fs.statSync).mockImplementation(() => {
          throw new Error('ENOENT: no such file or directory');
        });

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('验证失败');
      });
    });

    describe('文件大小分类', () => {
      it('小文件（<10MB）应识别为 small', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 5 * 1024 * 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([['商品编码', '商品名称']]);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(true);
        expect(result.metadata?.strategy).toBe('small');
      });

      it('中等文件（10-100MB）应识别为 medium', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 50 * 1024 * 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([['商品编码', '商品名称']]);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(true);
        expect(result.metadata?.strategy).toBe('medium');
      });

      it('大文件（100-500MB）应识别为 large', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 200 * 1024 * 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([['商品编码', '商品名称']]);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(true);
        expect(result.metadata?.strategy).toBe('large');
      });

      it('超大文件（500MB-1GB）应识别为 huge', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 800 * 1024 * 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([['商品编码', '商品名称']]);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(true);
        expect(result.metadata?.strategy).toBe('huge');
      });

      it('极大文件（>1GB）应识别为 extreme', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1500 * 1024 * 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([['商品编码', '商品名称']]);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(true);
        expect(result.metadata?.strategy).toBe('extreme');
      });
    });

    describe('Excel 文件结构验证', () => {
      it('Excel 文件中没有工作表时应返回错误', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: [],
          Sheets: {},
        } as any);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Excel 文件中没有工作表');
        expect(result.resolution).toBe('请确保文件包含有效的工作表');
      });

      it('Excel 文件为空时应返回错误', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([]);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Excel 文件为空');
        expect(result.resolution).toBe('请确保文件包含数据');
      });

      it('Excel 文件中没有"商品编码"列时应返回错误', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
          ['商品名称', '商品价格'],
          ['商品A', '100'],
        ]);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('未找到"商品编码"列');
        expect(result.resolution).toContain('请确保 Excel 文件包含"商品编码"列');
      });

      it('Excel 文件包含"商品编码"列时应返回成功', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
          ['商品编码', '商品名称', '商品价格'],
          ['CODE001', '商品A', '100'],
          ['CODE002', '商品B', '200'],
        ]);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(true);
        expect(result.metadata?.headers).toEqual(['商品编码', '商品名称', '商品价格']);
        expect(result.metadata?.headerRowIndex).toBe(0);
        expect(result.metadata?.totalRows).toBe(3);
      });

      it('表头不在第一行时应能找到', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
          ['', '', ''],
          ['这是标题行', '', ''],
          ['商品编码', '商品名称', '商品价格'],
          ['CODE001', '商品A', '100'],
        ]);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(true);
        expect(result.metadata?.headerRowIndex).toBe(2);
        expect(result.metadata?.headers).toEqual(['商品编码', '商品名称', '商品价格']);
      });

      it('表头超过60行未找到时应返回错误', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);

        const mockData = Array(70).fill(['商品名称', '商品价格']);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('未找到"商品编码"列');
      });
    });

    describe('取消操作', () => {
      it('开始前取消应返回错误', async () => {
        const abortController = new AbortController();
        abortController.abort();

        const result = await validateExcelAdaptive(mockFileInfo, {
          abortSignal: abortController.signal,
        });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('验证已取消');
      });

      it('读取文件时取消应返回错误', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([]);

        const abortController = new AbortController();

        const resultPromise = validateExcelAdaptive(mockFileInfo, {
          abortSignal: abortController.signal,
        });

        abortController.abort();

        const result = await resultPromise;

        expect(result.valid).toBe(false);
        expect(result.error).toBe('验证已取消');
      });
    });

    describe('进度回调', () => {
      it('应正确调用进度回调', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([['商品编码', '商品名称']]);

        const progressCallback = vi.fn();

        await validateExcelAdaptive(mockFileInfo, { progressCallback });

        expect(progressCallback).toHaveBeenCalled();
        expect(progressCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            percent: expect.any(Number),
            stage: expect.any(String),
          })
        );
      });

      it('进度应从 10% 开始', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([['商品编码', '商品名称']]);

        const progressCallback = vi.fn();

        await validateExcelAdaptive(mockFileInfo, { progressCallback });

        const firstCall = progressCallback.mock.calls[0][0];
        expect(firstCall.percent).toBe(10);
        expect(firstCall.stage).toBe('analyzing');
      });

      it('进度应在验证完成时达到 100%', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([['商品编码', '商品名称']]);

        const progressCallback = vi.fn();

        await validateExcelAdaptive(mockFileInfo, { progressCallback });

        const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
        expect(lastCall.percent).toBe(100);
        expect(lastCall.stage).toBe('completed');
      });
    });

    describe('错误处理', () => {
      it('读取 Excel 文件失败时应返回错误', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockImplementation(() => {
          throw new Error('Invalid Excel file');
        });

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('验证失败');
        expect(result.resolution).toBe('请检查文件是否损坏或格式是否正确');
      });

      it('解析 Excel 文件失败时应返回错误', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockImplementation(() => {
          throw new Error('Parse error');
        });

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('验证失败');
      });
    });

    describe('元数据返回', () => {
      it('应返回正确的文件大小信息', async () => {
        const fileSize = 5 * 1024 * 1024; // 5MB
        vi.mocked(fs.statSync).mockReturnValue({ size: fileSize } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([['商品编码', '商品名称']]);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(true);
        expect(result.metadata?.fileSizeMB).toBe('5.00');
      });

      it('应返回正确的总行数', async () => {
        vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
        vi.mocked(XLSX.readFile).mockReturnValue({
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        } as any);

        const mockData = [
          ['商品编码', '商品名称'],
          ['CODE001', '商品A'],
          ['CODE002', '商品B'],
          ['CODE003', '商品C'],
        ];
        vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

        const result = await validateExcelAdaptive(mockFileInfo);

        expect(result.valid).toBe(true);
        expect(result.metadata?.totalRows).toBe(4);
      });
    });
  });

  describe('canProcessFile - 文件大小检查', () => {
    describe('默认限制', () => {
      it('文件大小在默认限制内应返回 true', () => {
        const fileSize = 1024 * 1024; // 1MB
        const result = canProcessFile(fileSize);

        expect(result.canProcess).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('文件大小等于默认限制应返回 true', () => {
        const fileSize = 2 * 1024 * 1024 * 1024; // 2GB
        const result = canProcessFile(fileSize);

        expect(result.canProcess).toBe(true);
      });

      it('文件大小超过默认限制应返回 false', () => {
        const fileSize = 3 * 1024 * 1024 * 1024; // 3GB
        const result = canProcessFile(fileSize);

        expect(result.canProcess).toBe(false);
        expect(result.reason).toContain('文件大小超过限制');
      });
    });

    describe('自定义限制', () => {
      it('文件大小在自定义限制内应返回 true', () => {
        const fileSize = 500 * 1024 * 1024; // 500MB
        const maxSize = 1024 * 1024 * 1024; // 1GB
        const result = canProcessFile(fileSize, maxSize);

        expect(result.canProcess).toBe(true);
      });

      it('文件大小超过自定义限制应返回 false', () => {
        const fileSize = 2 * 1024 * 1024 * 1024; // 2GB
        const maxSize = 1024 * 1024 * 1024; // 1GB
        const result = canProcessFile(fileSize, maxSize);

        expect(result.canProcess).toBe(false);
        expect(result.reason).toContain('文件大小超过限制');
        expect(result.reason).toContain('2 GB');
        expect(result.reason).toContain('1 GB');
      });
    });

    describe('边界情况', () => {
      it('文件大小为 0 应返回 true', () => {
        const result = canProcessFile(0);

        expect(result.canProcess).toBe(true);
      });

      it('文件大小为负数应返回 true（不检查负数）', () => {
        const result = canProcessFile(-1);

        expect(result.canProcess).toBe(true);
      });
    });
  });

  describe('DEFAULT_ADAPTIVE_CONFIG - 默认配置', () => {
    it('应包含正确的默认阈值', () => {
      expect(DEFAULT_ADAPTIVE_CONFIG.smallFileThreshold).toBe(10 * 1024 * 1024); // 10MB
      expect(DEFAULT_ADAPTIVE_CONFIG.mediumFileThreshold).toBe(100 * 1024 * 1024); // 100MB
      expect(DEFAULT_ADAPTIVE_CONFIG.largeFileThreshold).toBe(500 * 1024 * 1024); // 500MB
      expect(DEFAULT_ADAPTIVE_CONFIG.hugeFileThreshold).toBe(1024 * 1024 * 1024); // 1GB
    });
  });
});
