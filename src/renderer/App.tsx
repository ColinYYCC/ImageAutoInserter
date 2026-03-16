import React, { useEffect, useState } from 'react';
import FilePicker from './components/FilePicker';
import ProcessingPage from './components/ProcessingPage';
import { UpdateNotification } from './components/UpdateNotification';
import { useAppState } from './hooks/useAppState';
import { useProcessor } from './hooks/useProcessor';
import styles from './App.module.css';

const App: React.FC = () => {
  const { state, selectExcel, selectImages, updateProgress, completeProcessing, handleError, reset } = useAppState();
  const { handleStart, handleCancel, handleOpenFile } = useProcessor();
  
  // 验证状态
  const [excelValid, setExcelValid] = useState(true);
  const [imageSourceValid, setImageSourceValid] = useState(true);

  useEffect(() => {
    const unsubscribeProgress = window.electronAPI?.onProgress((data) => {
      updateProgress(data.percent, data.current, data.total);
    });

    const unsubscribeComplete = window.electronAPI?.onComplete((data) => {
      completeProcessing(data);
    });

    const unsubscribeError = window.electronAPI?.onError((data) => {
      handleError(data);
    });

    return () => {
      unsubscribeProgress?.();
      unsubscribeComplete?.();
      unsubscribeError?.();
    };
  }, [updateProgress, completeProcessing, handleError]);

  const handleOpenOutputFile = () => {
    if (state.phase === 'COMPLETE') {
      handleOpenFile(state.result.outputPath);
    }
  };

  const canSelectExcel = state.phase !== 'PROCESSING';
  const canSelectImages = state.phase !== 'PROCESSING';

  const getExcelFile = () => {
    if (state.phase === 'IDLE' || state.phase === 'READY') {
      return state.excelFile || null;
    }
    return null;
  };

  const getImageSource = () => {
    if (state.phase === 'IDLE' || state.phase === 'READY') {
      return state.imageSource || null;
    }
    return null;
  };

  // 只有在两个文件都选择且验证通过时才能开始处理
  const isReadyToProcess = state.phase === 'READY' && state.excelFile && state.imageSource && excelValid && imageSourceValid;

  if (state.phase === 'PROCESSING' || state.phase === 'COMPLETE' || state.phase === 'ERROR') {
    const processingState = state.phase === 'PROCESSING' ? state : null;

    return (
      <div className={styles.app}>
        <div className={styles.mainCard}>
          <div className={styles.topBar}></div>
          <div className={styles.cardContent}>
            <ProcessingPage
              progress={processingState ? processingState.progress : 100}
              current={processingState ? processingState.current : ''}
              total={processingState?.total}
              result={state.phase === 'COMPLETE' ? state.result : undefined}
              error={state.phase === 'ERROR' ? state.error : undefined}
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
              value={getImageSource()}
              onChange={selectImages}
              isFolder={true}
              disabled={!canSelectImages}
              hint="支持：文件夹 / ZIP / RAR / 7Z"
              onValidationChange={setImageSourceValid}
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
              value={getExcelFile()}
              onChange={selectExcel}
              disabled={!canSelectExcel}
              hint="将自动匹配'商品编码'列，支持 .xlsx 格式"
              onValidationChange={setExcelValid}
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
