import React, { memo, useState, useCallback } from 'react';
import styles from './FilePicker.module.css';
import { FileInfo } from '../../shared/types';
import { getFriendlyError, getErrorByType, ErrorType } from '../utils/errorHandler';
import { validationService } from '../services/ValidationService';
import { CheckCircleIcon, XCircleIcon } from './Icons';

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

  const setValidationError = useCallback((message: string) => {
    setValidation({
      isValidating: false,
      isValid: false,
      message,
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

  const validateFile = async (file: FileInfo) => {
    setValidation({ isValidating: true, isValid: null, message: '正在验证...' });

    try {
      const result = await validationService.validateFile(file, accept);

      if (result.valid) {
        setValidationSuccess();
      } else {
        setValidationError(result.message || '文件验证失败');
      }

      return result.valid;
    } catch (error) {
      const errorInfo = getFriendlyError(error);
      setValidationError(errorInfo.message);
      return false;
    }
  };

  const handleBrowseClick = async () => {
    if (disabled || validation.isValidating) return;

    try {
      if (!window.electronAPI?.selectFile) {
        const errorInfo = getErrorByType(ErrorType.API_NOT_AVAILABLE);
        setValidationError(errorInfo.message);
        console.error('[FilePicker] electronAPI.selectFile 不可用');
        return;
      }

      const file = await window.electronAPI.selectFile(accept, `选择${_label}`, isFolder);
      if (file) {
        onChange(file);
        await validateFile(file);
      }
    } catch (error) {
      console.error('[FilePicker] 文件选择失败:', error);
      const errorInfo = getFriendlyError(error);
      setValidationError(errorInfo.message);
    }
  };

  const handleResetAndReselect = useCallback(() => {
    onChange(null);
    setValidation({
      isValidating: false,
      isValid: null,
      message: '',
    });
    onValidationChange?.(false);
    onReset?.();
    handleBrowseClick();
  }, [onChange, onValidationChange, onReset]);

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
              onClick={handleResetAndReselect}
              disabled={disabled || validation.isValidating}
              type="button"
              title="清空并重新选择"
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
