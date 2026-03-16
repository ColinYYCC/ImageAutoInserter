import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { AppState, AppAction, FileInfo, ProcessingResult, AppError } from '../../shared/types';

const initialState: AppState = { phase: 'IDLE' };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_EXCEL':
      console.log('[useAppState] SELECT_EXCEL action, payload:', action.payload);
      if (state.phase === 'IDLE') {
        if (state.imageSource) {
          console.log('[useAppState] Transition IDLE -> READY (excel selected, imageSource exists)');
          return { phase: 'READY', excelFile: action.payload, imageSource: state.imageSource };
        }
        return { ...state, excelFile: action.payload };
      }
      if (state.phase === 'READY') {
        return { ...state, excelFile: action.payload };
      }
      return state;
        
    case 'SELECT_IMAGES':
      console.log('[useAppState] SELECT_IMAGES action, payload:', action.payload);
      if (state.phase === 'IDLE') {
        if (state.excelFile) {
          console.log('[useAppState] Transition IDLE -> READY (images selected, excelFile exists)');
          return { phase: 'READY', excelFile: state.excelFile, imageSource: action.payload };
        }
        return { ...state, imageSource: action.payload };
      }
      if (state.phase === 'READY') {
        return { ...state, imageSource: action.payload };
      }
      return state;
        
    case 'CLEAR_EXCEL':
      console.log('[useAppState] CLEAR_EXCEL action');
      if (state.phase === 'IDLE' || state.phase === 'READY') {
        if (state.imageSource) {
          return { phase: 'IDLE', excelFile: undefined, imageSource: state.imageSource };
        }
        return { phase: 'IDLE', excelFile: undefined };
      }
      return state;
        
    case 'CLEAR_IMAGES':
      console.log('[useAppState] CLEAR_IMAGES action');
      if (state.phase === 'IDLE' || state.phase === 'READY') {
        if (state.excelFile) {
          return { phase: 'IDLE', excelFile: state.excelFile, imageSource: undefined };
        }
        return { phase: 'IDLE', imageSource: undefined };
      }
      return state;
        
    case 'START':
      console.log('[useAppState] START action, current state:', { 
        phase: state.phase, 
        hasExcel: !!state.excelFile, 
        hasImageSource: !!state.imageSource 
      });
      return state.phase === 'READY' && state.excelFile && state.imageSource
        ? { phase: 'PROCESSING', excelFile: state.excelFile, imageSource: state.imageSource, progress: 0, current: '正在初始化...', total: undefined }
        : state;
        
    case 'PROGRESS':
      return state.phase === 'PROCESSING'
        ? { ...state, progress: action.payload.percent, current: action.payload.current, total: action.payload.total ?? state.total }
        : state;
        
    case 'COMPLETE':
      return { 
        phase: 'COMPLETE', 
        result: action.payload,
        excelFile: state.phase === 'PROCESSING' ? state.excelFile : undefined,
        imageSource: state.phase === 'PROCESSING' ? state.imageSource : undefined
      };
      
    case 'ERROR':
      return { 
        phase: 'ERROR', 
        error: action.payload,
        excelFile: state.phase === 'PROCESSING' ? state.excelFile : undefined,
        imageSource: state.phase === 'PROCESSING' ? state.imageSource : undefined
      };
      
    case 'RESET':
      return initialState;
      
    default:
      return state;
  }
}

type AppContextType = {
  state: AppState;
  selectExcel: (file: FileInfo | null) => void;
  selectImages: (file: FileInfo | null) => void;
  startProcessing: () => void;
  updateProgress: (percent: number, current: string, total?: number) => void;
  completeProcessing: (result: ProcessingResult) => void;
  handleError: (error: AppError) => void;
  reset: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const selectExcel = useCallback((file: FileInfo | null) => {
    if (file) {
      dispatch({ type: 'SELECT_EXCEL', payload: file });
    } else {
      dispatch({ type: 'CLEAR_EXCEL' });
    }
  }, []);

  const selectImages = useCallback((file: FileInfo | null) => {
    if (file) {
      dispatch({ type: 'SELECT_IMAGES', payload: file });
    } else {
      dispatch({ type: 'CLEAR_IMAGES' });
    }
  }, []);

  const startProcessing = useCallback(() => {
    dispatch({ type: 'START' });
  }, []);

  const updateProgress = useCallback((percent: number, current: string, total?: number) => {
    dispatch({ type: 'PROGRESS', payload: { percent, current, total } });
  }, []);

  const completeProcessing = useCallback((result: ProcessingResult) => {
    dispatch({ type: 'COMPLETE', payload: result });
  }, []);

  const handleError = useCallback((error: AppError) => {
    dispatch({ type: 'ERROR', payload: error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <AppContext.Provider value={{ state, selectExcel, selectImages, startProcessing, updateProgress, completeProcessing, handleError, reset }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
