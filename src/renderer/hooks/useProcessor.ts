import { useCallback, useRef } from 'react';
import { useAppStore } from './useAppStore';
import { createLogger } from '../../shared/logger';

const logger = createLogger('useProcessor');

export function useProcessor() {
  const phase = useAppStore((s) => s.phase);
  const excelFile = useAppStore((s) => s.excelFile);
  const imageSource = useAppStore((s) => s.imageSource);
  const { setPhase, setResult, setError } = useAppStore();

  const stateRef = useRef({ phase, excelFile, imageSource });
  stateRef.current = { phase, excelFile, imageSource };

  const handleStart = useCallback(async () => {
    const currentState = stateRef.current;

    if (currentState.phase !== 'READY' || !currentState.excelFile || !currentState.imageSource) {
      return;
    }

    setPhase('PROCESSING');

    try {
      const result = await window.electronAPI.startProcess(
        currentState.excelFile.path,
        currentState.imageSource.path || ''
      );

      if (result.success && result.result) {
        setResult(result.result);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError({
        type: 'SYSTEM_ERROR',
        message: errorMessage || '处理过程中发生错误',
        resolution: '请重试'
      });
    }
  }, [setPhase, setResult, setError]);

  const handleCancel = useCallback(async () => {
    try {
      await window.electronAPI.cancelProcess();
      const { excelFile, imageSource } = useAppStore.getState();
      const newPhase = excelFile && imageSource ? 'READY' : 'IDLE';
      setPhase(newPhase);
    } catch (err) {
      logger.error('取消失败', { error: String(err) });
    }
  }, [setPhase]);

  const handleOpenFile = useCallback(async (filePath: string) => {
    logger.debug('handleOpenFile called', { filePath });
    try {
      const result = await window.electronAPI.openFile(filePath);
      logger.debug('openFile result', { result });
      if (!result.success && result.error) {
        logger.debug('openFile error', { error: result.error });
        alert(`打开文件失败: ${result.error}`);
      }
    } catch (err) {
      logger.error('打开文件失败', { error: String(err) });
      alert(`打开文件失败: ${err}`);
    }
  }, []);

  return {
    handleStart,
    handleCancel,
    handleOpenFile,
    isProcessing: phase === 'PROCESSING',
  };
}