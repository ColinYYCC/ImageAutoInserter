import React, { memo, useState, useEffect, useRef } from 'react';
import styles from './ProcessingPage.module.css';
import { ProcessingResult } from '../../shared/types';
import { CheckCircleIcon, ErrorIcon } from './Icons';
import Loader from './RobotLoader';

interface ProcessingPageProps {
  progress: number;
  current: string;
  total?: number;
  result?: ProcessingResult;
  error?: { type: string; message: string; resolution: string };
  onCancel?: () => void;
  onOpenFile?: () => void;
  onReset?: () => void;
}

/**
 * ============================================================================
 * 平滑进度 Hook - useSmoothProgress
 * ============================================================================
 * 
 * 设计目标：
 *   - 解决进度条跳跃问题（0% → 10%，95% → 结果页）
 *   - 解决进度条卡顿问题（解析/保存阶段长时间无进度更新）
 *   - 提供平滑的动画过渡效果
 *   - 确保用户能感知每个进度阶段
 * 
 * 核心机制：
 *   1. 单调递增保证：使用 maxProgressRef 记录最大进度，防止回退
 *   2. ease-out 缓动动画：差距越大速度越快，接近目标时减速
 *   3. 结果延迟显示：100% 后延迟 800ms 切换结果页，让用户看到完成状态
 *   4. 进度预测动画：后端无更新时自动推进进度，填补空白期
 * 
 * 进度预测算法：
 *   - 解析阶段 (0%-10%)：每秒推进 1%，最多到 8%
 *   - 处理阶段 (10%-90%)：每秒推进 0.5%，最多到实际进度 + 5%
 *   - 保存阶段 (90%-100%)：每秒推进 0.3%，最多到 98%
 *   - 当后端进度更新时，平滑过渡到实际进度
 * 
 * 动画算法：
 *   - 每帧移动距离 = max(剩余距离 × 0.08, 0.3)
 *   - 最小速度 0.3% 确保慢速时也能看到动画
 *   - 使用 requestAnimationFrame 实现 60fps 流畅动画
 * 
 * 与后端配合：
 *   - 后端发送关键节点进度（0%, 5%, 10%, 90%, 95%, 99%, 100%）
 *   - 中间添加 time.sleep() 延迟确保前端有时间渲染
 *   - 前端负责节点间的平滑插值动画和预测动画
 * ============================================================================
 */
function useSmoothProgress(actualProgress: number, isComplete: boolean): { 
  displayProgress: number; 
  showResult: boolean;
} {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const animationRef = useRef<number | null>(null);
  const targetRef = useRef(0);
  const maxProgressRef = useRef(0);
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef(Date.now());
  const predictedProgressRef = useRef(0);

  // ============================================================================
  // 进度动画效果（含预测机制）
  // ============================================================================
  useEffect(() => {
    const clampedActual = Math.min(Math.max(actualProgress, 0), 100);
    
    // 更新最后更新时间
    lastUpdateRef.current = Date.now();
    
    // 确保进度只增不减 - 记录历史最大值
    if (clampedActual > maxProgressRef.current) {
      maxProgressRef.current = clampedActual;
      // 后端进度更新时，重置预测进度
      predictedProgressRef.current = clampedActual;
    }
    
    // 目标进度为历史最大值
    targetRef.current = maxProgressRef.current;

    // 取消之前的动画帧，避免多个动画同时运行
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // 动画循环：使用 requestAnimationFrame 实现 60fps 流畅动画
    const animate = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      // 如果超过 500ms 没有后端进度更新，启动预测动画
      if (timeSinceLastUpdate > 500 && targetRef.current < 100) {
        // 根据当前阶段计算预测进度的上限
        let maxPredicted: number;
        let predictSpeed: number;
        
        if (targetRef.current < 10) {
          // 解析阶段：最多预测到 8%
          maxPredicted = 8;
          predictSpeed = 0.02; // 每帧 0.02%，约每秒 1.2%
        } else if (targetRef.current < 90) {
          // 处理阶段：最多预测到实际进度 + 5%
          maxPredicted = Math.min(targetRef.current + 5, 88);
          predictSpeed = 0.01; // 每帧 0.01%，约每秒 0.6%
        } else {
          // 保存阶段：最多预测到 98%
          maxPredicted = 98;
          predictSpeed = 0.005; // 每帧 0.005%，约每秒 0.3%
        }
        
        // 更新预测进度
        if (predictedProgressRef.current < maxPredicted) {
          predictedProgressRef.current = Math.min(
            predictedProgressRef.current + predictSpeed,
            maxPredicted
          );
        }
      }
      
      // 最终目标：取实际进度和预测进度的较大值
      const finalTarget = Math.max(targetRef.current, predictedProgressRef.current);
      
      setDisplayProgress(prev => {
        const diff = finalTarget - prev;
        
        // 当差距小于 0.3% 时，直接到达目标（避免无限接近）
        if (Math.abs(diff) < 0.3) {
          return finalTarget;
        }
        
        // ease-out 缓动：速度 = max(剩余距离 × 0.08, 最小速度 0.3)
        // 这样设计确保：
        //   - 差距大时移动快（快速接近目标）
        //   - 差距小时移动慢（平滑减速）
        //   - 最小速度保证慢速时也能看到动画
        const speed = Math.max(Math.abs(diff) * 0.08, 0.3);
        const next = prev + (diff > 0 ? speed : -speed);
        return next;
      });
      
      // 继续下一帧动画
      animationRef.current = requestAnimationFrame(animate);
    };

    // 启动动画
    animationRef.current = requestAnimationFrame(animate);

    // 清理函数：组件卸载时取消动画
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [actualProgress]);

  // ============================================================================
  // 结果页面延迟显示
  // ============================================================================
  // 问题背景：
  //   - 后端发送 100% 后立即发送 result，组件立即切换到结果页
  //   - 用户看不到 100% 的完成状态，体验突兀
  // 
  // 解决方案：
  //   - isComplete 为 true 时，延迟 800ms 再显示结果页
  //   - 这 800ms 让用户看到进度条到达 100% 的动画
  //   - 提供视觉上的"完成确认"，增强用户体验
  // ============================================================================
  useEffect(() => {
    if (isComplete && !showResult) {
      // 清除之前的定时器（避免重复触发）
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current);
      }
      
      // 延迟 800ms 显示结果，让用户看到 100% 动画完成
      completeTimerRef.current = setTimeout(() => {
        setShowResult(true);
      }, 800);
    } else if (!isComplete) {
      // 重置状态，为下一次处理做准备
      setShowResult(false);
    }

    // 清理函数：组件卸载时清除定时器
    return () => {
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current);
      }
    };
  }, [isComplete]);

  return { displayProgress, showResult };
}

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
  // 使用平滑进度
  const { displayProgress, showResult } = useSmoothProgress(progress, !!result);
  const clampedProgress = Math.min(Math.max(displayProgress, 0), 100);
  
  // 跟踪是否刚完成（用于触发完成动画）
  const [justCompleted, setJustCompleted] = useState(false);
  const prevProgressRef = useRef(0);
  
  // 检测进度从 <100 变为 100，触发完成动画
  useEffect(() => {
    if (prevProgressRef.current < 100 && progress >= 100) {
      setJustCompleted(true);
    }
    prevProgressRef.current = progress;
  }, [progress]);
  
  // 根据 showResult 决定是否显示结果（延迟切换）
  const shouldShowResult = !!result && showResult;

  const getStatusText = () => {
    // 阶段定义与后端保持一致：
    // - 解析阶段: 0% - 10%
    // - 处理阶段: 10% - 90%
    // - 保存阶段: 90% - 100%
    if (progress < 10) {
      return '解析中';
    } else if (progress < 90) {
      return '处理中';
    } else if (progress < 100) {
      return '保存中';
    }
    return '处理完成';
  };

  // 进度条从一开始就显示，即使进度为0也显示空进度条
  const showProgress = true;

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
            <span className={styles.statValue}>{result!.total}</span>
            <span className={styles.statLabel}>总计</span>
          </div>
          <div className={styles.statBoxSuccess}>
            <span className={styles.statValue}>{result!.success}</span>
            <span className={styles.statLabel}>成功</span>
          </div>
          <div className={styles.statBoxError}>
            <span className={styles.statValue}>{result!.failed}</span>
            <span className={styles.statLabel}>失败</span>
          </div>
        </div>

        <p className={styles.rateText}>
          成功率 <strong>{result!.successRate.toFixed(1)}%</strong>
        </p>

        <div className={styles.buttonGroup}>
          <button className={styles.buttonPrimary} onClick={onOpenFile}>
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

      {showProgress && (
        <div className={styles.progressWrapper}>
          <div className={`${styles.progressBar} ${justCompleted ? styles.progressBarComplete : ''}`}>
            <div 
              className={`${styles.progressFill} ${justCompleted ? styles.progressFillComplete : ''}`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <span className={styles.progressPercent}>{Math.round(clampedProgress)}%</span>
        </div>
      )}

      <button className={styles.linkButton} onClick={onCancel}>
        取消
      </button>
    </div>
  );
});

ProcessingPage.displayName = 'ProcessingPage';

export default ProcessingPage;
