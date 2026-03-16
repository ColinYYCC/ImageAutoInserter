// 应用状态
export type AppState = 
  | { phase: 'IDLE'; excelFile?: FileInfo; imageSource?: FileInfo }
  | { phase: 'READY'; excelFile: FileInfo; imageSource: FileInfo }
  | { phase: 'PROCESSING'; excelFile: FileInfo; imageSource: FileInfo; progress: number; current: string; total?: number }
  | { phase: 'COMPLETE'; result: ProcessingResult; excelFile?: FileInfo; imageSource?: FileInfo }
  | { phase: 'ERROR'; error: AppError; excelFile?: FileInfo; imageSource?: FileInfo };

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
  type: 'FILE_NOT_FOUND' | 'INVALID_FORMAT' | 'PROCESS_ERROR' | 'SYSTEM_ERROR' | 'CONFIG_ERROR' | 'UPDATE_ERROR';
  message: string;
  resolution: string;
}

// Action 类型
export type AppAction =
  | { type: 'SELECT_EXCEL'; payload: FileInfo }
  | { type: 'SELECT_IMAGES'; payload: FileInfo }
  | { type: 'CLEAR_EXCEL' }
  | { type: 'CLEAR_IMAGES' }
  | { type: 'START' }
  | { type: 'PROGRESS'; payload: { percent: number; current: string; total?: number } }
  | { type: 'COMPLETE'; payload: ProcessingResult }
  | { type: 'ERROR'; payload: AppError }
  | { type: 'RESET' };

// IPC 消息类型
export interface IPCMessage<T = any> {
  type: string;
  payload: T;
}
