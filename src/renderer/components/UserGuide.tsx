import React, { useEffect, useRef } from 'react';
import { GuideStep } from '../hooks/useGuide';
import styles from './UserGuide.module.css';

interface UserGuideProps {
  step: GuideStep | null;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({
  step,
  isActive,
  isFirst,
  isLast,
  currentIndex,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && step) {
      const targetElement = document.querySelector(step.target);
      if (targetElement && tooltipRef.current) {
        const rect = targetElement.getBoundingClientRect();
        const tooltip = tooltipRef.current;

        tooltip.style.position = 'fixed';

        switch (step.position) {
          case 'top':
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
            break;
          case 'bottom':
            tooltip.style.top = `${rect.bottom + 10}px`;
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
            break;
          case 'left':
            tooltip.style.top = `${rect.top + rect.height / 2 - tooltip.offsetHeight / 2}px`;
            tooltip.style.left = `${rect.left - tooltip.offsetWidth - 10}px`;
            break;
          case 'right':
            tooltip.style.top = `${rect.top + rect.height / 2 - tooltip.offsetHeight / 2}px`;
            tooltip.style.left = `${rect.right + 10}px`;
            break;
        }
      }
    }
  }, [isActive, step]);

  if (!isActive || !step) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.highlight} data-guide-target={step.target} />

      <div ref={tooltipRef} className={styles.tooltip}>
        <div className={styles.header}>
          <span className={styles.stepIndicator}>
            {currentIndex + 1} / {totalSteps}
          </span>
          <button className={styles.closeButton} onClick={onSkip}>
            ✕
          </button>
        </div>

        <h3 className={styles.title}>{step.title}</h3>
        <p className={styles.content}>{step.content}</p>

        <div className={styles.footer}>
          <div className={styles.dots}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i === currentIndex ? styles.activeDot : ''}`}
              />
            ))}
          </div>

          <div className={styles.buttons}>
            {!isFirst && (
              <button className={styles.prevButton} onClick={onPrevious}>
                上一步
              </button>
            )}

            {isLast ? (
              <button className={styles.completeButton} onClick={onComplete}>
                完成
              </button>
            ) : (
              <button className={styles.nextButton} onClick={onNext}>
                下一步
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
