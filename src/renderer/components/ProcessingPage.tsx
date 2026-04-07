import React, { memo, useState, useEffect, useRef } from 'react';
import styles from './ProcessingPage.module.css';
import { ProcessingResult, AppError } from '../../shared/types';
import { createLogger } from '../../shared/logger';
import { CheckCircleIcon, ErrorIcon } from './Icons';
import Loader from './RobotLoader';

const logger = createLogger('ProcessingPage');

interface ProcessingPageProps {
  progress: number;
  current: string;
  total?: number;
  result?: ProcessingResult;
  error?: AppError;
  onCancel?: () => void;
  onOpenFile?: () => void;
  onReset?: () => void;
}

interface StageConfig {
  range: [number, number];
  label: string;
  color: string;
}

const STAGES: StageConfig[] = [
  { range: [0, 2], label: '启动进程', color: '#8B7355' },
  { range: [2, 6], label: '扫描图片', color: '#8B7355' },
  { range: [6, 15], label: '加载图片', color: '#9d8668' },
  { range: [15, 20], label: '解析Excel', color: '#9d8668' },
  { range: [20, 23], label: '配置列', color: '#A69076' },
  { range: [23, 26], label: '预加载', color: '#A69076' },
  { range: [26, 88], label: '嵌入图片', color: '#A69076' },
  { range: [88, 92], label: '高亮标记', color: '#6B8E23' },
  { range: [92, 98], label: '保存文件', color: '#6B8E23' },
  { range: [98, 100], label: '完成', color: '#2D7A3E' },
];

function getCurrentStage(progress: number): StageConfig {
  if (progress >= 100) {
    return STAGES[STAGES.length - 1];
  }
  return STAGES.find(s => progress >= s.range[0] && progress < s.range[1]) || STAGES[0];
}

const MicroProgressBar: React.FC<{ progress: number }> = memo(({ progress }) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const displayRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const targetValue = progress;

    const animate = () => {
      const diff = targetValue - displayRef.current;
      if (Math.abs(diff) > 0.5) {
        displayRef.current += diff * 0.12;
        setDisplayProgress(displayRef.current);
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        displayRef.current = targetValue;
        setDisplayProgress(targetValue);
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [progress]);

  const normalizedProgress = Math.min(Math.max(displayProgress, 0), 100);
  const currentStage = getCurrentStage(progress);

  return (
    <div className={styles.microProgressContainer}>
      <div className={styles.microProgressTrack}>
        <div
          className={styles.microProgressFill}
          style={{ 
            width: `${normalizedProgress}%`,
            background: `linear-gradient(90deg, ${STAGES[0].color}, ${currentStage.color})`
          }}
        >
          <div className={styles.microShimmer} />
        </div>
      </div>
    </div>
  );
});

const ProcessingPage: React.FC<ProcessingPageProps> = memo(({
  progress,
  current: _current,
  total: _total,
  result,
  error,
  onCancel,
  onOpenFile,
  onReset,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const [delayedResult, setDelayedResult] = useState<ProcessingResult | undefined>(undefined);
  const currentStage = getCurrentStage(clampedProgress);

  useEffect(() => {
    if (result && clampedProgress >= 100) {
      const timer = setTimeout(() => {
        setDelayedResult(result);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDelayedResult(undefined);
    }
  }, [result, clampedProgress]);

  const shouldShowResult = !!delayedResult;

  const getStatusText = () => {
    return currentStage.label;
  };

  if (error) {
    return (
      <div className={styles.stateContainer}>
        <div className={styles.iconError}>
          <ErrorIcon size={40} />
        </div>
        <h2 className={styles.titleError}>处理失败</h2>
        <p className={styles.messageError}>{error.message}</p>
        <p className={styles.hintError}>{error.resolution}</p>
        <button className={styles.buttonPrimary} onClick={onReset}>
          返回重试
        </button>
      </div>
    );
  }

  if (shouldShowResult) {
    return (
      <div className={styles.stateContainer}>
        <div className={styles.iconSuccess}>
          <CheckCircleIcon size={40} />
        </div>

        <h2 className={styles.titleSuccess}>处理完成</h2>

        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{delayedResult!.total}</span>
            <span className={styles.statLabel}>总计</span>
          </div>
          <div className={styles.statBoxSuccess}>
            <span className={styles.statValue}>{delayedResult!.success}</span>
            <span className={styles.statLabel}>成功</span>
          </div>
          <div className={styles.statBoxError}>
            <span className={styles.statValue}>{delayedResult!.failed}</span>
            <span className={styles.statLabel}>失败</span>
          </div>
        </div>

        <p className={styles.rateText}>
          成功率 <strong>{delayedResult!.successRate.toFixed(1)}%</strong>
        </p>

        <div className={styles.buttonGroup}>
          <button className={styles.buttonPrimary} onClick={() => {
            logger.debug('打开文件按钮被点击', { onOpenFile: typeof onOpenFile });
            onOpenFile?.();
          }}>
            打开文件
          </button>
          <button className={styles.buttonSecondary} onClick={onReset}>
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stateContainer}>
      <Loader />
      <span className={styles.statusText}>{getStatusText()}</span>

      <div className={styles.progressWrapper}>
        <MicroProgressBar progress={clampedProgress} />
        <span className={styles.progressPercent}>
          {`${Math.round(clampedProgress)}%`}
        </span>
      </div>

      <button className={styles.linkButton} onClick={onCancel}>
        取消
      </button>
    </div>
  );
});

ProcessingPage.displayName = 'ProcessingPage';

export default ProcessingPage;
