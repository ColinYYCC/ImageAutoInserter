import { useState, useCallback, useEffect } from 'react';

export interface GuideStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface UseGuideOptions {
  enabled?: boolean;
  autoStart?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

const DEFAULT_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    target: 'h1',
    title: '欢迎使用',
    content: '商品图片自动插入工具可以帮助您快速将图片批量插入到 Excel 表格中。',
    position: 'bottom',
  },
  {
    id: 'select-images',
    target: '[data-testid="image-source"]',
    title: '选择图片来源',
    content: '首先，选择包含商品图片的文件夹或压缩包。支持 ZIP、RAR、7Z 格式。',
    position: 'right',
  },
  {
    id: 'select-excel',
    target: '[data-testid="excel-source"]',
    title: '选择 Excel 文件',
    content: '然后，选择包含商品编码的 Excel 文件。文件应包含"商品编码"列。',
    position: 'right',
  },
  {
    id: 'start-process',
    target: '[data-testid="start-button"]',
    title: '开始处理',
    content: '确认文件选择正确后，点击"开始处理"按钮。',
    position: 'top',
  },
  {
    id: 'view-result',
    target: '[data-testid="result-view"]',
    title: '查看结果',
    content: '处理完成后，您可以查看处理统计，并打开输出文件。',
    position: 'left',
  },
];

const GUIDE_STORAGE_KEY = 'imageautoinserter_guide_completed';

export function useGuide(options: UseGuideOptions = {}) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const {
    enabled = true,
    autoStart = false,
    onComplete,
    onSkip,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const completed = localStorage.getItem(GUIDE_STORAGE_KEY);
    setIsCompleted(completed === 'true');

    if (autoStart && completed !== 'true') {
      setIsActive(true);
    }
  }, [enabled, autoStart]);

  const start = useCallback(() => {
    if (isCompleted) return;
    setIsActive(true);
    setCurrentStepIndex(0);
  }, [isCompleted]);

  const next = useCallback(() => {
    if (currentStepIndex < DEFAULT_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      complete();
    }
  }, [currentStepIndex]);

  const previous = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skip = useCallback(() => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem(GUIDE_STORAGE_KEY, 'true');
    onSkip?.();
  }, [onSkip]);

  const complete = useCallback(() => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem(GUIDE_STORAGE_KEY, 'true');
    onComplete?.();
  }, [onComplete]);

  const reset = useCallback(() => {
    setIsCompleted(false);
    localStorage.removeItem(GUIDE_STORAGE_KEY);
  }, []);

  const currentStep = DEFAULT_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === DEFAULT_STEPS.length - 1;

  return {
    isActive,
    isCompleted,
    currentStep,
    currentStepIndex,
    totalSteps: DEFAULT_STEPS.length,
    isFirst,
    isLast,
    steps: DEFAULT_STEPS,
    start,
    next,
    previous,
    skip,
    complete,
    reset,
  };
}

export default useGuide;
