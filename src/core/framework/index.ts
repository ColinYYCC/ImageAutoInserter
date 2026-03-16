/**
 * 文件处理框架 - 统一导出
 * 提供模块化、可扩展的文件处理能力
 */

// 类型定义
export * from './types';

// 核心组件
export { EventBus, globalEventBus } from './EventBus';
export { WorkerPool, globalWorkerPool } from './WorkerPool';
export { HandlerRegistry, globalHandlerRegistry } from './HandlerRegistry';
export {
  FileProcessingOrchestrator,
  defaultOrchestrator,
  type OrchestratorConfig
} from './FileProcessingOrchestrator';

// 处理器
export { ExcelHandler, excelHandler } from './handlers/ExcelHandler';

// 简化版组件（推荐用于方案 B）
export {
  SimpleAsyncValidator,
  simpleAsyncValidator,
  type ValidationFunction,
  type AsyncValidatorConfig
} from './SimpleAsyncValidator';

export {
  validateExcelOptimized,
  processExcelOptimized,
  type OptimizedExcelOptions
} from './OptimizedExcelHandler';

// 自适应处理器（支持任意大小文件）
export {
  validateExcelAdaptive,
  getProcessingStrategy,
  getFileSizeCategory,
  formatFileSize,
  canProcessFile,
  DEFAULT_ADAPTIVE_CONFIG,
  type AdaptiveConfig,
  type ProcessingStrategy
} from './AdaptiveFileProcessor';

// 版本信息
export const FRAMEWORK_VERSION = '1.0.0';
