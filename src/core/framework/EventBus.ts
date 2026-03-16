/**
 * 事件总线
 * 提供松耦合的组件通信机制
 */
import { FrameworkEventType, EventHandler } from './types';

export class EventBus {
  private handlers: Map<FrameworkEventType, Set<EventHandler>> = new Map();
  private onceHandlers: Map<FrameworkEventType, Set<EventHandler>> = new Map();

  /**
   * 订阅事件
   */
  on<T>(event: FrameworkEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  /**
   * 订阅一次性事件
   */
  once<T>(event: FrameworkEventType, handler: EventHandler<T>): void {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, new Set());
    }
    this.onceHandlers.get(event)!.add(handler);
  }

  /**
   * 取消订阅
   */
  off<T>(event: FrameworkEventType, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler);
    this.onceHandlers.get(event)?.delete(handler);
  }

  /**
   * 触发事件
   */
  async emit<T>(event: FrameworkEventType, data: T): Promise<void> {
    const handlers = this.handlers.get(event);
    const onceHandlers = this.onceHandlers.get(event);

    // 执行常规处理器
    if (handlers) {
      const promises = Array.from(handlers).map(async handler => {
        try {
          await handler(data);
        } catch (error) {
          console.error(`[EventBus] Handler error for ${event}:`, error);
        }
      });
      await Promise.all(promises);
    }

    // 执行一次性处理器并清除
    if (onceHandlers) {
      const promises = Array.from(onceHandlers).map(async handler => {
        try {
          await handler(data);
        } catch (error) {
          console.error(`[EventBus] Once handler error for ${event}:`, error);
        }
      });
      await Promise.all(promises);
      onceHandlers.clear();
    }
  }

  /**
   * 清除所有处理器
   */
  clear(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
  }

  /**
   * 获取事件订阅数量
   */
  getSubscriberCount(event: FrameworkEventType): number {
    const handlers = this.handlers.get(event)?.size || 0;
    const onceHandlers = this.onceHandlers.get(event)?.size || 0;
    return handlers + onceHandlers;
  }
}

// 全局事件总线实例
export const globalEventBus = new EventBus();
