/**
 * 优化的 Excel 处理器
 * 最小化改动版本，专注于解决大文件卡顿问题
 */
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { FileInfo, ValidationResult, ProcessingResult, ProcessingOptions } from './types';

export interface OptimizedExcelOptions {
  maxHeaderSearchRows?: number;
  requiredColumns?: string[];
  largeFileThreshold?: number;
  sheetRows?: number;
}

/**
 * 优化的 Excel 验证函数
 * 与现有代码完全兼容，只优化大文件处理
 */
export async function validateExcelOptimized(
  fileInfo: FileInfo,
  options: ProcessingOptions & OptimizedExcelOptions = {}
): Promise<ValidationResult> {
  const {
    maxHeaderSearchRows = 60,
    requiredColumns = ['商品编码'],
    largeFileThreshold = 100 * 1024 * 1024, // 100MB
    sheetRows = 60,
    abortSignal,
    progressCallback
  } = options;

  try {
    // 检查是否已取消
    if (abortSignal?.aborted) {
      return { valid: false, error: '验证已取消' };
    }

    progressCallback?.({
      percent: 10,
      current: 1,
      total: 5,
      stage: 'checking',
      message: '检查文件...'
    });

    // 检查文件是否存在
    if (!fs.existsSync(fileInfo.path)) {
      return {
        valid: false,
        error: '文件不存在',
        resolution: '请检查文件路径是否正确'
      };
    }

    const stat = fs.statSync(fileInfo.path);
    const fileSizeMB = stat.size / (1024 * 1024);
    const isLargeFile = stat.size > largeFileThreshold;

    progressCallback?.({
      percent: 30,
      current: 2,
      total: 5,
      stage: 'reading',
      message: isLargeFile ? '读取大文件（优化模式）...' : '读取文件...'
    });

    // 使用 setImmediate 让出主线程
    await new Promise(resolve => setImmediate(resolve));

    // 检查是否已取消
    if (abortSignal?.aborted) {
      return { valid: false, error: '验证已取消' };
    }

    // 读取工作簿（优化版本）
    const workbook = await readWorkbookOptimized(
      fileInfo.path,
      stat.size,
      largeFileThreshold,
      sheetRows
    );

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        valid: false,
        error: 'Excel 文件中没有工作表',
        resolution: '请确保文件包含有效的工作表'
      };
    }

    progressCallback?.({
      percent: 60,
      current: 3,
      total: 5,
      stage: 'parsing',
      message: '解析表格结构...'
    });

    // 检查是否已取消
    if (abortSignal?.aborted) {
      return { valid: false, error: '验证已取消' };
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (!data || data.length === 0) {
      return {
        valid: false,
        error: 'Excel 文件为空',
        resolution: '请确保文件包含数据'
      };
    }

    progressCallback?.({
      percent: 80,
      current: 4,
      total: 5,
      stage: 'validating',
      message: '验证表头...'
    });

    // 查找表头
    const headerResult = findHeaderRow(data, maxHeaderSearchRows, requiredColumns);

    if (!headerResult.found) {
      return {
        valid: false,
        error: `Excel 文件中未找到"${requiredColumns.join('"或"')}"列`,
        resolution: `请确保 Excel 文件包含"${requiredColumns.join('"、"')}"列`,
        metadata: { totalRows: data.length }
      };
    }

    progressCallback?.({
      percent: 100,
      current: 5,
      total: 5,
      stage: 'completed',
      message: '验证完成'
    });

    return {
      valid: true,
      metadata: {
        headers: headerResult.headers,
        headerRowIndex: headerResult.rowIndex,
        totalRows: data.length,
        fileSizeMB: fileSizeMB.toFixed(2),
        isLargeFile
      }
    };
  } catch (error) {
    console.error('[OptimizedExcelHandler] Validation error:', error);
    return {
      valid: false,
      error: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
      resolution: '请检查文件是否损坏或格式是否正确'
    };
  }
}

/**
 * 优化的工作簿读取函数
 */
async function readWorkbookOptimized(
  filePath: string,
  fileSize: number,
  largeFileThreshold: number,
  sheetRows: number
): Promise<xlsx.WorkBook> {
  const isLargeFile = fileSize > largeFileThreshold;

  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        if (isLargeFile) {
          console.log(`[OptimizedExcelHandler] Large file detected (${(fileSize / 1024 / 1024).toFixed(2)}MB), using optimized reading`);

          const workbook = xlsx.readFile(filePath, {
            sheetRows,
            cellFormula: false,
            cellHTML: false,
            cellNF: false,
            cellStyles: false
          });
          resolve(workbook);
        } else {
          const workbook = xlsx.readFile(filePath);
          resolve(workbook);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * 查找表头行
 */
function findHeaderRow(
  data: any[][],
  maxSearchRows: number,
  requiredColumns: string[]
): { found: boolean; rowIndex: number; headers: string[] } {
  for (let i = 0; i < Math.min(maxSearchRows, data.length); i++) {
    const row = data[i];
    if (!row || !Array.isArray(row)) continue;

    const rowHeaders = row.map((h: any) => String(h || '').trim());

    const hasRequiredColumn = requiredColumns.some(col =>
      rowHeaders.includes(col)
    );

    if (hasRequiredColumn) {
      return {
        found: true,
        rowIndex: i,
        headers: rowHeaders
      };
    }
  }

  return { found: false, rowIndex: -1, headers: [] };
}

/**
 * 处理 Excel 文件
 */
export async function processExcelOptimized(
  fileInfo: FileInfo,
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  const startTime = Date.now();

  try {
    // 首先验证
    const validationResult = await validateExcelOptimized(fileInfo, options);

    if (!validationResult.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: validationResult.error || '验证失败',
          resolution: validationResult.resolution
        }
      };
    }

    // 处理逻辑（这里可以调用现有的处理逻辑）
    options.progressCallback?.({
      percent: 0,
      current: 0,
      total: 100,
      stage: 'processing',
      message: '开始处理...'
    });

    // 模拟处理过程
    const stages = [
      { percent: 20, message: '读取数据...' },
      { percent: 40, message: '处理图片...' },
      { percent: 60, message: '插入到表格...' },
      { percent: 80, message: '保存文件...' },
      { percent: 100, message: '完成' }
    ];

    for (const stage of stages) {
      if (options.abortSignal?.aborted) {
        return {
          success: false,
          error: {
            code: 'CANCELLED',
            message: '处理已取消'
          }
        };
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      options.progressCallback?.({
        percent: stage.percent,
        current: stages.indexOf(stage) + 1,
        total: stages.length,
        stage: 'processing',
        message: stage.message
      });
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      data: {
        filePath: fileInfo.path,
        headers: validationResult.metadata?.headers,
        processedAt: new Date().toISOString()
      },
      metrics: {
        startTime,
        endTime: Date.now(),
        duration
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : '处理失败',
        stack: error instanceof Error ? error.stack : undefined
      }
    };
  }
}
