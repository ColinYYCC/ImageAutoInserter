/**
 * 路径验证工具模块
 *
 * 提供跨平台路径验证功能，确保小白用户正确使用程序
 */

import * as path from 'path';
import * as fs from 'fs';
import { platform } from '../../core/platform';

export interface PathValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
  path?: string;
}

export interface PathValidationOptions {
  maxLength?: number;
  requireExists?: boolean;
  allowHidden?: boolean;
  checkWritable?: boolean;
}

export interface TempPathValidationResult {
  valid: boolean;
  error?: string;
  resolvedPath?: string;
}

const DEFAULT_MAX_PATH_LENGTH = 200;
const WINDOWS_MAX_PATH_LENGTH = 260;
const INVALID_PATH_CHARS = /[<>"|?*\x00-\x1f]/;

export function validateFilePath(
  filePath: string,
  options: PathValidationOptions = {}
): PathValidationResult {
  const {
    maxLength = DEFAULT_MAX_PATH_LENGTH,
    requireExists = false,
    allowHidden = true,
    checkWritable = false
  } = options;

  if (!filePath || typeof filePath !== 'string') {
    return {
      valid: false,
      error: '路径不能为空',
      suggestion: '请选择一个有效的文件'
    };
  }

  const trimmedPath = filePath.trim();

  if (trimmedPath.length === 0) {
    return {
      valid: false,
      error: '路径不能为空',
      suggestion: '请选择一个有效的文件'
    };
  }

  if (INVALID_PATH_CHARS.test(trimmedPath)) {
    return {
      valid: false,
      error: '路径包含无效字符',
      suggestion: '请检查路径中不包含 < > | " ? * 等特殊字符'
    };
  }

  const effectiveMaxLength = platform.isWindows()
    ? Math.min(maxLength, WINDOWS_MAX_PATH_LENGTH)
    : maxLength;

  if (trimmedPath.length > effectiveMaxLength) {
    return {
      valid: false,
      error: `路径过长 (${trimmedPath.length} 字符)`,
      suggestion: `建议将文件移动到更短路径的文件夹中，或重命名为较短的名称`
    };
  }

  if (requireExists) {
    if (!fs.existsSync(trimmedPath)) {
      return {
        valid: false,
        error: '文件不存在',
        suggestion: '请确保文件存在后再试'
      };
    }

    try {
      fs.accessSync(trimmedPath, fs.constants.R_OK);
    } catch {
      return {
        valid: false,
        error: '文件不可读',
        suggestion: '请检查文件权限设置'
      };
    }

    if (checkWritable) {
      try {
        fs.accessSync(trimmedPath, fs.constants.W_OK);
      } catch {
        return {
          valid: false,
          error: '文件不可写',
          suggestion: '请将文件复制到可写位置后再试'
        };
      }
    }
  }

  if (!allowHidden) {
    const basename = path.basename(trimmedPath);
    if (basename.startsWith('.')) {
      return {
        valid: false,
        error: '不支持隐藏文件',
        suggestion: '请选择一个非隐藏的文件'
      };
    }
  }

  return {
    valid: true,
    path: trimmedPath
  };
}

export function validateDirectoryPath(
  dirPath: string,
  options: PathValidationOptions = {}
): PathValidationResult {
  const {
    maxLength = DEFAULT_MAX_PATH_LENGTH,
    requireExists = false,
    checkWritable = true
  } = options;

  if (!dirPath || typeof dirPath !== 'string') {
    return {
      valid: false,
      error: '目录路径不能为空',
      suggestion: '请选择一个有效的目录'
    };
  }

  const trimmedPath = dirPath.trim();

  if (trimmedPath.length === 0) {
    return {
      valid: false,
      error: '目录路径不能为空',
      suggestion: '请选择一个有效的目录'
    };
  }

  if (INVALID_PATH_CHARS.test(trimmedPath)) {
    return {
      valid: false,
      error: '目录路径包含无效字符',
      suggestion: '请检查路径中不包含 < > | " ? * 等特殊字符'
    };
  }

  const effectiveMaxLength = platform.isWindows()
    ? Math.min(maxLength, WINDOWS_MAX_PATH_LENGTH)
    : maxLength;

  if (trimmedPath.length > effectiveMaxLength) {
    return {
      valid: false,
      error: `路径过长 (${trimmedPath.length} 字符)`,
      suggestion: '建议将文件夹移动到更短路径的位置'
    };
  }

  if (requireExists) {
    if (!fs.existsSync(trimmedPath)) {
      return {
        valid: false,
        error: '目录不存在',
        suggestion: '请确保目录存在后再试'
      };
    }

    if (checkWritable) {
      try {
        fs.accessSync(trimmedPath, fs.constants.W_OK);
      } catch {
        return {
          valid: false,
          error: '目录不可写',
          suggestion: '请选择有写入权限的目录'
        };
      }
    }
  }

  return {
    valid: true,
    path: trimmedPath
  };
}

export function validateImagePath(
  imagePath: string,
  options: PathValidationOptions = {}
): PathValidationResult {
  const baseValidation = validateFilePath(imagePath, {
    ...options,
    requireExists: options.requireExists !== undefined ? options.requireExists : true
  });

  if (!baseValidation.valid) {
    return baseValidation;
  }

  const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
  const ext = path.extname(imagePath).toLowerCase();

  if (!validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `不支持的图片格式: ${ext}`,
      suggestion: `支持的格式: ${validExtensions.join(', ')}`
    };
  }

  return baseValidation;
}

export function validateExcelPath(
  excelPath: string,
  options: PathValidationOptions = {}
): PathValidationResult {
  const baseValidation = validateFilePath(excelPath, {
    ...options,
    requireExists: options.requireExists !== undefined ? options.requireExists : true
  });

  if (!baseValidation.valid) {
    return baseValidation;
  }

  const validExtensions = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(excelPath).toLowerCase();

  if (!validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `不支持的 Excel 格式: ${ext}`,
      suggestion: `支持的格式: ${validExtensions.join(', ')}`
    };
  }

  return baseValidation;
}

export function getDefaultSavePath(
  originalPath: string,
  suffix: string = '_processed'
): string {
  const dir = path.dirname(originalPath);
  const ext = path.extname(originalPath);
  const basename = path.basename(originalPath, ext);
  return path.join(dir, `${basename}${suffix}${ext}`);
}

export function suggestAlternativePath(longPath: string): string {
  const dir = path.dirname(longPath);
  const ext = path.extname(longPath);
  const basename = path.basename(longPath, ext);

  const maxBasenameLength = platform.isWindows() ? 50 : 100;
  const truncatedBasename = basename.substring(0, maxBasenameLength);

  return path.join(dir, `${truncatedBasename}${ext}`);
}

export function validateNoTraversal(filePath: string): PathValidationResult {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: '路径不能为空' };
  }

  const normalizedPath = path.normalize(filePath);
  const pathParts = normalizedPath.split(path.sep);

  if (pathParts.includes('..')) {
    return {
      valid: false,
      error: '路径包含非法遍历序列',
      suggestion: '不允许使用 .. 遍历父目录'
    };
  }

  return { valid: true, path: normalizedPath };
}

export function validateAbsolute(filePath: string): PathValidationResult {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: '路径不能为空' };
  }

  const normalizedPath = path.normalize(path.resolve(filePath));

  if (!path.isAbsolute(normalizedPath)) {
    return {
      valid: false,
      error: '只支持绝对路径',
      suggestion: '请使用完整的文件路径'
    };
  }

  return { valid: true, path: normalizedPath };
}

export function validateTempPathSafety(
  tempPath: string,
  tempBaseDir?: string
): TempPathValidationResult {
  if (!tempPath || typeof tempPath !== 'string') {
    return { valid: false, error: '路径无效' };
  }

  const resolvedPath = path.resolve(tempPath);
  const normalizedPath = path.normalize(resolvedPath);

  if (!path.isAbsolute(normalizedPath)) {
    return { valid: false, error: '非绝对路径' };
  }

  const pathParts = normalizedPath.split(path.sep);
  if (pathParts.includes('..')) {
    return { valid: false, error: '包含遍历序列' };
  }

  if (tempBaseDir) {
    const normalizedBase = path.normalize(tempBaseDir).toLowerCase();
    const normalizedLower = normalizedPath.toLowerCase();
    if (!normalizedLower.startsWith(normalizedBase)) {
      return { valid: false, error: '路径不在临时目录范围内' };
    }
  }

  return { valid: true, resolvedPath: normalizedPath };
}

export function validateProcessPath(
  filePath: string,
  type: 'excel' | 'image'
): { valid: boolean; error?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: '路径不能为空' };
  }

  if (filePath.includes('..')) {
    return { valid: false, error: '路径包含非法序列' };
  }

  const resolvedPath = path.resolve(filePath);
  const normalizedPath = path.normalize(resolvedPath);

  if (!path.isAbsolute(normalizedPath)) {
    return { valid: false, error: '只支持绝对路径' };
  }

  let realPath: string;
  try {
    realPath = fs.realpathSync(normalizedPath);
  } catch {
    realPath = normalizedPath;
  }

  const realPathLower = realPath.toLowerCase();
  const systemPathPrefixes = [
    'c:\\windows', 'c:\\program files', 'c:\\program files (x86)',
    '/applications', '/library', '/system', '/private/etc', '/private/tmp',
    '/private/var', '/system/library', '/system/application support'
  ];
  for (const prefix of systemPathPrefixes) {
    if (realPathLower.startsWith(prefix)) {
      return { valid: false, error: '不允许访问系统目录' };
    }
  }

  const pathParts = normalizedPath.split(path.sep);
  if (pathParts.includes('..')) {
    return { valid: false, error: '路径包含非法序列' };
  }

  const ext = path.extname(normalizedPath).toLowerCase();
  if (type === 'excel' && ext !== '.xlsx') {
    return { valid: false, error: 'Excel 文件必须是 .xlsx 格式' };
  }
  if (type === 'image' && !['.zip', '.rar', '.7z', ''].includes(ext)) {
    const stat = fs.statSync(normalizedPath);
    if (!stat.isDirectory()) {
      return { valid: false, error: '图片来源必须是文件夹或压缩文件' };
    }
  }

  if (!fs.existsSync(normalizedPath)) {
    return { valid: false, error: '文件不存在' };
  }

  return { valid: true };
}
