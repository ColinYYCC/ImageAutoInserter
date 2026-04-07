/**
 * 平台服务注册表
 * 根据当前平台自动选择对应的服务实现
 */

import {
  Platform,
  PlatformServices,
  PathService,
  ProcessService,
  FileService,
  SystemService,
} from './interfaces';

// 静态导入所有平台实现
import { WindowsPathService } from './win32/WindowsPathService';
import { WindowsProcessService } from './win32/WindowsProcessService';
import { WindowsFileService } from './win32/WindowsFileService';
import { WindowsSystemService } from './win32/WindowsSystemService';

import { MacPathService } from './darwin/MacPathService';
import { MacProcessService } from './darwin/MacProcessService';
import { MacFileService } from './darwin/MacFileService';
import { MacSystemService } from './darwin/MacSystemService';

class PlatformRegistry {
  private static instance: PlatformRegistry | null = null;
  private services: PlatformServices | null = null;
  private platformInfo: Platform | null = null;

  private constructor() {}

  static getInstance(): PlatformRegistry {
    if (!PlatformRegistry.instance) {
      PlatformRegistry.instance = new PlatformRegistry();
    }
    return PlatformRegistry.instance;
  }

  /**
   * 初始化平台服务（惰性初始化）
   */
  initialize(): void {
    if (this.services) return;

    const platformName = process.platform;

    if (platformName === 'win32') {
      this.services = {
        path: new WindowsPathService(),
        process: new WindowsProcessService(),
        file: new WindowsFileService(),
        system: new WindowsSystemService(),
      };
    } else if (platformName === 'darwin') {
      this.services = {
        path: new MacPathService(),
        process: new MacProcessService(),
        file: new MacFileService(),
        system: new MacSystemService(),
      };
    } else {
      throw new Error(`不支持的平台: ${platformName}，仅支持 Windows 和 macOS`);
    }

    this.platformInfo = {
      name: platformName as 'win32' | 'darwin',
      isWindows: platformName === 'win32',
      isMac: platformName === 'darwin',
    };
  }

  /**
   * 获取平台信息
   */
  getPlatform(): Platform {
    if (!this.platformInfo) {
      this.initialize();
    }
    return this.platformInfo!;
  }

  /**
   * 获取路径服务
   */
  get path(): PathService {
    if (!this.services) {
      this.initialize();
    }
    return this.services!.path;
  }

  /**
   * 获取进程服务
   */
  get process(): ProcessService {
    if (!this.services) {
      this.initialize();
    }
    return this.services!.process;
  }

  /**
   * 获取文件服务
   */
  get file(): FileService {
    if (!this.services) {
      this.initialize();
    }
    return this.services!.file;
  }

  /**
   * 获取系统服务
   */
  get system(): SystemService {
    if (!this.services) {
      this.initialize();
    }
    return this.services!.system;
  }

  /**
   * 便捷方法：判断是否为 Windows
   */
  isWindows(): boolean {
    return this.getPlatform().isWindows;
  }

  /**
   * 便捷方法：判断是否为 macOS
   */
  isMac(): boolean {
    return this.getPlatform().isMac;
  }
}

export const platformRegistry = PlatformRegistry.getInstance();

// 导出便捷访问
export const platform = platformRegistry;
export const pathService = platformRegistry.path;
export const processService = platformRegistry.process;
export const fileService = platformRegistry.file;
export const systemService = platformRegistry.system;

// 导出类型
export type { Platform, PlatformServices, PathService, ProcessService, FileService, SystemService } from './interfaces';
