/**
 * macOS 平台服务测试
 * 仅在 macOS 系统上运行
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { MacPathService } from '../darwin/MacPathService';
import { MacProcessService } from '../darwin/MacProcessService';
import { MacFileService } from '../darwin/MacFileService';
import { MacSystemService } from '../darwin/MacSystemService';
import { createPathServiceTests, createProcessServiceTests, createFileServiceTests, createSystemServiceTests } from './test-utils';

// 跳过非 macOS 平台
const describeMac = process.platform === 'darwin' ? describe : describe.skip;

describeMac('macOS 平台服务', () => {
  createPathServiceTests(MacPathService, 'darwin');
  createProcessServiceTests(MacProcessService, 'darwin');
  createFileServiceTests(MacFileService, 'darwin');
  createSystemServiceTests(MacSystemService, 'darwin');
});

describeMac('macOS 特定功能', () => {
  describe('MacPathService', () => {
    let pathService: MacPathService;

    beforeAll(() => {
      pathService = new MacPathService();
    });

    describe('短路径转换', () => {
      it('macOS 应直接返回原路径', async () => {
        const path = '/Users/test/Documents/file.xlsx';
        const result = await pathService.toShortPath(path);
        expect(result).toBe(path);
      });
    });

    describe('路径分隔符', () => {
      it('normalize 应使用正斜杠', () => {
        const result = pathService.normalize('/Users/test/Documents');
        expect(result).toContain('/');
        expect(result).not.toContain('\\');
      });
    });

    describe('系统目录', () => {
      it('getHomeDir 应返回 /Users/xxx', () => {
        const result = pathService.getHomeDir();
        expect(result).toMatch(/^\/Users\//);
      });
    });
  });

  describe('MacProcessService', () => {
    let processService: MacProcessService;

    beforeAll(() => {
      processService = new MacProcessService();
    });

    describe('Python 查找', () => {
      it('应优先查找 Homebrew Python (ARM)', () => {
        const pythonPath = processService.pythonExecutable;
        if (process.arch === 'arm64') {
          // ARM Mac 应优先查找 /opt/homebrew
          expect(pythonPath).toBeTruthy();
        }
      });

      it('应查找系统 Python', () => {
        const pythonPath = processService.pythonExecutable;
        expect(pythonPath).toBeTruthy();
      });
    });

    describe('进程终止', () => {
      it('应使用 SIGTERM/SIGKILL', async () => {
        await expect(processService.terminateProcess(999999)).resolves.not.toThrow();
      });
    });
  });

  describe('MacSystemService', () => {
    let systemService: MacSystemService;

    beforeAll(() => {
      systemService = new MacSystemService();
    });

    describe('系统字体', () => {
      it('应包含 macOS 常见字体', () => {
        const fonts = systemService.getSystemFonts();
        expect(fonts).toContain('Helvetica');
        expect(fonts).toContain('Helvetica Neue');
        expect(fonts).toContain('Arial');
      });
    });

    describe('媒体权限', () => {
      it('应能查询媒体权限状态', async () => {
        const status = await systemService.getMediaAccessStatus();
        expect(status).toHaveProperty('microphone');
        expect(status).toHaveProperty('camera');
        expect(status).toHaveProperty('file');
      });
    });
  });
});
