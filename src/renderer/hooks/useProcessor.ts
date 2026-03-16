import { useCallback, useRef } from 'react';
import { useAppState } from './useAppState';

/**
 * 处理器自定义 Hook
 * @returns 处理方法
 */
export function useProcessor() {
  const { state, startProcessing, completeProcessing, handleError, reset } = useAppState();
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * 开始处理
   */
  const handleStart = useCallback(async () => {
    const currentState = stateRef.current;
    console.log('[useProcessor] handleStart called, phase:', currentState.phase);
    console.log('[useProcessor] excelFile:', currentState.excelFile);
    console.log('[useProcessor] imageSource:', currentState.imageSource);
    
    if (currentState.phase !== 'READY' || !currentState.excelFile || !currentState.imageSource) {
      console.log('[useProcessor] Not ready to process');
      return;
    }

    startProcessing();
    
    console.log('[useProcessor] Calling electronAPI.startProcess');
    
    try {
      const result = await window.electronAPI.startProcess(
        currentState.excelFile.path,
        currentState.imageSource?.path || ''
      );

      if (result.success) {
        completeProcessing(result.result);
      } else {
        handleError(result.error);
      }
    } catch (err) {
      console.error('处理失败:', err);
      handleError({
        type: 'SYSTEM_ERROR',
        message: '处理过程中发生错误',
        resolution: '请重试'
      });
    }
  }, [startProcessing, completeProcessing, handleError]);

  /**
   * 取消处理
   */
  const handleCancel = useCallback(async () => {
    try {
      await window.electronAPI.cancelProcess();
      reset();
    } catch (err) {
      console.error('取消失败:', err);
    }
  }, [reset]);

  /**
   * 打开文件
   * @param filePath 文件路径
   */
  const handleOpenFile = useCallback(async (filePath: string) => {
    try {
      await window.electronAPI.openFile(filePath);
    } catch (err) {
      console.error('打开文件失败:', err);
    }
  }, []);

  return {
    handleStart,
    handleCancel,
    handleOpenFile,
    isProcessing: state.phase === 'PROCESSING',
  };
}
