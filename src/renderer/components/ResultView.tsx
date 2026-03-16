import React from 'react';
import styles from './ResultView.module.css';
import { ProcessingResult, ProcessingError } from '../../shared/types';

interface ResultViewProps {
  result: ProcessingResult;
  onOpenFile?: () => void;
  onReset?: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({
  result,
  onOpenFile,
  onReset,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>✅ 处理完成！</h2>
      </div>

      <div className={styles.statistics}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>总计</div>
          <div className={styles.statValue}>{result.total}</div>
        </div>

        <div className={styles.statCardSuccess}>
          <div className={styles.statLabel}>成功</div>
          <div className={styles.statValue}>{result.success}</div>
        </div>

        <div className={styles.statCardError}>
          <div className={styles.statLabel}>失败</div>
          <div className={styles.statValue}>{result.failed}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>成功率</div>
          <div className={styles.statValue}><strong>{result.successRate.toFixed(1)}%</strong></div>
        </div>
      </div>

      {result.errors && result.errors.length > 0 && (
        <div className={styles.errors}>
          <h3 className={styles.errorsTitle}>错误详情</h3>
          <div className={styles.errorList}>
            {result.errors.map((error: ProcessingError, index: number) => (
              <div key={index} className={styles.errorItem}>
                <span className={styles.errorRow}>行 {error.row}</span>
                <span className={styles.errorProduct}>{error.productId}</span>
                <span className={styles.errorMessage}>{error.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        {onOpenFile && (
          <button className={styles.primaryButton} onClick={onOpenFile}>
            📂 打开输出文件
          </button>
        )}
        <button className={styles.secondaryButton} onClick={onReset}>
          🔄 重新处理
        </button>
      </div>
    </div>
  );
};

export default ResultView;
