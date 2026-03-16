/**
 * 文件处理编排器
 * 核心协调组件，统一管理文件选择、验证和处理流程
 */
import {
  FileInfo,
  ValidationResult,
  ProcessingResult,
  ProcessingOptions,
  FileType,
  WorkUnit
} from './types';
import { HandlerRegistry } from './HandlerRegistry';
import { WorkerPool } from './WorkerPool';
import { EventBus } from './EventBus';

export interface OrchestratorConfig {
  enableAsyncValidation: boolean;
  validationDelay: number;
  maxFileSize: number;
  supportedTypes: FileType[];
}

export class FileProcessingOrchestrator {
  private registry: HandlerRegistry;
  private workerPool: WorkerPool;
  private eventBus: EventBus;
  private config: OrchestratorConfig;

  constructor(
    registry: HandlerRegistry,
    workerPool: WorkerPool,
    eventBus: EventBus,
    config: Partial<OrchestratorConfig> = {}
  ) {
    this.registry = registry;
    this.workerPool = workerPool;
    this.eventBus = eventBus;
    this.config = {
      enableAsyncValidation: true,
      validationDelay: 0,
      maxFileSize: 500 * 1024 * 1024, // 500MB
      supportedTypes: Object.values(FileType),
      ...config
    };
  }

  /**
   * 创建文件信息对象
   */
  createFileInfo(path: string, name: string, size: number, type: FileType): FileInfo {
    return {
      path,
      name,
      size,
      type,
      extension: name.split('.').pop()?.toLowerCase() || '',
      lastModified: Date.now()
    };
  }

  /**
   * 快速验证（同步检查）
   * 只进行基本的文件存在性和大小检查
   */
  quickValidate(fileInfo: FileInfo): ValidationResult {
    // 检查文件大小
    if (fileInfo.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `文件大小超过限制 (${this.formatFileSize(this.config.maxFileSize)})`,
        resolution: '请选择更小的文件或联系管理员调整限制'
      };
    }

    // 检查文件类型
    if (!this.config.supportedTypes.includes(fileInfo.type)) {
      return {
        valid: false,
        error: `不支持的文件类型: ${fileInfo.type}`,
        resolution: `支持的类型: ${this.config.supportedTypes.join(', ')}`
      };
    }

    // 检查是否有处理器
    if (!this.registry.hasHandler(fileInfo)) {
      return {
        valid: false,
        error: '没有可用的处理器处理此文件',
        resolution: '请检查文件格式或更新应用程序'
      };
    }

    return { valid: true };
  }

  /**
   * 完整验证（异步）
   * 执行深度验证，包括文件内容检查
   */
  async validate(
    fileInfo: FileInfo,
    options: ProcessingOptions = {}
  ): Promise<ValidationResult> {
    // 首先快速验证
    const quickResult = this.quickValidate(fileInfo);
    if (!quickResult.valid) {
      await this.eventBus.emit('file:validated', { fileInfo, result: quickResult });
      return quickResult;
    }

    // 查找处理器
    const handler = this.registry.findHandler(fileInfo);
    if (!handler) {
      const result: ValidationResult = {
        valid: false,
        error: '找不到合适的处理器'
      };
      await this.eventBus.emit('file:validated', { fileInfo, result });
      return result;
    }

    // 异步执行深度验证
    if (this.config.enableAsyncValidation) {
      const workUnit: WorkUnit<FileInfo, ValidationResult> = {
        id: `validate-${fileInfo.path}-${Date.now()}`,
        type: 'validation',
        data: fileInfo,
        execute: async () => {
          return await handler.validate(fileInfo, options);
        },
        onProgress: (progress) => {
          options.progressCallback?.(progress);
        }
      };

      try {
        const result = await this.workerPool.submit(workUnit, options);
        await this.eventBus.emit('file:validated', { fileInfo, result });
        return result;
      } catch (error) {
        const result: ValidationResult = {
          valid: false,
          error: error instanceof Error ? error.message : '验证失败'
        };
        await this.eventBus.emit('file:validated', { fileInfo, result });
        return result;
      }
    } else {
      // 同步验证
      const result = await handler.validate(fileInfo, options);
      await this.eventBus.emit('file:validated', { fileInfo, result });
      return result;
    }
  }

  /**
   * 处理文件
   */
  async process(
    fileInfo: FileInfo,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    // 查找处理器
    const handler = this.registry.findHandler(fileInfo);
    if (!handler) {
      const result: ProcessingResult = {
        success: false,
        error: {
          code: 'NO_HANDLER',
          message: '找不到合适的处理器'
        }
      };
      await this.eventBus.emit('processing:failed', { fileInfo, result });
      return result;
    }

    // 触发开始事件
    await this.eventBus.emit('processing:started', { fileInfo });

    // 创建工作单元
    const workUnit: WorkUnit<FileInfo, ProcessingResult> = {
      id: `process-${fileInfo.path}-${Date.now()}`,
      type: 'processing',
      data: fileInfo,
      execute: async () => {
        return await handler.process(fileInfo, options);
      },
      onProgress: (progress) => {
        this.eventBus.emit('processing:progress', { fileInfo, progress });
        options.progressCallback?.(progress);
      }
    };

    try {
      const result = await this.workerPool.submit(workUnit, options);

      if (result.success) {
        await this.eventBus.emit('processing:completed', { fileInfo, result });
      } else {
        await this.eventBus.emit('processing:failed', { fileInfo, result });
      }

      return result;
    } catch (error) {
      const result: ProcessingResult = {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : '处理失败',
          stack: error instanceof Error ? error.stack : undefined
        }
      };
      await this.eventBus.emit('processing:failed', { fileInfo, result });
      return result;
    }
  }

  /**
   * 延迟验证（用于文件选择后立即显示UI的场景）
   */
  async validateWithDelay(
    fileInfo: FileInfo,
    delay: number = this.config.validationDelay,
    options: ProcessingOptions = {}
  ): Promise<ValidationResult> {
    // 立即返回快速验证结果
    const quickResult = this.quickValidate(fileInfo);
    if (!quickResult.valid) {
      return quickResult;
    }

    // 延迟执行深度验证
    return new Promise((resolve) => {
      setTimeout(async () => {
        const result = await this.validate(fileInfo, options);
        resolve(result);
      }, delay);
    });
  }

  /**
   * 取消处理
   */
  cancel(taskId: string): boolean {
    return this.workerPool.cancel(taskId);
  }

  /**
   * 取消所有处理
   */
  cancelAll(): void {
    this.workerPool.cancelAll();
  }

  /**
   * 获取状态
   */
  getStatus(): { workers: { active: number; queued: number }; handlers: number } {
    return {
      workers: this.workerPool.getStatus(),
      handlers: this.registry.getStats().handlers
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 默认编排器实例
export const defaultOrchestrator = new FileProcessingOrchestrator(
  HandlerRegistry.prototype.constructor.name === 'HandlerRegistry'
    ? new HandlerRegistry()
    : new HandlerRegistry(),
  WorkerPool.prototype.constructor.name === 'WorkerPool'
    ? new WorkerPool()
    : new WorkerPool(),
  EventBus.prototype.constructor.name === 'EventBus'
    ? new EventBus()
    : new EventBus()
);
