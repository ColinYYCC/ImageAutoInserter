import React, { memo } from 'react';
import styles from './ProgressBar.module.css';
import { SpinnerIcon } from './Icons';

/**
 * 进度条组件属性
 */
interface ProgressBarProps {
  /** 进度百分比 (0-100) */
  progress: number;
  /** 当前处理项名称 */
  current?: string;
  /** 总数量 */
  total?: number;
  /** 是否显示百分比 */
  showPercentage?: boolean;
  /** 是否显示当前项 */
  showCurrent?: boolean;
  /** 取消回调 */
  onCancel?: () => void;
}

/**
 * 进度动作类型映射配置
 */
const ACTION_PATTERNS = [
  { pattern: /ROW-(\d+)/, format: (match: RegExpMatchArray) => `正在处理第 ${parseInt(match[1])} 行` },
  { pattern: /读取/, format: () => '正在读取 Excel 文件...' },
  { pattern: /保存/, format: () => '正在保存文件...' },
  { pattern: /图片 | 插入/, format: (match: RegExpMatchArray) => match[0] },
] as const;

/**
 * 格式化当前处理内容
 */
const formatCurrentAction = (action: string): string => {
  for (const { pattern, format } of ACTION_PATTERNS) {
    const match = action.match(pattern);
    if (match) {
      return format(match);
    }
  }
  return action;
};

/**
 * 进度条组件
 * 显示处理进度和当前状态
 */
const ProgressBar: React.FC<ProgressBarProps> = memo(({
  progress,
  current,
  total,
  showPercentage = true,
  showCurrent = true,
  onCancel,
}) => {
  // 限制进度在 0-100 之间
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  // 计算当前处理项数
  const currentCount = total ? Math.round(total * clampedProgress / 100) : 0;

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
          className={styles.fill}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
