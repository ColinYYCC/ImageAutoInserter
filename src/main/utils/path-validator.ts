/**
 * 路径验证工具模块
 *
 * 提供跨平台路径验证功能，确保小白用户正确使用程序
 */

import * as path from 'path';
import * as fs from 'fs';
import { isWindows } from '../platform';

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

  const effectiveMaxLength = isWindows()
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

  const effectiveMaxLength = isWindows()
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

  const maxBasenameLength = isWindows() ? 50 : 100;
  const truncatedBasename = basename.substring(0, maxBasenameLength);

  return path.join(dir, `${truncatedBasename}${ext}`);
}
