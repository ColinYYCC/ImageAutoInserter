import { useCallback } from 'react';
import { FileInfo } from '../../shared/types';

/**
 * 文件选择自定义 Hook
 * @param onSelect 文件选择后的回调函数
 * @returns 文件处理方法
 */
export function useFilePicker(
  onSelect: (file: FileInfo | null) => void
) {
  const handleSelectFile = useCallback(async (
    accept: string,
    title: string
  ) => {
    try {
      const file = await window.electronAPI.selectFile(accept, title);
      if (file) {
        onSelect(file);
      }
    } catch (error) {
      console.error('文件选择失败:', error);
    }
  }, [onSelect]);

  const handleClear = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return {
    handleSelectFile,
    handleClear,
  };
}
