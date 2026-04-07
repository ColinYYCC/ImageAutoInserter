/**
 * 跨平台抽象层测试策略
 *
 * 测试分层：
 * 1. 单元测试 - 测试单个服务方法
 * 2. 集成测试 - 测试服务间协作
 * 3. 平台测试 - 测试平台特定实现
 *
 * 运行方式：
 * - 所有测试: npm run test
 * - 平台测试: npm run test:platform
 * - Windows 测试: npm run test:win32
 * - macOS 测试: npm run test:darwin
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ============ 平台服务通用测试 ============
// 这些测试在所有平台上运行，验证接口一致性

export function createPathServiceTests(
  PathServiceClass: typeof import('../win32/WindowsPathService').WindowsPathService |
                   typeof import('../darwin/MacPathService').MacPathService,
  platformName: 'win32' | 'darwin'
) {
  describe(`PathService (${platformName})`, () => {
    let pathService: InstanceType<typeof PathServiceClass>;

    beforeAll(() => {
      pathService = new PathServiceClass() as InstanceType<typeof PathServiceClass>;
    });

    describe('基础路径操作', () => {
      it('join 应正确连接路径片段', () => {
        const result = pathService.join('home', 'user', 'file.txt');
        expect(result).toBeTruthy();
        expect(result).toContain('home');
        expect(result).toContain('user');
        expect(result).toContain('file.txt');
      });

      it('resolve 应返回绝对路径', () => {
        const result = pathService.resolve('relative', 'path');
        expect(pathService.isAbsolute(result)).toBe(true);
      });

      it('normalize 应标准化路径格式', () => {
        const result = pathService.normalize('home/user/../Documents/./file.txt');
        expect(result).not.toContain('..');
        expect(result).not.toContain('./');
      });

      it('dirname 应返回目录部分', () => {
        const result = pathService.dirname('/home/user/file.txt');
        expect(result).toBe('/home/user');
      });

      it('basename 应返回文件名部分', () => {
        const result = pathService.basename('/home/user/file.txt');
        expect(result).toBe('file.txt');
      });

      it('extname 应返回扩展名', () => {
        expect(pathService.extname('file.xlsx')).toBe('.xlsx');
        expect(pathService.extname('file.tar.gz')).toBe('.gz');
        expect(pathService.extname('file')).toBe('');
      });
    });

    describe('系统目录', () => {
      it('getTempDir 应返回有效路径', () => {
        const result = pathService.getTempDir();
        expect(result).toBeTruthy();
        expect(pathService.isAbsolute(result)).toBe(true);
      });

      it('getHomeDir 应返回有效路径', () => {
        const result = pathService.getHomeDir();
        expect(result).toBeTruthy();
        expect(pathService.isAbsolute(result)).toBe(true);
      });

      it('getDesktopDir 应返回有效路径', () => {
        const result = pathService.getDesktopDir();
        expect(result).toBeTruthy();
        expect(result).toContain('Desktop');
      });

      it('getDocumentsDir 应返回有效路径', () => {
        const result = pathService.getDocumentsDir();
        expect(result).toBeTruthy();
        expect(result).toContain('Documents');
      });
    });

    describe('短路径转换', () => {
      it('toShortPath 应返回字符串', async () => {
        const result = await pathService.toShortPath('/some/path');
        expect(typeof result).toBe('string');
      });

      it('空路径应返回空字符串', async () => {
        const result = await pathService.toShortPath('');
        expect(result).toBe('');
      });
    });
  });
}

export function createProcessServiceTests(
  ProcessServiceClass: typeof import('../win32/WindowsProcessService').WindowsProcessService |
                      typeof import('../darwin/MacProcessService').MacProcessService,
  platformName: 'win32' | 'darwin'
) {
  describe(`ProcessService (${platformName})`, () => {
    let processService: InstanceType<typeof ProcessServiceClass>;

    beforeAll(() => {
      processService = new ProcessServiceClass() as InstanceType<typeof ProcessServiceClass>;
    });

    describe('Python 可执行文件', () => {
      it('pythonExecutable 应返回非空字符串', () => {
        expect(processService.pythonExecutable).toBeTruthy();
        expect(typeof processService.pythonExecutable).toBe('string');
      });
    });

    describe('进程管理', () => {
      it('isProcessRunning 对无效 PID 应返回 false', () => {
        const result = processService.isProcessRunning(999999);
        expect(result).toBe(false);
      });

      it('terminateProcess 对无效 PID 应正常处理', async () => {
        await expect(processService.terminateProcess(999999)).resolves.not.toThrow();
      });
    });
  });
}

export function createFileServiceTests(
  FileServiceClass: typeof import('../win32/WindowsFileService').WindowsFileService |
                    typeof import('../darwin/MacFileService').MacFileService,
  platformName: 'win32' | 'darwin'
) {
  describe(`FileService (${platformName})`, () => {
    let fileService: InstanceType<typeof FileServiceClass>;
    const testDir = `/tmp/platform-test-${Date.now()}`;
    const testFile = `${testDir}/test.txt`;

    beforeAll(async () => {
      fileService = new FileServiceClass() as InstanceType<typeof FileServiceClass>;
    });

    afterAll(async () => {
      // 清理测试文件
      try {
        await fileService.unlink(testFile);
      } catch {}
    });

    describe('文件操作', () => {
      it('exists 对不存在的文件应返回 false', () => {
        const result = fileService.exists('/nonexistent/path/file.txt');
        expect(result).toBe(false);
      });

      it('mkdir 应创建目录', async () => {
        await fileService.mkdir(testDir);
        expect(fileService.exists(testDir)).toBe(true);
        expect(fileService.isDirectory(testDir)).toBe(true);
      });

      it('writeFile 和 readFile 应正常工作', async () => {
        const content = 'Hello, World!';
        await fileService.writeFile(testFile, content, 'utf-8');

        const readContent = await fileService.readFile(testFile, 'utf-8');
        expect(readContent).toBe(content);
      });

      it('isFile 对文件应返回 true', () => {
        expect(fileService.isFile(testFile)).toBe(true);
      });

      it('realpath 应返回真实路径', () => {
        const result = fileService.realpath(testFile);
        expect(result).toBeTruthy();
      });
    });
  });
}

export function createSystemServiceTests(
  SystemServiceClass: typeof import('../win32/WindowsSystemService').WindowsSystemService |
                      typeof import('../darwin/MacSystemService').MacSystemService,
  platformName: 'win32' | 'darwin'
) {
  describe(`SystemService (${platformName})`, () => {
    let systemService: InstanceType<typeof SystemServiceClass>;

    beforeAll(() => {
      systemService = new SystemServiceClass() as InstanceType<typeof SystemServiceClass>;
    });

    describe('平台信息', () => {
      it('getPlatformInfo 应返回正确的平台信息', () => {
        const info = systemService.getPlatformInfo();

        expect(info.platform).toBe(platformName);
        expect(info.isWindows).toBe(platformName === 'win32');
        expect(info.isMac).toBe(platformName === 'darwin');
        expect(info.userName).toBeTruthy();
        expect(info.homeDir).toBeTruthy();
        expect(info.tmpDir).toBeTruthy();
      });
    });

    describe('系统字体', () => {
      it('getSystemFonts 应返回字体列表', () => {
        const fonts = systemService.getSystemFonts();
        expect(Array.isArray(fonts)).toBe(true);
        expect(fonts.length).toBeGreaterThan(0);
      });
    });

    describe('SSD 检测', () => {
      it('isSsd 应返回布尔值', async () => {
        const result = await systemService.isSsd();
        expect(typeof result).toBe('boolean');
      });
    });

    describe('媒体权限', () => {
      it('getMediaAccessStatus 应返回权限状态', async () => {
        const status = await systemService.getMediaAccessStatus();
        expect(typeof status.microphone).toBe('boolean');
        expect(typeof status.camera).toBe('boolean');
        expect(typeof status.file).toBe('boolean');
      });
    });
  });
}

// 导出测试工厂函数
export const testFactories = {
  createPathServiceTests,
  createProcessServiceTests,
  createFileServiceTests,
  createSystemServiceTests,
};
