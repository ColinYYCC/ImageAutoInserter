/**
 * 文件扩展名常量模块
 *
 * 统一管理所有支持的文件扩展名
 */

/**
 * 支持的圖片擴展名
 * 注意：與 Python 端的 IMAGE_EXTENSIONS 保持一致
 */
export const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'
] as const;

export const ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z'] as const;

export const FILE_EXTENSIONS = {
  EXCEL: ['.xlsx', '.xls', '.csv'] as const,
  IMAGE: IMAGE_EXTENSIONS,
  ARCHIVE: ARCHIVE_EXTENSIONS,
  DOCUMENT: ['.txt', '.pdf'] as const,
  ALL: ['.xlsx', '.xls', '.csv', '.txt', '.pdf', ...IMAGE_EXTENSIONS, ...ARCHIVE_EXTENSIONS] as const,
} as const;

export type FileExtension = typeof FILE_EXTENSIONS.ALL[number];

export function isAllowedExtension(ext: string, allowedList: readonly string[] = FILE_EXTENSIONS.ALL): boolean {
  return allowedList.includes(ext.toLowerCase());
}

export function isExcelExtension(ext: string): boolean {
  return isAllowedExtension(ext, FILE_EXTENSIONS.EXCEL);
}

export function isImageExtension(ext: string): boolean {
  return isAllowedExtension(ext, FILE_EXTENSIONS.IMAGE);
}

export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

export const PROCESS_CONFIG = {
  TIMEOUT_MS: 10 * 60 * 1000,
  KILL_TIMEOUT_MS: 5000,
  BUFFER_MAX_SIZE: 10 * 1024 * 1024,
} as const;

export const PROGRESS_CONFIG = {
  EXTRACT_MULTIPLIER: 0.1,
  THROTTLE_MS: 100,
  MIN_JSON_LENGTH: 10,
  MAX_STDERR_LENGTH: 2000,
  ROWS_PER_PROGRESS: 5,
} as const;

export const EXCEL_CONFIG = {
  COLUMN_WIDTH_MULTIPLIER: 0.15,
  ROW_HEIGHT_MULTIPLIER: 0.75,
  DEFAULT_FONT_SIZE: 11,
} as const;