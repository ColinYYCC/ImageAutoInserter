import React, { useEffect } from 'react';
import FilePicker from './components/FilePicker';
import ProcessingPage from './components/ProcessingPage';
import { UpdateNotification } from './components/UpdateNotification';

import { useProcessor } from './hooks/useProcessor';
import { useAppStore } from './hooks/useAppStore';
import { AppError } from '../shared/types';
import { createRendererLogger } from './utils/renderer-logger';
import styles from './App.module.css';

const logger = createRendererLogger('App');

logger.info('App 组件开始加载');
logger.debug('electronAPI 存在:', !!window.electronAPI);

const App: React.FC = () => {
  logger.debug('App 组件渲染中...');

  const { handleStart, handleCancel, handleOpenFile } = useProcessor();
  logger.debug('useProcessor 返回值:', { handleStart: !!handleStart, handleCancel: !!handleCancel });

  const { phase, excelFile, imageSource, progress, current, total, result, error, setExcelValidated, setImageSourceValidated, setProgress, setResult, setError, canStartProcessing, reset } = useAppStore();
  logger.debug('useAppStore 状态:', { phase, excelFile: excelFile?.path, imageSource: imageSource?.path });

  useEffect(() => {
    logger.info('useEffect 执行 - 订阅事件');
    logger.debug('订阅 progress, complete, error 事件');

    const unsubscribeProgress = window.electronAPI?.onProgress((data) => {
      logger.debug('收到 progress 事件:', data);
      setProgress(data.percent, data.current, data.total);
    });

    const unsubscribeComplete = window.electronAPI?.onComplete((data) => {
      logger.info('收到 complete 事件:', data);
      setResult(data);
    });

    const unsubscribeError = window.electronAPI?.onError((data) => {
      logger.error('收到 error 事件:', data);
      const appError: AppError = {
        type: data.type as AppError['type'],
        message: data.message,
        resolution: data.resolution,
      };
      setError(appError);
    });

    return () => {
      logger.info('useEffect cleanup - 取消订阅');
      unsubscribeProgress?.();
      unsubscribeComplete?.();
      unsubscribeError?.();
    };
  }, [setProgress, setResult, setError]);

  const handleOpenOutputFile = () => {
    logger.debug('handleOpenOutputFile called', { phase, result });
    if (phase === 'COMPLETE' && result) {
      logger.debug('result.details', { result });
      if (!result.outputPath) {
        logger.error('outputPath is missing in result', { result });
        alert('输出文件路径无效，请尝试重新处理');
        return;
      }
      handleOpenFile(result.outputPath);
    }
  };

  const canSelectExcel = phase !== 'PROCESSING';
  const canSelectImages = phase !== 'PROCESSING';
  const isReadyToProcess = canStartProcessing();
  logger.debug('计算状态:', { canSelectExcel, canSelectImages, isReadyToProcess });

  if (phase === 'PROCESSING' || phase === 'COMPLETE' || phase === 'ERROR') {
    logger.info('渲染 ProcessingPage (phase:', phase + ')');
    const processingState = phase === 'PROCESSING'
      ? { progress, current, total }
      : phase === 'COMPLETE'
        ? { progress: 100, current: '', total: 0 }
        : null;

    return (
      <div className={styles.app}>
        <div className={styles.mainCard}>
          <div className={styles.topBar}></div>
          <div className={styles.cardContent}>
            <ProcessingPage
              progress={processingState?.progress ?? 0}
              current={processingState?.current ?? ''}
              total={processingState?.total}
              result={phase === 'COMPLETE' ? result : undefined}
              error={phase === 'ERROR' ? error : undefined}
              onCancel={handleCancel}
              onOpenFile={handleOpenOutputFile}
              onReset={reset}
            />
          </div>
        </div>
        <div className={styles.authorFooter}>
          <span>Developed by Colin:</span>
        </div>
      </div>
    );
  }

  logger.info('渲染 FilePicker 页面');
  return (
    <div className={styles.app}>
      <div className={styles.mainCard}>
        <div className={styles.topBar}></div>
        <div className={styles.cardContent}>
          <div className={styles.header}>
            <h1>商品图片自动插入工具</h1>
            <p className={styles.subtitle}>从文件夹或压缩包中提取图片并自动插入到 Excel 表格</p>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.stepSection}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>Step 01</span>
              <span className={styles.stepTitle}>选择图片来源</span>
            </div>
            <FilePicker
              step={1}
              label="图片来源路径"
              iconType="folder"
              accept=".rar,.zip,.7z"
              value={imageSource ?? null}
              onChange={(file) => file && useAppStore.getState().setImageSource(file)}
              onValidationChange={setImageSourceValidated}
              isFolder={false}
              disabled={!canSelectImages}
              hint="支持：文件夹 / ZIP / RAR / 7Z"
            />
          </div>

          <div className={styles.stepSection}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>Step 02</span>
              <span className={styles.stepTitle}>选择 Excel 文件</span>
            </div>
            <FilePicker
              step={2}
              label="Excel 文件路径"
              iconType="excel"
              accept=".xlsx"
              value={excelFile ?? null}
              onChange={(file) => file && useAppStore.getState().setExcelFile(file)}
              onValidationChange={setExcelValidated}
              disabled={!canSelectExcel}
              hint="将自动匹配'商品编码'列，支持 .xlsx 格式"
            />
          </div>

          <div className={styles.actionSection}>
            <button
              className={styles.startButton}
              onClick={handleStart}
              disabled={!isReadyToProcess}
            >
              开始处理
            </button>
          </div>
        </div>
      </div>
      <div className={styles.authorFooter}>
        <span>Developed by Colin:</span>
      </div>
      <UpdateNotification />
    </div>
  );
};

export default App;
