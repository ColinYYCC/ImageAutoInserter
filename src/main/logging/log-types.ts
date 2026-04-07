/**
 * 日志类型定义
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4,
}

export enum LogSource {
  MAIN = 'main',
  RENDERER = 'renderer',
  PYTHON = 'python',
  SYSTEM = 'system',
}

export interface LogEntry {
  id: string;
  timestamp: number;
  datetime: string;
  level: LogLevel;
  levelStr: string;
  module: string;
  source: LogSource;
  message: string;
  data?: unknown;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface LogFilter {
  level?: LogLevel;
  levelMin?: LogLevel;
  levelMax?: LogLevel;
  modules?: string[];
  sources?: LogSource[];
  startTime?: number;
  endTime?: number;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<number, number>;
  byModule: Record<string, number>;
  bySource: Record<string, number>;
  timeRange: {
    start: number;
    end: number;
  };
  errorRate: number;
}

export interface LogModule {
  name: string;
  displayName: string;
  color: string;
}

export const DEFAULT_LOG_MODULES: LogModule[] = [
  { name: 'app', displayName: '应用', color: '#4A90D9' },
  { name: 'main', displayName: '主进程', color: '#27AE60' },
  { name: 'renderer', displayName: '渲染进程', color: '#9B59B6' },
  { name: 'python', displayName: 'Python', color: '#F39C12' },
  { name: 'ipc', displayName: 'IPC通信', color: '#1ABC9C' },
  { name: 'file', displayName: '文件处理', color: '#E74C3C' },
  { name: 'process', displayName: '进程管理', color: '#3498DB' },
  { name: 'update', displayName: '更新', color: '#E67E22' },
  { name: 'performance', displayName: '性能', color: '#2ECC71' },
  { name: 'security', displayName: '安全', color: '#E74C3C' },
];

export const LOG_LEVEL_COLORS: Record<number, string> = {
  [LogLevel.DEBUG]: '#95A5A6',
  [LogLevel.INFO]: '#3498DB',
  [LogLevel.WARN]: '#F39C12',
  [LogLevel.ERROR]: '#E74C3C',
};

export const LOG_LEVEL_NAMES: Record<number, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};
