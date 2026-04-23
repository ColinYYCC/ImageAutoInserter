import { useCallback, useRef } from 'react';
import { useAppStore } from './useAppStore';

function debugLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[useProcessor]', ...args);
  }
}

export function useProcessor() {
  const phase = useAppStore((s) => s.phase);
  const excelFile = useAppStore((s) => s.excelFile);
  const imageSource = useAppStore((s) => s.imageSource);
  const { setPhase, setResult, setError, reset } = useAppStore();

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
    } catch (err) {
      console.error('取消失败:', err);
      return;
    }
    reset();
  }, [reset]);

  const handleOpenFile = useCallback(async (filePath: string) => {
    debugLog('handleOpenFile called with:', filePath);
    try {
      const result = await window.electronAPI.openFile(filePath);
      debugLog('openFile result:', result);
      if (!result.success && result.error) {
        debugLog('openFile error:', result.error);
        alert(`打开文件失败: ${result.error}`);
      }
    } catch (err) {
      console.error('打开文件失败:', err);
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