import React from 'react';
import styles from './ErrorDialog.module.css';
import { AppError } from '../../shared/types';

interface ErrorDialogProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss: () => void;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <div className={styles.icon}>❌</div>
          <h2 className={styles.title}>处理失败</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.message}>
            <strong>错误类型:</strong> {error.type}
          </div>
          <div className={styles.description}>
            {error.message}
          </div>
          {error.resolution && (
            <div className={styles.resolution}>
              <strong>解决方案:</strong> {error.resolution}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {onRetry && (
            <button className={styles.retryButton} onClick={onRetry}>
              🔄 重试
            </button>
          )}
          <button 
            className={styles.dismissButton} 
            onClick={onDismiss}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorDialog;
