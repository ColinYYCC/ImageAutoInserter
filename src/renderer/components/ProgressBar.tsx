import React, { memo } from 'react';
import styles from './ProgressBar.module.css';
import { SpinnerIcon } from './Icons';

interface ProgressBarProps {
  progress: number;
  current?: string;
  total?: number;
  showPercentage?: boolean;
  showCurrent?: boolean;
  onCancel?: () => void;
  isStalled?: boolean;
}

const ACTION_PATTERNS = [
  { pattern: /ROW-(\d+)/, format: (match: RegExpMatchArray) => `正在处理第 ${parseInt(match[1])} 行` },
  { pattern: /读取/, format: () => '正在读取 Excel 文件...' },
  { pattern: /保存/, format: () => '正在保存文件...' },
  { pattern: /图片 | 插入/, format: (match: RegExpMatchArray) => match[0] },
] as const;

const formatCurrentAction = (action: string): string => {
  for (const { pattern, format } of ACTION_PATTERNS) {
    const match = action.match(pattern);
    if (match) {
      return format(match);
    }
  }
  return action;
};

const ProgressBar: React.FC<ProgressBarProps> = memo(({
  progress,
  current,
  total,
  showPercentage = true,
  showCurrent = true,
  onCancel,
  isStalled = false,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const currentCount = total ? Math.round(total * clampedProgress / 100) : 0;

  const fillClassName = [
    styles.fill,
    isStalled ? styles.skeleton : '',
    clampedProgress >= 100 ? styles.complete : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <SpinnerIcon size={24} />
        </div>
        <div className={styles.info}>
          {showCurrent && current && (
            <div className={styles.current}>
              {formatCurrentAction(current)}
            </div>
          )}
          {total && total > 0 && (
            <div className={styles.total}>
              进度：{currentCount} / {total} 项 ({clampedProgress.toFixed(1)}%)
            </div>
          )}
        </div>

        {showPercentage && (
          <div className={styles.percentage}>
            {clampedProgress.toFixed(1)}%
          </div>
        )}

        {onCancel && (
          <button
            className={styles.cancelButton}
            onClick={onCancel}
          >
            取消
          </button>
        )}
      </div>

      <div className={styles.track}>
        <div
          className={fillClassName}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(clampedProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`进度: ${clampedProgress.toFixed(1)}%`}
        />
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
