/**
 * 自适应文件处理器
 * 精简版：仅包含 validateExcelAdaptive 和 canProcessFile
 *
 * 使用 xlsx (SheetJS) 替代 ExcelJS，避免 anchors bug
 * @see https://github.com/exceljs/exceljs/issues/2591
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';

// ============ 类型定义 ============

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  lastModified?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  resolution?: string;
  metadata?: {
    headers?: string[];
    headerRowIndex?: number;
    totalRows?: number;
    fileSizeMB?: string;
    strategy?: string;
    strategyDescription?: string;
  };
}

export interface ProcessingOptions {
  abortSignal?: AbortSignal;
  progressCallback?: (progress: ProgressInfo) => void;
}

export interface ProgressInfo {
  percent: number;
  current: number;
  total: number;
  stage?: string;
  message?: string;
}

export interface AdaptiveConfig {
  smallFileThreshold: number;
  mediumFileThreshold: number;
  largeFileThreshold: number;
  hugeFileThreshold: number;
}

// Excel 单元格值的类型
type ExcelCellValue = string | number | boolean | Date | null | undefined;

// 行数据类型
type ExcelRow = ExcelCellValue[];

// 工作表数据类型
type ExcelSheetData = ExcelRow[];

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  smallFileThreshold: 10 * 1024 * 1024,
  mediumFileThreshold: 100 * 1024 * 1024,
  largeFileThreshold: 500 * 1024 * 1024,
  hugeFileThreshold: 1024 * 1024 * 1024,
};

function getFileSizeCategory(fileSize: number, config: AdaptiveConfig = DEFAULT_ADAPTIVE_CONFIG): string {
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function findHeaderRow(data: ExcelSheetData, maxSearchRows: number, requiredColumns: string[]): { found: boolean; rowIndex: number; headers: string[] } {
  for (let i = 0; i < Math.min(maxSearchRows, data.length); i++) {
    const row = data[i];
    if (!row || !Array.isArray(row)) continue;

    const rowHeaders = row.map((h: ExcelCellValue) => String(h || '').trim());
    const hasRequiredColumn = requiredColumns.some((col) => rowHeaders.includes(col));

    if (hasRequiredColumn) {
      return { found: true, rowIndex: i, headers: rowHeaders };
    }
  }
  return { found: false, rowIndex: -1, headers: [] };
}

async function readWorkbookWithStrategy(filePath: string): Promise<XLSX.WorkBook> {
  return XLSX.readFile(filePath, {
    cellFormula: true,
    cellNF: true,
    cellText: false
  });
}

export async function validateExcelAdaptive(
  fileInfo: FileInfo,
  options: ProcessingOptions & { config?: AdaptiveConfig } = {}
): Promise<ValidationResult> {
  const { config = DEFAULT_ADAPTIVE_CONFIG, abortSignal, progressCallback } = options;

  try {
    if (abortSignal?.aborted) {
      return { valid: false, error: '验证已取消' };
    }

    const stat = fs.statSync(fileInfo.path);
    const fileSize = stat.size;
    const fileSizeMB = fileSize / (1024 * 1024);
    const category = getFileSizeCategory(fileSize, config);

    progressCallback?.({
      percent: 10,
      current: 1,
      total: 5,
      stage: 'analyzing',
      message: `分析文件 (${fileSizeMB.toFixed(2)}MB)...`,
    });

    if (abortSignal?.aborted) {
      return { valid: false, error: '验证已取消' };
    }

    progressCallback?.({
      percent: 30,
      current: 2,
      total: 5,
      stage: 'reading',
      message: `读取文件...`,
    });

    const workbook = await readWorkbookWithStrategy(fileInfo.path);

    const sheetNames = workbook.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      return {
        valid: false,
        error: 'Excel 文件中没有工作表',
        resolution: '请确保文件包含有效的工作表',
      };
    }

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

    const firstSheetName = sheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as ExcelSheetData;

    if (!data || data.length === 0) {
      return {
        valid: false,
        error: 'Excel 文件为空',
        resolution: '请确保文件包含数据',
      };
    }

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

    return {
      valid: true,
      metadata: {
        headers: headerResult.headers,
        headerRowIndex: headerResult.rowIndex,
        totalRows: data.length,
        fileSizeMB: fileSizeMB.toFixed(2),
        strategy: category,
        strategyDescription: `${category} 文件处理`,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
      resolution: '请检查文件是否损坏或格式是否正确',
    };
  }
}

export function canProcessFile(
  fileSize: number,
  maxSize?: number
): { canProcess: boolean; reason?: string } {
  const maxFileSize = maxSize || 2 * 1024 * 1024 * 1024;

  if (fileSize > maxFileSize) {
    return {
      canProcess: false,
      reason: `文件大小超过限制 (${formatFileSize(fileSize)} > ${formatFileSize(maxFileSize)})`,
    };
  }

  return { canProcess: true };
}
