// 文件信息
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: 'excel' | 'folder' | 'zip' | 'rar' | '7z' | 'file';
  rowCount?: number;
  imageCount?: number;
}

// 处理结果
export interface ProcessingResult {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  outputPath: string;
  errors?: ProcessingError[];
}

// 处理错误
export interface ProcessingError {
  row: number;
  productId: string;
  errorType: 'IMAGE_NOT_FOUND' | 'EXCEL_FORMULA_ERROR' | 'EMBED_ERROR';
  message: string;
}

// 应用错误
export interface AppError {
  type: 'FILE_NOT_FOUND' | 'INVALID_FORMAT' | 'PROCESS_ERROR' | 'SYSTEM_ERROR' | 'CONFIG_ERROR' | 'UPDATE_ERROR' | 'EXTRACT_ERROR';
  message: string;
  resolution?: string;
}
