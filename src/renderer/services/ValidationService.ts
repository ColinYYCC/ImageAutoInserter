import { FileInfo } from '../../shared/types';
import { ErrorType, getErrorByType, getFriendlyError } from '../utils/errorHandler';

export interface FileValidationResult {
  valid: boolean;
  message?: string;
  errorType?: ErrorType;
}

export interface FileValidator {
  validate(file: FileInfo): Promise<FileValidationResult>;
}

function createApiUnavailableResult(): FileValidationResult {
  return {
    valid: false,
    message: getErrorByType(ErrorType.API_NOT_AVAILABLE).message,
    errorType: ErrorType.API_NOT_AVAILABLE,
  };
}

class BaseFileValidator implements FileValidator {
  constructor(private accept: string) {}

  async validate(file: FileInfo): Promise<FileValidationResult> {
    if (!window.electronAPI?.validateFile) {
      return createApiUnavailableResult();
    }

    const result = await window.electronAPI.validateFile(file.path, this.accept);

    if (!result.valid) {
      const errorInfo = getFriendlyError(result.error || '文件无效');
      return { valid: false, message: errorInfo.message, errorType: errorInfo.type };
    }

    return { valid: true };
  }
}

class ExcelValidator implements FileValidator {
  async validate(file: FileInfo): Promise<FileValidationResult> {
    if (!window.electronAPI?.validateExcelColumns) {
      return createApiUnavailableResult();
    }

    const columnResult = await window.electronAPI.validateExcelColumns(file.path);

    if (!columnResult.valid) {
      if (columnResult.error?.includes('商品编码')) {
        const errorInfo = getErrorByType(ErrorType.EXCEL_MISSING_COLUMN);
        return { valid: false, message: errorInfo.message, errorType: errorInfo.type };
      }
      return { valid: false, message: columnResult.error || '表格结构验证失败' };
    }

    return { valid: true };
  }
}

class ImageSourceValidator implements FileValidator {
  async validate(file: FileInfo): Promise<FileValidationResult> {
    if (typeof window.electronAPI?.validateImageSource !== 'function') {
      return { valid: true };
    }

    try {
      const imageResult = await window.electronAPI.validateImageSource(file.path);

      if (!imageResult.valid) {
        return { valid: false, message: imageResult.error || '图片来源验证失败' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, message: '图片来源验证失败：' + (error instanceof Error ? error.message : String(error)) };
    }
  }
}

export class ValidationService {
  private validators: Map<string, FileValidator[]> = new Map();

  registerValidators(fileType: string, validators: FileValidator[]): void {
    this.validators.set(fileType, validators);
  }

  async validateFile(file: FileInfo, accept: string): Promise<FileValidationResult> {
    const baseValidator = new BaseFileValidator(accept);
    const baseResult = await baseValidator.validate(file);
    if (!baseResult.valid) {
      return baseResult;
    }

    const specificValidators = this.validators.get(file.type) || [];
    for (const validator of specificValidators) {
      const result = await validator.validate(file);
      if (!result.valid) {
        return result;
      }
    }

    return { valid: true };
  }
}

export const validationService = new ValidationService();

validationService.registerValidators('excel', [new ExcelValidator()]);
validationService.registerValidators('folder', [new ImageSourceValidator()]);
validationService.registerValidators('zip', [new ImageSourceValidator()]);
validationService.registerValidators('rar', [new ImageSourceValidator()]);
validationService.registerValidators('7z', [new ImageSourceValidator()]);
