import React, { useState } from 'react';
import styles from './WelcomeGuide.module.css';

interface WelcomeGuideProps {
  onClose: () => void;
}

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '欢迎使用图片自动插入工具',
      content: '本工具可以根据商品编码自动将图片嵌入 Excel 表格，让产品目录制作变得简单高效。',
      icon: '👋',
    },
    {
      title: '准备文件',
      content: '1. 准备包含"商品编码"列的 Excel 文件\n2. 准备图片文件夹或压缩包（ZIP/RAR/7Z）\n3. 图片文件名应包含对应的商品编码',
      icon: '📁',
    },
    {
      title: '使用步骤',
      content: '1. 点击"Excel 文件"选择表格\n2. 点击"图片来源"选择图片文件夹或压缩包\n3. 点击"开始处理"等待完成\n4. 处理完成后打开输出文件查看结果',
      icon: '🚀',
    },
    {
      title: '完成',
      content: '准备好开始使用了吗？点击"开始使用"按钮立即体验！',
      icon: '✅',
      footer: 'Developed by Colin Ruan:',
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.icon}>{steps[step].icon}</span>
          <h2 className={styles.title}>{steps[step].title}</h2>
        </div>
        
        <div className={styles.content}>
          <p className={styles.text}>{steps[step].content}</p>
          {steps[step].footer && (
            <p className={styles.footer}>{steps[step].footer}</p>
          )}
        </div>

        <div className={styles.progress}>
          {steps.map((_, index) => (
            <span
              key={index}
              className={`${styles.dot} ${index === step ? styles.active : ''}`}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.skipButton} onClick={handleSkip}>
            跳过
          </button>
          <button className={styles.nextButton} onClick={handleNext}>
            {step === steps.length - 1 ? '开始使用' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeGuide;
