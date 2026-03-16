/**
 * 处理器注册表
 * 管理所有文件处理器的注册和发现
 */
import { FileHandler, FileInfo, HandlerConfig, FileType } from './types';

export class HandlerRegistry {
  private handlers: Map<string, FileHandler> = new Map();
  private typeMapping: Map<FileType, string[]> = new Map();

  /**
   * 注册处理器
   */
  register(handler: FileHandler): void {
    const { name } = handler.config;

    if (this.handlers.has(name)) {
      console.warn(`[HandlerRegistry] Handler '${name}' already registered, overwriting`);
    }

    this.handlers.set(name, handler);

    // 更新类型映射
    handler.config.supportedTypes.forEach(type => {
      if (!this.typeMapping.has(type)) {
        this.typeMapping.set(type, []);
      }
      this.typeMapping.get(type)!.push(name);
    });

    console.log(`[HandlerRegistry] Registered handler: ${name}`);
  }

  /**
   * 注销处理器
   */
  unregister(name: string): boolean {
    const handler = this.handlers.get(name);
    if (!handler) {
      return false;
    }

    // 从类型映射中移除
    handler.config.supportedTypes.forEach(type => {
      const handlers = this.typeMapping.get(type);
      if (handlers) {
        const index = handlers.indexOf(name);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    });

    this.handlers.delete(name);
    console.log(`[HandlerRegistry] Unregistered handler: ${name}`);
    return true;
  }

  /**
   * 查找能处理指定文件的处理器
   */
  findHandler(fileInfo: FileInfo): FileHandler | null {
    // 首先根据文件类型查找
    const typeHandlers = this.typeMapping.get(fileInfo.type);
    if (typeHandlers) {
      for (const handlerName of typeHandlers) {
        const handler = this.handlers.get(handlerName);
        if (handler && handler.canHandle(fileInfo)) {
          return handler;
        }
      }
    }

    // 如果没有找到，遍历所有处理器
    for (const handler of this.handlers.values()) {
      if (handler.canHandle(fileInfo)) {
        return handler;
      }
    }

    return null;
  }

  /**
   * 根据名称获取处理器
   */
  getHandler(name: string): FileHandler | null {
    return this.handlers.get(name) || null;
  }

  /**
   * 获取所有处理器
   */
  getAllHandlers(): FileHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * 获取支持指定类型的所有处理器
   */
  getHandlersByType(type: FileType): FileHandler[] {
    const names = this.typeMapping.get(type) || [];
    return names
      .map(name => this.handlers.get(name))
      .filter((handler): handler is FileHandler => handler !== undefined);
  }

  /**
   * 检查是否有处理器支持指定文件
   */
  hasHandler(fileInfo: FileInfo): boolean {
    return this.findHandler(fileInfo) !== null;
  }

  /**
   * 获取所有支持的文件类型
   */
  getSupportedTypes(): FileType[] {
    return Array.from(this.typeMapping.keys());
  }

  /**
   * 获取注册表统计信息
   */
  getStats(): { handlers: number; types: number } {
    return {
      handlers: this.handlers.size,
      types: this.typeMapping.size
    };
  }

  /**
   * 清除所有处理器
   */
  clear(): void {
    this.handlers.clear();
    this.typeMapping.clear();
  }
}

// 全局处理器注册表实例
export const globalHandlerRegistry = new HandlerRegistry();
