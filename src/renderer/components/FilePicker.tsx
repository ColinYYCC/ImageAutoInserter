import React, { memo, useState, useCallback } from 'react';
import styles from './FilePicker.module.css';
import { FileInfo } from '../../shared/types';
import { createLogger } from '../../shared/logger';
import { getFriendlyError, getErrorByType, ErrorType } from '../utils/errorHandler';
import { CheckCircleIcon, XCircleIcon } from './Icons';

const logger = createLogger('FilePicker');

interface FilePickerProps {
  step: number;
  label: string;
  iconType?: 'excel' | 'image' | 'folder';
  accept: string;
  value: FileInfo | null;
  onChange: (file: FileInfo | null) => void;
  isFolder?: boolean;
  disabled?: boolean;
  hint?: string;
  onValidationChange?: (isValid: boolean) => void;
  onReset?: () => void;
}

interface ValidationStatus {
  isValidating: boolean;
  isValid: boolean | null;
  message: string;
}

const IMAGE_SOURCE_TYPES = ['folder', 'zip', 'rar', '7z'];

const FilePicker: React.FC<FilePickerProps> = memo(({
  step: _step,
  label: _label,
  accept,
  value,
  onChange,
  isFolder = false,
  disabled = false,
  hint,
  onValidationChange,
  onReset,
}) => {
  const [validation, setValidation] = useState<ValidationStatus>({
    isValidating: false,
    isValid: null,
    message: '',
  });



  const setValidationError = useCallback((errorInfo: { message: string }) => {
    setValidation({
      isValidating: false,
      isValid: false,
      message: errorInfo.message,
    });
    onValidationChange?.(false);
  }, [onValidationChange]);

  const setValidationSuccess = useCallback(() => {
    setValidation({
      isValidating: false,
      isValid: true,
      message: '',
    });
    onValidationChange?.(true);
  }, [onValidationChange]);

  const handleReset = useCallback(() => {
    onChange(null);
    setValidation({
      isValidating: false,
      isValid: null,
      message: '',
    });
    onValidationChange?.(false);
    onReset?.();
  }, [onChange, onValidationChange, onReset]);

  const validateFile = async (file: FileInfo) => {
    setValidation({ isValidating: true, isValid: null, message: '正在验证...' });
    
    try {
      if (!window.electronAPI?.validateFile) {
        const errorInfo = getErrorByType(ErrorType.API_NOT_AVAILABLE);
        setValidationError(errorInfo);
        return false;
      }
      
      const result = await window.electronAPI.validateFile(file.path, accept);
      
      if (!result.valid) {
        const errorInfo = getFriendlyError(result.error || '文件无效');
        setValidationError(errorInfo);
        return false;
      }
      
      if (_label.includes('Excel') && file.path.endsWith('.xlsx')) {
        if (typeof window.electronAPI.validateExcelColumns !== 'function') {
          const errorInfo = getErrorByType(ErrorType.API_NOT_AVAILABLE);
          setValidationError(errorInfo);
          return false;
        }
        
        const columnResult = await window.electronAPI.validateExcelColumns(file.path);
        
        if (!columnResult.valid) {
          if (columnResult.error?.includes('商品编码')) {
            const errorInfo = getErrorByType(ErrorType.EXCEL_MISSING_COLUMN);
            setValidationError(errorInfo);
          } else {
            setValidationError({
              message: columnResult.error || '表格结构验证失败',
            });
          }
          return false;
        }
      }
      
      if (IMAGE_SOURCE_TYPES.includes(file.type)) {
        if (typeof window.electronAPI.validateImageSource !== 'function') {
          setValidationSuccess();
          return true;
        }

        try {
          const imageResult = await window.electronAPI.validateImageSource(file.path);

          if (!imageResult.valid) {
            setValidationError({
              message: imageResult.error || '图片来源验证失败',
            });
            return false;
          }
        } catch (error) {
          setValidationError({
            message: '图片来源验证失败：' + (error instanceof Error ? error.message : String(error)),
          });
          return false;
        }
      }

      setValidationSuccess();
      return true;
    } catch (error) {
      const errorInfo = getFriendlyError(error);
      setValidationError(errorInfo);
      return false;
    }
  };

  const handleBrowseClick = async () => {
    if (disabled || validation.isValidating) return;

    try {
      // 检查 electronAPI 是否可用
      if (!window.electronAPI?.selectFile) {
        const errorInfo = getErrorByType(ErrorType.API_NOT_AVAILABLE);
        setValidationError(errorInfo);
        logger.error('electronAPI.selectFile 不可用');
        return;
      }

      const file = await window.electronAPI.selectFile(accept, `选择${_label}`, isFolder);
      if (file) {
        onChange(file);
        await validateFile(file);
      }
    } catch (error) {
      logger.error('文件选择失败', { error: String(error) });
      const errorInfo = getFriendlyError(error);
      setValidationError(errorInfo);
    }
  };

  return (
    <>
      <div className={styles.filePicker}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            className={`${styles.fileInput} ${validation.isValid === true ? styles.inputValid : ''} ${validation.isValid === false ? styles.inputInvalid : ''}`}
            value={value?.name || ''}
            placeholder={`请选择${_label}`}
            readOnly
            disabled={disabled}
          />
          {validation.isValid === true && (
            <span className={styles.statusIcon}>
              <CheckCircleIcon size={18} className={styles.boldIcon} />
            </span>
          )}
          {validation.isValid === false && value && (
            <button
              className={styles.statusIconError}
              onClick={handleReset}
              disabled={disabled || validation.isValidating}
              type="button"
              title="清空"
            >
              <XCircleIcon size={18} className={styles.boldIcon} />
            </button>
          )}
        </div>
        <button 
          className={styles.browseButton}
          onClick={handleBrowseClick}
          disabled={disabled || validation.isValidating}
        >
          {validation.isValidating ? '验证中...' : '浏览'}
        </button>
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
      
      {validation.message && validation.isValid === false && (
        <p className={styles.validationMessage}>{validation.message}</p>
      )}

    </>
  );
});

FilePicker.displayName = 'FilePicker';

export default FilePicker;
