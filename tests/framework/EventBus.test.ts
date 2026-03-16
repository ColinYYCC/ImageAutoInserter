/**
 * EventBus 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../../src/core/framework/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on', () => {
    it('应该能够订阅事件', async () => {
      const handler = vi.fn();
      eventBus.on('file:selected', handler);

      await eventBus.emit('file:selected', { path: '/test.xlsx' });

      expect(handler).toHaveBeenCalledWith({ path: '/test.xlsx' });
    });

    it('应该支持多个处理器', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('file:selected', handler1);
      eventBus.on('file:selected', handler2);

      await eventBus.emit('file:selected', { path: '/test.xlsx' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('应该返回取消订阅函数', async () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('file:selected', handler);

      unsubscribe();

      await eventBus.emit('file:selected', { path: '/test.xlsx' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('应该只触发一次', async () => {
      const handler = vi.fn();
      eventBus.once('file:selected', handler);

      await eventBus.emit('file:selected', { path: '/test1.xlsx' });
      await eventBus.emit('file:selected', { path: '/test2.xlsx' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ path: '/test1.xlsx' });
    });
  });

  describe('off', () => {
    it('应该能够取消订阅', async () => {
      const handler = vi.fn();
      eventBus.on('file:selected', handler);
      eventBus.off('file:selected', handler);

      await eventBus.emit('file:selected', { path: '/test.xlsx' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('应该执行处理器', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      eventBus.on('file:selected', handler);

      await eventBus.emit('file:selected', { path: '/test.xlsx' });
      expect(handler).toHaveBeenCalledWith({ path: '/test.xlsx' });
    });

    it('应该处理处理器错误', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      const successHandler = vi.fn();

      eventBus.on('file:selected', errorHandler);
      eventBus.on('file:selected', successHandler);

      // 不应该抛出错误
      await expect(eventBus.emit('file:selected', {})).resolves.not.toThrow();

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('getSubscriberCount', () => {
    it('应该返回正确的订阅数量', () => {
      eventBus.on('file:selected', vi.fn());
      eventBus.on('file:selected', vi.fn());
      eventBus.once('file:selected', vi.fn());

      expect(eventBus.getSubscriberCount('file:selected')).toBe(3);
      expect(eventBus.getSubscriberCount('file:validated')).toBe(0);
    });
  });

  describe('clear', () => {
    it('应该清除所有处理器', async () => {
      const handler = vi.fn();
      eventBus.on('file:selected', handler);
      eventBus.clear();

      await eventBus.emit('file:selected', { path: '/test.xlsx' });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
