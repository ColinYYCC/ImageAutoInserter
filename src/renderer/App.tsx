import React, { useEffect, useState } from 'react';
import FilePicker from './components/FilePicker';
import ProcessingPage from './components/ProcessingPage';
import { UpdateNotification } from './components/UpdateNotification';

import { useProcessor } from './hooks/useProcessor';
import { useAppStore } from './hooks/useAppStore';
import { AppError } from '../shared/types';
import styles from './App.module.css';

const App: React.FC = () => {
  const { handleStart, handleCancel, handleOpenFile } = useProcessor();
  const { phase, excelFile, imageSource, progress, current, total, result, error, setExcelValidated, setImageSourceValidated, canStartProcessing, reset } = useAppStore();
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then(({ version }) => {
      if (version) setAppVersion(version);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribeProgress = window.electronAPI?.onProgress((data) => {
      useAppStore.getState().setProgress(data.percent, data.current, data.total);
    });

    const unsubscribeComplete = window.electronAPI?.onComplete((data) => {
      const state = useAppStore.getState();
      if (state.phase === 'IDLE') {
        return;
      }
      useAppStore.getState().setResult(data);
    });

    const unsubscribeError = window.electronAPI?.onError((data) => {
      const state = useAppStore.getState();
      if (state.phase === 'IDLE') {
        return;
      }
      const appError: AppError = {
        type: data.type as AppError['type'],
        message: data.message,
        resolution: data.resolution
      };
      useAppStore.getState().setError(appError);
    });

    return () => {
      unsubscribeProgress?.();
      unsubscribeComplete?.();
      unsubscribeError?.();
    };
  }, []);

  const handleOpenOutputFile = () => {
    console.log('[App] handleOpenOutputFile called', { phase, result });
    if (phase === 'COMPLETE' && result) {
      console.log('[App] result.details:', result);
      if (!result.outputPath) {
        console.error('[App] outputPath is missing in result:', result);
        alert('输出文件路径无效，请尝试重新处理');
        return;
      }
      handleOpenFile(result.outputPath);
    }
  };

  const canSelectExcel = phase !== 'PROCESSING';
  const canSelectImages = phase !== 'PROCESSING';
  const isReadyToProcess = canStartProcessing();

  if (phase === 'PROCESSING' || phase === 'COMPLETE' || phase === 'ERROR') {
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
          {appVersion && <span className={styles.versionBadge}>v{appVersion}</span>}
        </div>
      </div>
    );
  }

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
              onChange={(file) => useAppStore.getState().setImageSource(file ?? undefined)}
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
              onChange={(file) => useAppStore.getState().setExcelFile(file ?? undefined)}
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
        {appVersion && <span className={styles.versionBadge}>v{appVersion}</span>}
      </div>
      <UpdateNotification />
    </div>
  );
};

export default App;
