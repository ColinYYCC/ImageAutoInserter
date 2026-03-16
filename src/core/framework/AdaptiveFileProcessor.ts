/**
 * 自适应文件处理器
 * 根据文件大小自动选择最优处理策略
 */
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { FileInfo, ValidationResult, ProcessingResult, ProcessingOptions, ProgressInfo } from './types';

export interface AdaptiveConfig {
  // 小文件阈值 (< 10MB)：直接读取
  smallFileThreshold: number;
  // 中等文件阈值 (10-100MB)：限制行数读取
  mediumFileThreshold: number;
  // 大文件阈值 (100-500MB)：流式读取
  largeFileThreshold: number;
  // 超大文件 (> 500MB)：分块处理
  hugeFileThreshold: number;
}

export interface ProcessingStrategy {
  name: string;
  description: string;
  sheetRows?: number;
  chunkSize?: number;
  disableFeatures: {
    cellFormula: boolean;
    cellHTML: boolean;
    cellNF: boolean;
    cellStyles: boolean;
  };
}

/**
 * 默认配置
 */
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  smallFileThreshold: 10 * 1024 * 1024,      // 10MB
  mediumFileThreshold: 100 * 1024 * 1024,    // 100MB
  largeFileThreshold: 500 * 1024 * 1024,     // 500MB
  hugeFileThreshold: 1024 * 1024 * 1024,     // 1GB
};

/**
 * 处理策略映射
 */
const PROCESSING_STRATEGIES: Record<string, ProcessingStrategy> = {
  small: {
    name: 'small',
    description: '小文件：完整读取',
    disableFeatures: {
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
    },
  },
  medium: {
    name: 'medium',
    description: '中等文件：限制行数读取',
    sheetRows: 100,
    disableFeatures: {
      cellFormula: true,
      cellHTML: true,
      cellNF: false,
      cellStyles: true,
    },
  },
  large: {
    name: 'large',
    description: '大文件：流式读取',
    sheetRows: 60,
    disableFeatures: {
      cellFormula: true,
      cellHTML: true,
      cellNF: true,
      cellStyles: true,
    },
  },
  huge: {
    name: 'huge',
    description: '超大文件：分块处理',
    sheetRows: 30,
    chunkSize: 1024 * 1024, // 1MB 分块
    disableFeatures: {
      cellFormula: true,
      cellHTML: true,
      cellNF: true,
      cellStyles: true,
    },
  },
};

/**
 * 根据文件大小获取处理策略
 */
export function getProcessingStrategy(
  fileSize: number,
  config: AdaptiveConfig = DEFAULT_ADAPTIVE_CONFIG
): ProcessingStrategy {
  if (fileSize < config.smallFileThreshold) {
    return PROCESSING_STRATEGIES.small;
  } else if (fileSize < config.mediumFileThreshold) {
    return PROCESSING_STRATEGIES.medium;
  } else if (fileSize < config.largeFileThreshold) {
    return PROCESSING_STRATEGIES.large;
  } else {
    return PROCESSING_STRATEGIES.huge;
  }
}

/**
 * 自适应 Excel 验证
 * 根据文件大小自动选择最优策略
 */
export async function validateExcelAdaptive(
  fileInfo: FileInfo,
  options: ProcessingOptions & { config?: AdaptiveConfig } = {}
): Promise<ValidationResult> {
  const {
    config = DEFAULT_ADAPTIVE_CONFIG,
    abortSignal,
    progressCallback
  } = options;

  const startTime = Date.now();

  try {
    // 检查是否已取消
    if (abortSignal?.aborted) {
      return { valid: false, error: '验证已取消' };
    }

    // 获取文件大小
    const stat = fs.statSync(fileInfo.path);
    const fileSize = stat.size;
    const fileSizeMB = fileSize / (1024 * 1024);

    // 选择处理策略
    const strategy = getProcessingStrategy(fileSize, config);

    console.log(`[AdaptiveProcessor] 文件大小: ${fileSizeMB.toFixed(2)}MB, 使用策略: ${strategy.name} (${strategy.description})`);

    progressCallback?.({
      percent: 10,
      current: 1,
      total: 5,
      stage: 'analyzing',
      message: `分析文件 (${fileSizeMB.toFixed(2)}MB)...`,
    });

    // 检查是否已取消
    if (abortSignal?.aborted) {
      return { valid: false, error: '验证已取消' };
    }

    progressCallback?.({
      percent: 30,
      current: 2,
      total: 5,
      stage: 'reading',
      message: strategy.name === 'huge' 
        ? '读取超大文件（分块模式）...' 
        : `读取文件 (${strategy.description})...`,
    });

    // 根据策略读取文件
    const workbook = await readWorkbookWithStrategy(
      fileInfo.path,
      strategy,
      abortSignal
    );

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        valid: false,
        error: 'Excel 文件中没有工作表',
        resolution: '请确保文件包含有效的工作表',
      };
    }

    // 检查是否已取消
    if (abortSignal?.aborted) {
      return { valid: false, error: '验证已取消' };
    }

    progressCallback?.({
      percent: 60,
      current: 3,
      total: 5,
      stage: 'parsing',
      message: '解析表格结构...',
    });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (!data || data.length === 0) {
      return {
        valid: false,
        error: 'Excel 文件为空',
        resolution: '请确保文件包含数据',
      };
    }

    // 检查是否已取消
    if (abortSignal?.aborted) {
      return { valid: false, error: '验证已取消' };
    }

    progressCallback?.({
      percent: 80,
      current: 4,
      total: 5,
      stage: 'validating',
      message: '验证表头...',
    });

    // 查找表头
    const maxHeaderSearchRows = 60;
    const requiredColumns = ['商品编码'];
    const headerResult = findHeaderRow(data, maxHeaderSearchRows, requiredColumns);

    if (!headerResult.found) {
      return {
        valid: false,
        error: `Excel 文件中未找到"${requiredColumns.join('"或"')}"列`,
        resolution: `请确保 Excel 文件包含"${requiredColumns.join('"、"')}"列`,
        metadata: { totalRows: data.length },
      };
    }

    progressCallback?.({
      percent: 100,
      current: 5,
      total: 5,
      stage: 'completed',
      message: '验证完成',
    });

    const duration = Date.now() - startTime;

    return {
      valid: true,
      metadata: {
        headers: headerResult.headers,
        headerRowIndex: headerResult.rowIndex,
        totalRows: data.length,
        fileSizeMB: fileSizeMB.toFixed(2),
        duration: `${duration}ms`,
        strategy: strategy.name,
        strategyDescription: strategy.description,
      },
    };
  } catch (error) {
    console.error('[AdaptiveProcessor] Validation error:', error);
    return {
      valid: false,
      error: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
      resolution: '请检查文件是否损坏或格式是否正确',
    };
  }
}

/**
 * 根据策略读取工作簿
 */
async function readWorkbookWithStrategy(
  filePath: string,
  strategy: ProcessingStrategy,
  abortSignal?: AbortSignal
): Promise<xlsx.WorkBook> {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        if (abortSignal?.aborted) {
          reject(new Error('读取已取消'));
          return;
        }

        const readOptions: xlsx.ParsingOptions = {
          cellFormula: !strategy.disableFeatures.cellFormula,
          cellHTML: !strategy.disableFeatures.cellHTML,
          cellNF: !strategy.disableFeatures.cellNF,
          cellStyles: !strategy.disableFeatures.cellStyles,
        };

        // 根据策略添加行数限制
        if (strategy.sheetRows) {
          (readOptions as any).sheetRows = strategy.sheetRows;
        }

        console.log(`[AdaptiveProcessor] 读取选项:`, {
          strategy: strategy.name,
          sheetRows: strategy.sheetRows,
          ...readOptions,
        });

        const workbook = xlsx.readFile(filePath, readOptions);
        resolve(workbook);
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

    const hasRequiredColumn = requiredColumns.some((col) =>
      rowHeaders.includes(col)
    );

    if (hasRequiredColumn) {
      return {
        found: true,
        rowIndex: i,
        headers: rowHeaders,
      };
    }
  }

  return { found: false, rowIndex: -1, headers: [] };
}

/**
 * 获取文件大小分类
 */
export function getFileSizeCategory(
  fileSize: number,
  config: AdaptiveConfig = DEFAULT_ADAPTIVE_CONFIG
): string {
  if (fileSize < config.smallFileThreshold) {
    return 'small';
  } else if (fileSize < config.mediumFileThreshold) {
    return 'medium';
  } else if (fileSize < config.largeFileThreshold) {
    return 'large';
  } else if (fileSize < config.hugeFileThreshold) {
    return 'huge';
  } else {
    return 'extreme';
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 检查文件是否可处理
 */
export function canProcessFile(
  fileSize: number,
  maxSize?: number
): { canProcess: boolean; reason?: string } {
  // 默认最大 2GB
  const maxFileSize = maxSize || 2 * 1024 * 1024 * 1024;

  if (fileSize > maxFileSize) {
    return {
      canProcess: false,
      reason: `文件大小超过限制 (${formatFileSize(fileSize)} > ${formatFileSize(maxFileSize)})`,
    };
  }

  return { canProcess: true };
}
