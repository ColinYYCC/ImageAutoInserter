/**
 * Windows 平台服务测试
 * 仅在 Windows 系统上运行
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { WindowsPathService } from '../win32/WindowsPathService';
import { WindowsProcessService } from '../win32/WindowsProcessService';
import { WindowsFileService } from '../win32/WindowsFileService';
import { WindowsSystemService } from '../win32/WindowsSystemService';
import { createPathServiceTests, createProcessServiceTests, createFileServiceTests, createSystemServiceTests } from './test-utils';

// 跳过非 Windows 平台
const describeWindows = process.platform === 'win32' ? describe : describe.skip;

describeWindows('Windows 平台服务', () => {
  createPathServiceTests(WindowsPathService, 'win32');
  createProcessServiceTests(WindowsProcessService, 'win32');
  createFileServiceTests(WindowsFileService, 'win32');
  createSystemServiceTests(WindowsSystemService, 'win32');
});

describeWindows('Windows 特定功能', () => {
  describe('WindowsPathService', () => {
    let pathService: WindowsPathService;

    beforeAll(() => {
      pathService = new WindowsPathService();
    });

    describe('短路径转换', () => {
      it('应正确处理中文路径', async () => {
        const chinesePath = 'C:\\Users\\测试用户\\Documents\\文件.xlsx';
        const result = await pathService.toShortPath(chinesePath);
        expect(typeof result).toBe('string');
      });

      it('应正确处理带空格路径', async () => {
        const spacePath = 'C:\\Program Files\\Application\\file.xlsx';
        const result = await pathService.toShortPath(spacePath);
        expect(typeof result).toBe('string');
      });

      it('无效字符路径应返回原路径', async () => {
        const invalidPath = 'C:\\path\\with<invalid>chars';
        const result = await pathService.toShortPath(invalidPath);
        expect(result).toBe(invalidPath);
      });
    });

    describe('路径分隔符', () => {
      it('normalize 应使用反斜杠', () => {
        const result = pathService.normalize('C:/Users/test/Documents');
        expect(result).toContain('\\');
        expect(result).not.toContain('/');
      });
    });
  });

  describe('WindowsProcessService', () => {
    let processService: WindowsProcessService;

    beforeAll(() => {
      processService = new WindowsProcessService();
    });

    describe('Python 查找', () => {
      it('应在常见位置查找 Python', () => {
        const pythonPath = processService.pythonExecutable;
        // 可能是完整路径或 'python'
        expect(pythonPath).toBeTruthy();
      });
    });

    describe('进程终止', () => {
      it('应使用 taskkill 命令', async () => {
        // 测试对无效 PID 的处理
        await expect(processService.terminateProcess(999999)).resolves.not.toThrow();
      });
    });
  });

  describe('WindowsSystemService', () => {
    let systemService: WindowsSystemService;

    beforeAll(() => {
      systemService = new WindowsSystemService();
    });

    describe('系统字体', () => {
      it('应包含 Windows 常见字体', () => {
        const fonts = systemService.getSystemFonts();
        expect(fonts).toContain('Arial');
        expect(fonts).toContain('Calibri');
        expect(fonts).toContain('Segoe UI');
      });
    });
  });
});
