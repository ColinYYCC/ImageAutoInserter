export type AppState = {
    phase: 'IDLE';
} | {
    phase: 'READY';
    excelFile: FileInfo;
    imageSource?: FileInfo;
} | {
    phase: 'PROCESSING';
    excelFile: FileInfo;
    imageSource: FileInfo;
    progress: number;
    current: string;
} | {
    phase: 'COMPLETE';
    result: ProcessingResult;
} | {
    phase: 'ERROR';
    error: AppError;
};
export interface FileInfo {
    path: string;
    name: string;
    size: number;
    type: 'excel' | 'folder' | 'zip' | 'rar';
}
export interface ProcessingResult {
    total: number;
    success: number;
    failed: number;
    successRate: number;
    outputPath: string;
    errors: ProcessingError[];
}
export interface ProcessingError {
    row: number;
    productId: string;
    errorType: 'IMAGE_NOT_FOUND' | 'EXCEL_FORMULA_ERROR' | 'EMBED_ERROR';
    message: string;
}
export interface AppError {
    type: 'FILE_NOT_FOUND' | 'INVALID_FORMAT' | 'PROCESS_ERROR' | 'SYSTEM_ERROR';
    message: string;
    resolution: string;
}
export type AppAction = {
    type: 'SELECT_EXCEL';
    payload: FileInfo;
} | {
    type: 'SELECT_IMAGES';
    payload: FileInfo;
} | {
    type: 'START';
} | {
    type: 'PROGRESS';
    payload: {
        percent: number;
        current: string;
    };
} | {
    type: 'COMPLETE';
    payload: ProcessingResult;
} | {
    type: 'ERROR';
    payload: AppError;
} | {
    type: 'RESET';
};
export interface IPCMessage<T = any> {
    type: string;
    payload: T;
}
