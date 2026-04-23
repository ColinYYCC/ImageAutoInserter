import { create } from 'zustand';
import { FileInfo, AppError } from '../../shared/types';

export type AppPhase = 'IDLE' | 'READY' | 'VALIDATING' | 'PROCESSING' | 'COMPLETE' | 'ERROR';

export interface ProcessResult {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  outputPath: string;
}

interface AppState {
  phase: AppPhase;
  excelFile: FileInfo | undefined;
  imageSource: FileInfo | undefined;
  excelValidated: boolean;
  imageSourceValidated: boolean;
  progress: number;
  current: string;
  total: number;
  result: ProcessResult | undefined;
  error: AppError | undefined;
  setPhase: (phase: AppPhase) => void;
  setExcelFile: (file: FileInfo | undefined) => void;
  setImageSource: (source: FileInfo | undefined) => void;
  setExcelValidated: (validated: boolean) => void;
  setImageSourceValidated: (validated: boolean) => void;
  setProgress: (progress: number, current?: string, total?: number) => void;
  setResult: (result: ProcessResult) => void;
  setError: (error: AppError) => void;
  reset: () => void;
  canStartProcessing: () => boolean;
}

const initialState = {
  phase: 'IDLE' as AppPhase,
  excelFile: undefined as FileInfo | undefined,
  imageSource: undefined as FileInfo | undefined,
  excelValidated: false,
  imageSourceValidated: false,
  progress: 0,
  current: '',
  total: 0,
  result: undefined as ProcessResult | undefined,
  error: undefined as AppError | undefined,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  setExcelFile: (file) => {
    const imageSource = get().imageSource;
    const imageSourceValidated = get().imageSourceValidated;
    const newPhase: AppPhase = file && imageSource && imageSourceValidated ? 'READY' : 'IDLE';
    set({ excelFile: file, excelValidated: false, phase: newPhase });
  },

  setImageSource: (source) => {
    const excelFile = get().excelFile;
    const excelValidated = get().excelValidated;
    const newPhase: AppPhase = excelFile && source && excelValidated ? 'READY' : 'IDLE';
    set({ imageSource: source, imageSourceValidated: false, phase: newPhase });
  },

  setExcelValidated: (validated) => {
    const state = get();
    const canBeReady = validated && state.imageSource && state.excelFile;
    const newPhase: AppPhase = canBeReady ? 'READY' : state.phase === 'READY' ? 'IDLE' : state.phase;
    set({ excelValidated: validated, phase: newPhase });
  },

  setImageSourceValidated: (validated) => {
    const state = get();
    const canBeReady = validated && state.excelFile && state.imageSource;
    const newPhase: AppPhase = canBeReady ? 'READY' : state.phase === 'READY' ? 'IDLE' : state.phase;
    set({ imageSourceValidated: validated, phase: newPhase });
  },

  setProgress: (progress, current = '', total = 0) =>
    set({ progress, current, total }),

  setResult: (result) => {
    set({ phase: 'COMPLETE', result, progress: 100 });
  },

  setError: (error) =>
    set({ phase: 'ERROR', error }),

  reset: () => {
    // 完全重置所有状态，包括清空文件选择
    set({
      ...initialState,
    });
  },

  canStartProcessing: () => {
    const state = get();
    return (
      state.phase === 'READY' &&
      state.excelFile !== undefined &&
      state.imageSource !== undefined &&
      state.excelValidated === true &&
      state.imageSourceValidated === true
    );
  },
}));
