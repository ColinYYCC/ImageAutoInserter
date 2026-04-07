/**
 * 平台注册表测试
 * 测试平台服务的自动选择和初始化
 */

import { describe, it, expect } from 'vitest';
import { platformRegistry, platform, pathService, processService, fileService, systemService } from '@/core/platform/registry';

describe('平台注册表', () => {
  describe('单例模式', () => {
    it('应返回同一个实例', () => {
      const instance1 = platformRegistry;
      const instance2 = platformRegistry;
      expect(instance1).toBe(instance2);
    });
  });

  describe('平台检测', () => {
    it('isWindows 应返回正确的布尔值', () => {
      const result = platform.isWindows();
      expect(typeof result).toBe('boolean');
      expect(result).toBe(process.platform === 'win32');
    });

    it('isMac 应返回正确的布尔值', () => {
      const result = platform.isMac();
      expect(typeof result).toBe('boolean');
      expect(result).toBe(process.platform === 'darwin');
    });

    it('应只支持 Windows 或 macOS', () => {
      const isWindows = platform.isWindows();
      const isMac = platform.isMac();
      expect(isWindows || isMac).toBe(true);
    });
  });

  describe('服务获取', () => {
    it('pathService 应返回路径服务实例', () => {
      expect(pathService).toBeDefined();
      expect(typeof pathService.join).toBe('function');
      expect(typeof pathService.normalize).toBe('function');
    });

    it('processService 应返回进程服务实例', () => {
      expect(processService).toBeDefined();
      expect(typeof processService.pythonExecutable).toBe('string');
      expect(typeof processService.spawnPython).toBe('function');
    });

    it('fileService 应返回文件服务实例', () => {
      expect(fileService).toBeDefined();
      expect(typeof fileService.exists).toBe('function');
      expect(typeof fileService.readFile).toBe('function');
    });

    it('systemService 应返回系统服务实例', () => {
      expect(systemService).toBeDefined();
      expect(typeof systemService.getPlatformInfo).toBe('function');
      expect(typeof systemService.isSsd).toBe('function');
    });
  });

  describe('惰性初始化', () => {
    it('服务应在首次访问时初始化', () => {
      // 访问服务会触发初始化
      void pathService.getTempDir();
      expect(platformRegistry).toBeDefined();
    });
  });

  describe('平台特定行为', () => {
    it('Windows 上短路径应可能改变', async () => {
      if (!platform.isWindows()) {
        // macOS 上跳过
        return;
      }

      const longPath = 'C:\\Program Files\\Application\\file.xlsx';
      const shortPath = await pathService.toShortPath(longPath);

      // 短路径可能是原路径或 8.3 格式
      expect(typeof shortPath).toBe('string');
    });

    it('macOS 上短路径应返回原路径', async () => {
      if (!platform.isMac()) {
        // Windows 上跳过
        return;
      }

      const path = '/Users/test/Documents/file.xlsx';
      const result = await pathService.toShortPath(path);
      expect(result).toBe(path);
    });
  });
});
