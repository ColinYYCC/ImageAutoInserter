/**
 * 重试处理器单元测试
 * 测试覆盖：重试逻辑、熔断器、错误恢复等
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withRetry,
  isRetryableError,
  calculateDelay,
  sleep,
  CircuitBreaker,
  ErrorRecoveryManager,
  RetryConfig,
} from '../../src/main/retry-handler';

describe('RetryHandler - 重试处理器测试', () => {
  describe('isRetryableError - 可重试错误检测', () => {
    it('应识别网络超时错误为可重试', () => {
      const error = new Error('Connection timeout') as any;
      error.code = 'ETIMEDOUT';
      expect(isRetryableError(error)).toBe(true);
    });

    it('应识别连接重置错误为可重试', () => {
      const error = new Error('Connection reset') as any;
      error.code = 'ECONNRESET';
      expect(isRetryableError(error)).toBe(true);
    });

    it('应识别连接拒绝错误为可重试', () => {
      const error = new Error('Connection refused') as any;
      error.code = 'ECONNREFUSED';
      expect(isRetryableError(error)).toBe(true);
    });

    it('应识别DNS查找失败为可重试', () => {
      const error = new Error('DNS lookup failed') as any;
      error.code = 'ENOTFOUND';
      expect(isRetryableError(error)).toBe(true);
    });

    it('应识别临时失败为可重试', () => {
      const error = new Error('Temporary failure, try again');
      expect(isRetryableError(error)).toBe(true);
    });

    it('不应将逻辑错误识别为可重试', () => {
      const error = new Error('Invalid argument');
      expect(isRetryableError(error)).toBe(false);
    });

    it('不应将语法错误识别为可重试', () => {
      const error = new Error('Syntax error');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('calculateDelay - 延迟计算', () => {
    const config: RetryConfig = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      retryableErrors: [],
    };

    it('第一次重试应使用初始延迟', () => {
      const delay = calculateDelay(1, config);
      expect(delay).toBe(1000);
    });

    it('第二次重试应使用指数退避', () => {
      const delay = calculateDelay(2, config);
      expect(delay).toBe(2000);
    });

    it('第三次重试应使用指数退避', () => {
      const delay = calculateDelay(3, config);
      expect(delay).toBe(4000);
    });

    it('延迟不应超过最大值', () => {
      const configWithSmallMax: RetryConfig = {
        ...config,
        maxDelayMs: 3000,
      };
      const delay = calculateDelay(5, configWithSmallMax);
      expect(delay).toBe(3000);
    });
  });

  describe('sleep - 延迟函数', () => {
    it('应在指定时间后resolve', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });

  describe('withRetry - 重试包装器', () => {
    it('成功时应立即返回结果', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('可重试错误时应进行重试', async () => {
      const error = new Error('Temporary failure') as any;
      error.code = 'ECONNRESET';

      const fn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await withRetry(fn, { initialDelayMs: 10 });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('超过最大重试次数应失败', async () => {
      const error = new Error('Temporary failure') as any;
      error.code = 'ECONNRESET';

      const fn = vi.fn().mockRejectedValue(error);

      const result = await withRetry(fn, {
        maxAttempts: 2,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('不可重试错误应立即失败', async () => {
      const error = new Error('Logic error');
      const fn = vi.fn().mockRejectedValue(error);

      const result = await withRetry(fn);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应记录总耗时', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);

      expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('CircuitBreaker - 熔断器', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(3, 1000);
    });

    it('初始状态应为关闭', () => {
      const state = circuitBreaker.getState();
      expect(state.isOpen).toBe(false);
      expect(state.failureCount).toBe(0);
    });

    it('成功执行应重置失败计数', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(fn);

      const state = circuitBreaker.getState();
      expect(state.failureCount).toBe(0);
    });

    it('连续失败应打开熔断器', async () => {
      const error = new Error('Failed');
      const fn = vi.fn().mockRejectedValue(error);

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // 预期会抛出错误
        }
      }

      const state = circuitBreaker.getState();
      expect(state.isOpen).toBe(true);
      expect(state.failureCount).toBe(3);
    });

    it('熔断器打开时应拒绝执行', async () => {
      const error = new Error('Failed');
      const fn = vi.fn().mockRejectedValue(error);

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // 预期会抛出错误
        }
      }

      // 熔断器已打开
      const successFn = vi.fn().mockResolvedValue('success');
      await expect(circuitBreaker.execute(successFn)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('超时后熔断器应允许半开状态', async () => {
      const error = new Error('Failed');
      const fn = vi.fn().mockRejectedValue(error);

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // 预期会抛出错误
        }
      }

      // 等待超时
      await sleep(1100);

      // 应该允许执行
      const successFn = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(successFn);
      expect(result).toBe('success');
    });

    it('重置应清除所有状态', async () => {
      const error = new Error('Failed');
      const fn = vi.fn().mockRejectedValue(error);

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // 预期会抛出错误
        }
      }

      circuitBreaker.reset();

      const state = circuitBreaker.getState();
      expect(state.isOpen).toBe(false);
      expect(state.failureCount).toBe(0);
    });
  });

  describe('ErrorRecoveryManager - 错误恢复管理器', () => {
    let recoveryManager: ErrorRecoveryManager;

    beforeEach(() => {
      recoveryManager = ErrorRecoveryManager.getInstance();
      recoveryManager.clearStrategies();
    });

    it('应为单例模式', () => {
      const instance1 = ErrorRecoveryManager.getInstance();
      const instance2 = ErrorRecoveryManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('应注册恢复策略', async () => {
      const strategy = vi.fn().mockResolvedValue(true);
      recoveryManager.registerStrategy('network_error', strategy);

      const result = await recoveryManager.recover('network_error');
      expect(result).toBe(true);
      expect(strategy).toHaveBeenCalled();
    });

    it('未注册的策略应返回false', async () => {
      const result = await recoveryManager.recover('unknown_error');
      expect(result).toBe(false);
    });

    it('恢复失败应返回false', async () => {
      const strategy = vi.fn().mockRejectedValue(new Error('Recovery failed'));
      recoveryManager.registerStrategy('test_error', strategy);

      const result = await recoveryManager.recover('test_error');
      expect(result).toBe(false);
    });

    it('应支持多个恢复策略', async () => {
      const strategy1 = vi.fn().mockResolvedValue(true);
      const strategy2 = vi.fn().mockResolvedValue(true);

      recoveryManager.registerStrategy('error1', strategy1);
      recoveryManager.registerStrategy('error2', strategy2);

      await recoveryManager.recover('error1');
      await recoveryManager.recover('error2');

      expect(strategy1).toHaveBeenCalled();
      expect(strategy2).toHaveBeenCalled();
    });
  });
});
