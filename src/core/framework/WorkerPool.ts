/**
 * 工作线程池
 * 管理异步任务执行，避免主线程阻塞
 */
import { WorkUnit, ProcessingOptions, ProgressInfo } from './types';

interface WorkerTask<T = any, R = any> {
  unit: WorkUnit<T, R>;
  resolve: (value: R) => void;
  reject: (reason: any) => void;
  options: ProcessingOptions;
  startTime: number;
}

export class WorkerPool {
  private maxWorkers: number;
  private queue: WorkerTask[] = [];
  private activeWorkers: number = 0;
  private taskMap: Map<string, AbortController> = new Map();

  constructor(maxWorkers: number = 4) {
    this.maxWorkers = maxWorkers;
  }

  /**
   * 提交任务到线程池
   */
  async submit<T, R>(
    unit: WorkUnit<T, R>,
    options: ProcessingOptions = {}
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        unit,
        resolve,
        reject,
        options,
        startTime: Date.now()
      };

      // 创建 AbortController 用于取消任务
      const abortController = new AbortController();
      this.taskMap.set(unit.id, abortController);

      // 检查是否已取消
      if (options.abortSignal?.aborted) {
        this.taskMap.delete(unit.id);
        reject(new Error('Task cancelled before execution'));
        return;
      }

      // 监听外部取消信号
      options.abortSignal?.addEventListener('abort', () => {
        this.cancel(unit.id);
      });

      this.queue.push(task);
      this.processQueue();
    });
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    if (this.activeWorkers >= this.maxWorkers || this.queue.length === 0) {
      return;
    }

    this.activeWorkers++;
    const task = this.queue.shift();

    if (!task) {
      this.activeWorkers--;
      return;
    }

    // 从 taskMap 获取 AbortController
    const abortController = this.taskMap.get(task.unit.id);
    if (!abortController) {
      // 任务已被取消
      this.activeWorkers--;
      this.processQueue();
      return;
    }

    try {
      // 检查是否已取消
      if (abortController.signal.aborted) {
        task.reject(new Error('Task cancelled'));
        this.taskMap.delete(task.unit.id);
        this.activeWorkers--;
        this.processQueue();
        return;
      }

      // 设置超时
      const timeout = task.options.timeout || 30000;
      let isTimeout = false;
      const timeoutId = setTimeout(() => {
        isTimeout = true;
        this.cancel(task.unit.id);
      }, timeout);

      // 监听取消信号
      const abortHandler = () => {
        clearTimeout(timeoutId);
        if (isTimeout) {
          task.reject(new Error(`Task timeout after ${timeout}ms`));
        } else {
          task.reject(new Error('Task cancelled'));
        }
      };
      abortController.signal.addEventListener('abort', abortHandler, { once: true });

      // 包装进度回调
      const wrappedUnit = {
        ...task.unit,
        onProgress: (progress: ProgressInfo) => {
          task.unit.onProgress?.(progress);
          task.options.progressCallback?.(progress);
        }
      };

      // 执行任务
      const result = await wrappedUnit.execute();
      clearTimeout(timeoutId);
      abortController.signal.removeEventListener('abort', abortHandler);

      // 检查是否已取消（执行完成后）
      if (abortController.signal.aborted) {
        task.reject(new Error('Task cancelled'));
        this.taskMap.delete(task.unit.id);
        this.activeWorkers--;
        this.processQueue();
        return;
      }

      // 记录指标
      const duration = Date.now() - task.startTime;
      console.log(`[WorkerPool] Task ${task.unit.id} completed in ${duration}ms`);

      this.taskMap.delete(task.unit.id);
      task.resolve(result);
    } catch (error) {
      this.taskMap.delete(task.unit.id);
      task.reject(error);
    } finally {
      this.activeWorkers--;
      // 继续处理队列
      this.processQueue();
    }
  }

  /**
   * 取消指定任务
   */
  cancel(taskId: string): boolean {
    const controller = this.taskMap.get(taskId);
    if (controller) {
      controller.abort();
      this.taskMap.delete(taskId);
      return true;
    }

    // 从队列中移除
    const index = this.queue.findIndex(t => t.unit.id === taskId);
    if (index > -1) {
      const task = this.queue.splice(index, 1)[0];
      task.reject(new Error('Task cancelled'));
      return true;
    }

    return false;
  }

  /**
   * 取消所有任务
   */
  cancelAll(): void {
    // 取消活动任务
    this.taskMap.forEach((controller, id) => {
      controller.abort();
    });
    this.taskMap.clear();

    // 清空队列
    this.queue.forEach(task => {
      task.reject(new Error('All tasks cancelled'));
    });
    this.queue = [];
  }

  /**
   * 获取当前状态
   */
  getStatus(): { active: number; queued: number; total: number } {
    return {
      active: this.activeWorkers,
      queued: this.queue.length,
      total: this.activeWorkers + this.queue.length
    };
  }

  /**
   * 调整线程池大小
   */
  setMaxWorkers(size: number): void {
    this.maxWorkers = Math.max(1, size);
    // 触发队列处理
    this.processQueue();
  }
}

// 全局工作线程池实例
export const globalWorkerPool = new WorkerPool(4);
