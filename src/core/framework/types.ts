/**
 * 核心类型定义
 * 提供整个框架的基础类型支持
 */

// 文件类型枚举
export enum FileType {
  EXCEL = 'excel',
  ZIP = 'zip',
  RAR = 'rar',
  SEVEN_ZIP = '7z',
  FOLDER = 'folder',
  IMAGE = 'image',
  UNKNOWN = 'unknown'
}

// 处理状态
export enum ProcessingStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 文件信息接口
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: FileType;
  extension: string;
  lastModified?: number;
}

// 验证结果
export interface ValidationResult {
  valid: boolean;
  error?: string;
  resolution?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

// 处理结果
export interface ProcessingResult<T = any> {
  success: boolean;
  data?: T;
  error?: ProcessingError;
  metrics?: ProcessingMetrics;
}

// 处理错误
export interface ProcessingError {
  code: string;
  message: string;
  resolution?: string;
  stack?: string;
}

// 处理指标
export interface ProcessingMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: number;
  throughput?: number;
}

// 处理选项
export interface ProcessingOptions {
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
  maxRetries?: number;
  abortSignal?: AbortSignal;
  progressCallback?: (progress: ProgressInfo) => void;
}

// 进度信息
export interface ProgressInfo {
  percent: number;
  current: number;
  total: number;
  stage: string;
  message?: string;
}

// 处理器配置
export interface HandlerConfig {
  name: string;
  supportedTypes: FileType[];
  maxFileSize?: number;
  allowedExtensions?: string[];
  options?: Record<string, any>;
}

// 事件类型
export type FrameworkEventType = 
  | 'file:selected'
  | 'file:validated'
  | 'processing:started'
  | 'processing:progress'
  | 'processing:completed'
  | 'processing:failed'
  | 'processing:cancelled'
  | 'error:occurred';

// 事件处理器
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

// 插件接口
export interface Plugin {
  name: string;
  version: string;
  install: (context: PluginContext) => void;
  uninstall?: () => void;
}

// 插件上下文
export interface PluginContext {
  registerHandler: (handler: FileHandler) => void;
  unregisterHandler: (handlerName: string) => void;
  emit: (event: FrameworkEventType, data: any) => void;
  on: (event: FrameworkEventType, handler: EventHandler) => void;
}

// 文件处理器接口
export interface FileHandler {
  readonly config: HandlerConfig;
  canHandle: (fileInfo: FileInfo) => boolean;
  validate: (fileInfo: FileInfo, options?: ProcessingOptions) => Promise<ValidationResult>;
  process: (fileInfo: FileInfo, options?: ProcessingOptions) => Promise<ProcessingResult>;
}

// 工作单元
export interface WorkUnit<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  execute: () => Promise<R>;
  onProgress?: (progress: ProgressInfo) => void;
}

// 安全策略
export interface SecurityPolicy {
  maxFileSize: number;
  allowedExtensions: string[];
  blockedPaths: string[];
  requireValidation: boolean;
  sandboxEnabled: boolean;
}
