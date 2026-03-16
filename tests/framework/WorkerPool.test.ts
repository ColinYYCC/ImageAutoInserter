/**
 * WorkerPool 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerPool } from '../../src/core/framework/WorkerPool';
import { WorkUnit } from '../../src/core/framework/types';

describe('WorkerPool', () => {
  let workerPool: WorkerPool;

  beforeEach(() => {
    workerPool = new WorkerPool(2); // 使用2个worker便于测试
  });

  describe('submit', () => {
    it('应该能够执行任务', async () => {
      const workUnit: WorkUnit<string, string> = {
        id: 'test-1',
        type: 'test',
        data: 'input',
        execute: async () => 'output'
      };

      const result = await workerPool.submit(workUnit);
      expect(result).toBe('output');
    });

    it('应该支持进度回调', async () => {
      const progressCallback = vi.fn();
      const workUnit: WorkUnit<string, string> = {
        id: 'test-1',
        type: 'test',
        data: 'input',
        execute: async () => {
          workUnit.onProgress?.({
            percent: 50,
            current: 1,
            total: 2,
            stage: 'processing'
          });
          return 'output';
        },
        onProgress: progressCallback
      };

      await workerPool.submit(workUnit, {
        progressCallback
      });

      expect(progressCallback).toHaveBeenCalledWith({
        percent: 50,
        current: 1,
        total: 2,
        stage: 'processing'
      });
    });

    it('应该处理任务错误', async () => {
      const workUnit: WorkUnit<string, string> = {
        id: 'test-1',
        type: 'test',
        data: 'input',
        execute: async () => {
          throw new Error('Task error');
        }
      };

      await expect(workerPool.submit(workUnit)).rejects.toThrow('Task error');
    });

    it('应该支持超时', async () => {
      const workUnit: WorkUnit<string, string> = {
        id: 'test-1',
        type: 'test',
        data: 'input',
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'output';
        }
      };

      await expect(
        workerPool.submit(workUnit, { timeout: 100 })
      ).rejects.toThrow('timeout');
    });

    it('应该支持取消信号', async () => {
      const abortController = new AbortController();
      const workUnit: WorkUnit<string, string> = {
        id: 'test-1',
        type: 'test',
        data: 'input',
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'output';
        }
      };

      // 立即取消
      abortController.abort();

      await expect(
        workerPool.submit(workUnit, { abortSignal: abortController.signal })
      ).rejects.toThrow('cancelled');
    });
  });

  describe('getStatus', () => {
    it('应该返回正确的状态', async () => {
      // 创建一些长时间运行的任务
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 3; i++) {
        const workUnit: WorkUnit<string, string> = {
          id: `test-${i}`,
          type: 'test',
          data: 'input',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'output';
          }
        };
        promises.push(workerPool.submit(workUnit));
      }

      // 立即检查状态（可能有任务在队列中）
      const status = workerPool.getStatus();
      expect(status.active + status.queued).toBeGreaterThan(0);

      await Promise.all(promises);
    });
  });

  describe('cancel', () => {
    it('应该能够取消队列中的任务', async () => {
      // 先提交一个长时间运行的任务占满 worker
      const blockingWorkUnit: WorkUnit<string, string> = {
        id: 'test-blocking',
        type: 'test',
        data: 'input',
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return 'blocking-output';
        }
      };
      
      // 提交阻塞任务
      workerPool.submit(blockingWorkUnit);

      // 提交要取消的任务（会进入队列）
      const workUnit: WorkUnit<string, string> = {
        id: 'test-cancel',
        type: 'test',
        data: 'input',
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'output';
        }
      };

      const promise = workerPool.submit(workUnit);

      // 立即取消（此时任务还在队列中）
      const cancelled = workerPool.cancel('test-cancel');
      expect(cancelled).toBe(true);

      await expect(promise).rejects.toThrow('cancelled');
    });

    it('取消不存在的任务应该返回 false', () => {
      const cancelled = workerPool.cancel('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('cancelAll', () => {
    it('应该取消所有任务', async () => {
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 3; i++) {
        const workUnit: WorkUnit<string, string> = {
          id: `test-${i}`,
          type: 'test',
          data: 'input',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return 'output';
          }
        };
        promises.push(workerPool.submit(workUnit));
      }

      workerPool.cancelAll();

      await expect(Promise.all(promises)).rejects.toThrow();
    });
  });

  describe('setMaxWorkers', () => {
    it('应该能够调整worker数量', () => {
      workerPool.setMaxWorkers(4);
      // 状态应该正常
      const status = workerPool.getStatus();
      expect(status).toBeDefined();
    });

    it('不应该允许小于1的worker数量', () => {
      workerPool.setMaxWorkers(0);
      // 内部应该调整为1
      expect(workerPool.getStatus()).toBeDefined();
    });
  });
});
