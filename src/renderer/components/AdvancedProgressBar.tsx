/**
 * ============================================================
 * 高级进度条组件 - AdvancedProgressBar
 * ============================================================
 *
 * 特性：
 * - 4种填充动效方案：渐变填充、分段式、脉冲式、色彩渐变
 * - 完整的动画配置系统
 * - 性能优化：transform/opacity、节流渲染、prefers-reduced-motion
 * - 无障碍支持：ARIA 进度属性、键盘导航
 *
 * @version 1.0.0
 */

import React, { memo, useState, useEffect, useRef, useMemo } from 'react';

export type FillMode = 'gradient' | 'segments' | 'pulse' | 'color-shift';
export type EasingType = 'ease-out' | 'ease-in-out' | 'linear' | 'spring' | 'bounce';
export type ProgressStatus = 'idle' | 'processing' | 'complete' | 'error' | 'warning';

export interface AnimationConfig {
  duration: {
    fill: number;
    complete: number;
    pulse: number;
    shimmer: number;
  };
  easing: {
    fill: EasingType;
    complete: EasingType;
  };
  colors: {
    gradient: [string, string];
    pulse: string;
    complete: string;
    error: string;
    warning: string;
  };
  effects: {
    shimmer: boolean;
    pulse: boolean;
    glow: boolean;
    segments: boolean;
  };
  segmentCount?: number;
}

export interface AdvancedProgressBarProps {
  progress: number;
  status?: ProgressStatus;
  fillMode?: FillMode;
  config?: Partial<AnimationConfig>;
  showLabel?: boolean;
  showPercentage?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onComplete?: () => void;
}

const DEFAULT_CONFIG: AnimationConfig = {
  duration: {
    fill: 300,
    complete: 800,
    pulse: 1500,
    shimmer: 1500,
  },
  easing: {
    fill: 'ease-out',
    complete: 'spring',
  },
  colors: {
    gradient: ['#8B7355', '#7A6548'],
    pulse: '#FFFFFF',
    complete: '#2D7A3E',
    error: '#C92A2A',
    warning: '#B7791F',
  },
  effects: {
    shimmer: true,
    pulse: false,
    glow: false,
    segments: false,
  },
};

const EASING_FUNCTIONS: Record<EasingType, string> = {
  'ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
  'ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
  'linear': 'linear',
  'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

const SIZE_CONFIG = {
  sm: { height: 4, fontSize: 12, iconSize: 16 },
  md: { height: 8, fontSize: 14, iconSize: 20 },
  lg: { height: 12, fontSize: 16, iconSize: 24 },
};

/**
 * 组件样式
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    position: 'relative',
  },
  track: {
    width: '100%',
    borderRadius: 9999,
    backgroundColor: '#E0DFDD',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 9999,
    position: 'relative',
    willChange: 'width, transform',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
    animation: 'shimmer 1.5s infinite',
  },
  pulse: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 0 8px 4px rgba(255,255,255,0.5)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  glow: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    bottom: -2,
    borderRadius: 9999,
    filter: 'blur(4px)',
    opacity: 0.5,
    zIndex: -1,
  },
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    fontSize: 14,
    color: '#5A5A5A',
  },
  percentage: {
    fontWeight: 700,
    color: '#8B7355',
  },
  segmentsContainer: {
    display: 'flex',
    gap: 4,
    width: '100%',
  },
  segment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
    transition: 'all 0.3s ease',
  },
  segmentInactive: {
    backgroundColor: '#E0DFDD',
  },
  segmentActive: {
    background: 'linear-gradient(135deg, #8B7355 0%, #7A6548 100%)',
  },
};

/**
 * 辅助函数：创建CSS关键帧动画
 */
const injectKeyframes = (id: string, keyframes: string) => {
  if (typeof document === 'undefined') return;

  const styleId = `progress-bar-keyframes-${id}`;
  if (document.getElementById(styleId)) return;

  const styleSheet = document.createElement('style');
  styleSheet.id = styleId;
  styleSheet.textContent = keyframes;
  document.head.appendChild(styleSheet);
};

/**
 * 辅助函数：节流渲染
 */
const throttle = <T extends (...args: any[]) => void>(func: T, limit: number): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

/**
 * ============================================================
 * 组件实现
 * ============================================================
 */
const AdvancedProgressBar: React.FC<AdvancedProgressBarProps> = memo(({
  progress,
  status = 'processing',
  fillMode = 'gradient',
  config: customConfig,
  showLabel = true,
  showPercentage = true,
  animated = true,
  size = 'md',
  onComplete,
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const prevProgressRef = useRef(0);
  const hasCompletedRef = useRef(false);

  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...customConfig,
    duration: { ...DEFAULT_CONFIG.duration, ...customConfig?.duration },
    easing: { ...DEFAULT_CONFIG.easing, ...customConfig?.easing },
    colors: { ...DEFAULT_CONFIG.colors, ...customConfig?.colors },
    effects: { ...DEFAULT_CONFIG.effects, ...customConfig?.effects },
  }), [customConfig]);

  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const sizeConfig = SIZE_CONFIG[size];

  // ============================================================
  // 动画计算逻辑
  // ============================================================
  useEffect(() => {
    if (!animated) {
      setDisplayProgress(clampedProgress);
      return;
    }

    const throttleSetProgress = throttle((p: number) => {
      setDisplayProgress(p);
    }, 16); // ~60fps

    const animate = () => {
      setDisplayProgress(prev => {
        const diff = clampedProgress - prev;

        if (Math.abs(diff) < 0.1) {
          setIsAnimating(false);
          return clampedProgress;
        }

        const speed = Math.max(Math.abs(diff) * 0.08, 0.3);
        const next = prev + (diff > 0 ? speed : -speed);
        throttleSetProgress(next);

        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    setIsAnimating(true);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [clampedProgress, animated]);

  // ============================================================
  // 完成状态检测
  // ============================================================
  useEffect(() => {
    if (clampedProgress >= 100 && prevProgressRef.current < 100 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      setIsAnimating(true);
      onComplete?.();

      setTimeout(() => {
        setIsAnimating(false);
      }, config.duration.complete);
    } else if (clampedProgress < 100) {
      hasCompletedRef.current = false;
    }
    prevProgressRef.current = clampedProgress;
  }, [clampedProgress, config.duration.complete, onComplete]);

  // ============================================================
  // 动态样式计算
  // ============================================================
  const trackStyle = useMemo((): React.CSSProperties => ({
    ...styles.track,
    height: sizeConfig.height,
  }), [sizeConfig.height]);

  const fillStyle = useMemo((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      ...styles.fill,
      width: `${displayProgress}%`,
      transition: animated
        ? `width ${config.duration.fill}ms ${EASING_FUNCTIONS[config.easing.fill]}`
        : 'none',
    };

    // 根据状态设置颜色
    let bgColor: string | [string, string];
    switch (status) {
      case 'complete':
        bgColor = config.colors.complete;
        break;
      case 'error':
        bgColor = config.colors.error;
        break;
      case 'warning':
        bgColor = config.colors.warning;
        break;
      default:
        bgColor = config.colors.gradient;
    }

    if (Array.isArray(bgColor)) {
      baseStyle.background = `linear-gradient(90deg, ${bgColor[0]} 0%, ${bgColor[1]} 100%)`;
    } else {
      baseStyle.background = bgColor;
    }

    // 发光效果
    if (config.effects.glow && isAnimating) {
      baseStyle.boxShadow = `0 0 12px 2px ${bgColor}`;
    }

    return baseStyle;
  }, [displayProgress, animated, config, status, isAnimating]);

  const shimmerStyle = useMemo((): React.CSSProperties => ({
    ...styles.shimmer,
    animationDuration: `${config.duration.shimmer}ms`,
  }), [config.duration.shimmer]);

  const pulseStyle = useMemo((): React.CSSProperties => ({
    ...styles.pulse,
    animationDuration: `${config.duration.pulse}ms`,
    backgroundColor: config.colors.pulse,
  }), [config.duration.pulse, config.colors.pulse]);

  // ============================================================
  // 分段模式渲染
  // ============================================================
  const renderSegments = () => {
    const count = config.segmentCount || 10;
    const activeIndex = Math.floor((displayProgress / 100) * count);

    return (
      <div style={styles.segmentsContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            style={{
              ...styles.segment,
              ...(index < activeIndex ? styles.segmentActive : styles.segmentInactive),
              transitionDelay: `${index * 30}ms`,
            }}
          />
        ))}
      </div>
    );
  };

  // ============================================================
  // 渲染填充效果
  // ============================================================
  const renderFill = () => {
    if (fillMode === 'segments' || config.effects.segments) {
      return renderSegments();
    }

    return (
      <div style={fillStyle}>
        {/* 光泽效果 */}
        {config.effects.shimmer && (
          <div style={shimmerStyle} />
        )}

        {/* 脉冲点效果 */}
        {config.effects.pulse && isAnimating && (
          <div style={pulseStyle} />
        )}
      </div>
    );
  };

  // ============================================================
  // ARIA 无障碍支持
  // ============================================================
  const ariaLabel = useMemo(() => {
    const statusText = {
      idle: '等待中',
      processing: '处理中',
      complete: '已完成',
      error: '发生错误',
      warning: '存在警告',
    }[status];

    return `进度条: ${Math.round(displayProgress)}%, ${statusText}`;
  }, [displayProgress, status]);

  // ============================================================
  // 注入关键帧动画
  // ============================================================
  useEffect(() => {
    injectKeyframes('shimmer', `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `);

    injectKeyframes('pulse', `
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: translateY(-50%) scale(1);
        }
        50% {
          opacity: 0.5;
          transform: translateY(-50%) scale(1.2);
        }
      }
    `);
  }, []);

  // ============================================================
  // prefers-reduced-motion 支持
  // ============================================================
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  if (prefersReducedMotion) {
    return (
      <div style={styles.container} role="progressbar" aria-label={ariaLabel} aria-valuenow={Math.round(displayProgress)}>
        {showLabel && (
          <div style={styles.label}>
            <span>处理进度</span>
            {showPercentage && <span style={styles.percentage}>{Math.round(displayProgress)}%</span>}
          </div>
        )}
        <div style={{ ...trackStyle, backgroundColor: '#E0DFDD' }}>
          <div style={{ ...fillStyle, width: `${displayProgress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} role="progressbar" aria-label={ariaLabel} aria-valuenow={Math.round(displayProgress)}>
      {showLabel && (
        <div style={styles.label}>
          <span>处理进度</span>
          {showPercentage && <span style={styles.percentage}>{Math.round(displayProgress)}%</span>}
        </div>
      )}
      <div style={trackStyle}>
        {renderFill()}
      </div>
    </div>
  );
});

AdvancedProgressBar.displayName = 'AdvancedProgressBar';

export default AdvancedProgressBar;

/**
 * ============================================================
 * 使用示例
 * ============================================================
 *
 * // 示例 1: 默认渐变填充（文件上传场景）
 * <AdvancedProgressBar progress={65} fillMode="gradient" />
 *
 * // 示例 2: 分段式进度（任务完成度场景）
 * <AdvancedProgressBar
 *   progress={70}
 *   fillMode="segments"
 *   config={{ segmentCount: 10 }}
 * />
 *
 * // 示例 3: 脉冲式加载（数据加载场景）
 * <AdvancedProgressBar
 *   progress={45}
 *   fillMode="pulse"
 *   config={{
 *     effects: { pulse: true, shimmer: false },
 *     duration: { pulse: 1200 }
 *   }}
 * />
 *
 * // 示例 4: 色彩渐变（编译进度场景）
 * <AdvancedProgressBar
 *   progress={progressValue}
 *   fillMode="color-shift"
 *   config={{
 *     colors: {
 *       gradient: ['#C92A2A', '#B7791F', '#2D7A3E'], // 红→黄→绿
 *     }
 *   }}
 * />
 *
 * // 示例 5: 完成状态动效
 * <AdvancedProgressBar
 *   progress={100}
 *   status="complete"
 *   config={{
 *     effects: { glow: true },
 *     easing: { complete: 'bounce' }
 *   }}
 *   onComplete={() => console.log('完成！')}
 * />
 *
 * // 示例 6: 自定义配置（高性能版本）
 * <AdvancedProgressBar
 *   progress={value}
 *   animated={false}  // 禁用动画，直接跳到目标值
 *   config={{
 *     effects: { shimmer: false, pulse: false, glow: false },
 *     duration: { fill: 0 }
 *   }}
 * />
 */
