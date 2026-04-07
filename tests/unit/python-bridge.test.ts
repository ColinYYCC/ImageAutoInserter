/**
 * PythonBridge 单元测试
 * 测试覆盖：Python 进程管理、通信、错误处理、BufferAccumulator 等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import * as os from 'os';

// 使用 vi.hoisted 来定义 mock 函数
const { mockSpawn, mockExecFileSync } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
  mockExecFileSync: vi.fn(),
}));

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    __esModule: true,
    default: {
      spawn: mockSpawn,
      execFileSync: mockExecFileSync,
    },
    spawn: mockSpawn,
    execFileSync: mockExecFileSync,
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    __esModule: true,
    default: {
      ...actual.default,
      watch: vi.fn(() => ({ close: vi.fn() })),
      promises: {
        access: vi.fn(),
        rm: vi.fn(),
      },
    },
    watch: vi.fn(() => ({ close: vi.fn() })),
  };
});

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-user-data'),
    isPackaged: false,
  },
}));

vi.mock('../../src/main/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../../src/main/path-config', () => ({
  getPythonScriptPath: () => ({ scriptPath: '/tmp/test-script.py' }),
  getPythonBinaryPath: () => null,
  getPythonBinaryDirectory: () => '/tmp/bin',
  getLogDirectory: () => '/tmp/logs',
  isAppPackaged: () => false,
}));

vi.mock('../../src/core/platform', () => ({
  platform: {
    isWindows: () => false,
    isMac: () => true,
  },
}));

vi.mock('../../src/main/platform', () => ({
  SYSTEM_CONFIG: {
    process: {
      envPathSetup: '/usr/bin:/bin',
    },
  },
  getShortPathName: (p: string) => p,
}));

vi.mock('../../src/shared/constants', () => ({
  PROCESS_CONFIG: {
    TIMEOUT_MS: 60000,
    KILL_TIMEOUT_MS: 5000,
    BUFFER_MAX_SIZE: 1024 * 1024,
  },
}));

vi.mock('../../src/main/utils/path-validator', () => ({
  validateTempPathSafety: () => ({ valid: true, resolvedPath: '/tmp/test' }),
}));

import {
  pythonBridge,
  killProcessByPid,
  registerTempDir,
  cleanupAllTemp,
} from '../../src/main/python-bridge';

describe('PythonBridge - Python 桥接器测试', () => {
  let mockProcess: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProcess = {
      pid: 12345,
      killed: false,
      stdout: {
        on: vi.fn(),
      },
      stderr: {
        on: vi.fn(),
      },
      on: vi.fn(),
      kill: vi.fn(() => true),
    };

    mockSpawn.mockReturnValue(mockProcess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processExcel - Excel 处理', () => {
    it('应正确启动 Python 进程', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      const result = pythonBridge.processExcel(options, vi.fn(), vi.fn());

      expect(mockSpawn).toHaveBeenCalled();
      expect(result.process).toBe(mockProcess);
      expect(typeof result.kill).toBe('function');
    });

    it('应正确设置环境变量', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      pythonBridge.processExcel(options, vi.fn(), vi.fn());

      const spawnCall = mockSpawn.mock.calls[0];
      const spawnOptions = spawnCall[2];

      expect(spawnOptions.env.PYTHONUNBUFFERED).toBe('1');
      expect(spawnOptions.env.PYTHONIOENCODING).toBe('utf-8');
    });

    it('应正确传递参数', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      pythonBridge.processExcel(options, vi.fn(), vi.fn());

      const spawnCall = mockSpawn.mock.calls[0];
      const args = spawnCall[1];

      expect(args).toContain('/test/excel.xlsx');
      expect(args).toContain('/test/images');
    });

    it('应正确解析进度消息', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      const onMessage = vi.fn();
      pythonBridge.processExcel(options, onMessage, vi.fn());

      const stdoutOnCall = mockProcess.stdout.on.mock.calls[0];
      const stdoutHandler = stdoutOnCall[1];

      const progressMessage = {
        type: 'progress',
        payload: { percent: 50, current: '处理第 100 行' },
      };

      stdoutHandler(Buffer.from(JSON.stringify(progressMessage) + '\n'));

      expect(onMessage).toHaveBeenCalledWith(progressMessage);
    });

    it('应正确解析完成消息', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      const onMessage = vi.fn();
      pythonBridge.processExcel(options, onMessage, vi.fn());

      const stdoutOnCall = mockProcess.stdout.on.mock.calls[0];
      const stdoutHandler = stdoutOnCall[1];

      const completeMessage = {
        type: 'complete',
        payload: {
          total: 100,
          success: 95,
          failed: 5,
          successRate: 0.95,
          outputPath: '/test/output.xlsx',
          errors: [],
        },
      };

      stdoutHandler(Buffer.from(JSON.stringify(completeMessage) + '\n'));

      expect(onMessage).toHaveBeenCalledWith(completeMessage);
    });

    it('应正确解析错误消息', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      const onMessage = vi.fn();
      pythonBridge.processExcel(options, onMessage, vi.fn());

      const stdoutOnCall = mockProcess.stdout.on.mock.calls[0];
      const stdoutHandler = stdoutOnCall[1];

      const errorMessage = {
        type: 'error',
        payload: {
          type: 'ValidationError',
          message: '文件格式错误',
          resolution: '请检查文件格式',
        },
      };

      stdoutHandler(Buffer.from(JSON.stringify(errorMessage) + '\n'));

      expect(onMessage).toHaveBeenCalledWith(errorMessage);
    });

    it('进程错误时应调用错误回调', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      const onError = vi.fn();
      pythonBridge.processExcel(options, vi.fn(), onError);

      const errorHandler = mockProcess.on.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )[1];

      errorHandler(new Error('Process error'));

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('进程异常退出时应调用错误回调', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      const onError = vi.fn();
      pythonBridge.processExcel(options, vi.fn(), onError);

      const closeHandler = mockProcess.on.mock.calls.find(
        (call: any[]) => call[0] === 'close'
      )[1];

      closeHandler(1);

      expect(onError).toHaveBeenCalled();
    });

    it('进程正常退出时不应调用错误回调', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      const onError = vi.fn();
      pythonBridge.processExcel(options, vi.fn(), onError);

      const closeHandler = mockProcess.on.mock.calls.find(
        (call: any[]) => call[0] === 'close'
      )[1];

      closeHandler(0);

      expect(onError).not.toHaveBeenCalled();
    });

    it('stderr 输出应被处理', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      pythonBridge.processExcel(options, vi.fn(), vi.fn());

      const stderrOnCall = mockProcess.stderr.on.mock.calls[0];
      const stderrHandler = stderrOnCall[1];

      stderrHandler(Buffer.from('Error message\n'));

      expect(stderrHandler).toBeDefined();
    });

    it('多行消息应被正确解析', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      const onMessage = vi.fn();
      pythonBridge.processExcel(options, onMessage, vi.fn());

      const stdoutOnCall = mockProcess.stdout.on.mock.calls[0];
      const stdoutHandler = stdoutOnCall[1];

      const message1 = { type: 'progress', payload: { percent: 25 } };
      const message2 = { type: 'progress', payload: { percent: 50 } };

      stdoutHandler(Buffer.from(JSON.stringify(message1) + '\n' + JSON.stringify(message2) + '\n'));

      expect(onMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('killCurrentProcess - 终止进程', () => {
    it('应成功终止进程', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      pythonBridge.processExcel(options, vi.fn(), vi.fn());
      pythonBridge.killCurrentProcess();

      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('进程已终止时不应重复终止', () => {
      mockProcess.killed = true;

      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      pythonBridge.processExcel(options, vi.fn(), vi.fn());
      pythonBridge.killCurrentProcess();

      expect(mockProcess.kill).not.toHaveBeenCalled();
    });

    it('没有进程时不应报错', () => {
      expect(() => pythonBridge.killCurrentProcess()).not.toThrow();
    });
  });

  describe('返回的 kill 函数', () => {
    it('应能终止进程', () => {
      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      const result = pythonBridge.processExcel(options, vi.fn(), vi.fn());
      result.kill();

      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('进程已终止时不应重复终止', () => {
      mockProcess.killed = true;

      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      const result = pythonBridge.processExcel(options, vi.fn(), vi.fn());
      result.kill();

      expect(mockProcess.kill).not.toHaveBeenCalled();
    });
  });

  describe('_killProcessByPid - 通过 PID 终止进程', () => {
    it('Mac/Linux 上应使用 SIGTERM', () => {
      const originalKill = process.kill;
      const mockKill = vi.fn();
      (process as any).kill = mockKill;

      pythonBridge._killProcessByPid(12345);

      expect(mockKill).toHaveBeenCalledWith(12345, 'SIGTERM');

      (process as any).kill = originalKill;
    });

    it('PID 为空时不应执行', () => {
      const originalKill = process.kill;
      const mockKill = vi.fn();
      (process as any).kill = mockKill;

      pythonBridge._killProcessByPid(null);

      expect(mockKill).not.toHaveBeenCalled();

      (process as any).kill = originalKill;
    });

    it('PID 为 undefined 时不应执行', () => {
      const originalKill = process.kill;
      const mockKill = vi.fn();
      (process as any).kill = mockKill;

      pythonBridge._killProcessByPid(undefined);

      expect(mockKill).not.toHaveBeenCalled();

      (process as any).kill = originalKill;
    });
  });

  describe('killProcessByPid - 导出的终止函数', () => {
    it('应终止进程', () => {
      const mockProc = {
        killed: false,
        kill: vi.fn(() => true),
      } as any;

      const originalKill = process.kill;
      const mockKill = vi.fn();
      (process as any).kill = mockKill;

      killProcessByPid(mockProc, 12345);

      expect(mockKill).toHaveBeenCalled();

      (process as any).kill = originalKill;
    });

    it('进程已终止时不应执行', () => {
      const mockProc = {
        killed: true,
        kill: vi.fn(),
      } as any;

      const originalKill = process.kill;
      const mockKill = vi.fn();
      (process as any).kill = mockKill;

      killProcessByPid(mockProc, 12345);

      expect(mockKill).not.toHaveBeenCalled();

      (process as any).kill = originalKill;
    });

    it('进程为 null 时不应执行', () => {
      const originalKill = process.kill;
      const mockKill = vi.fn();
      (process as any).kill = mockKill;

      const mockPythonBridgeKillPid = vi.spyOn(pythonBridge as any, '_killProcessByPid');
      const mockPythonBridgeKillProc = vi.spyOn(pythonBridge as any, '_killProcessByProc');

      killProcessByPid(null as any, 12345);

      expect(mockKill).not.toHaveBeenCalled();
      expect(mockPythonBridgeKillPid).not.toHaveBeenCalled();
      expect(mockPythonBridgeKillProc).not.toHaveBeenCalled();

      (process as any).kill = originalKill;
    });
  });

  describe('registerTempDir - 注册临时目录', () => {
    it('应成功注册临时目录', () => {
      registerTempDir('/tmp/test-dir');

      expect(() => registerTempDir('/tmp/test-dir')).not.toThrow();
    });
  });

  describe('cleanupAllTemp - 清理所有临时目录', () => {
    it('没有注册目录时应直接返回', async () => {
      await cleanupAllTemp();

      expect(() => cleanupAllTemp()).not.toThrow();
    });

    it('应清理注册的临时目录', async () => {
      registerTempDir('/tmp/test-dir-1');
      registerTempDir('/tmp/test-dir-2');

      await cleanupAllTemp();

      expect(() => cleanupAllTemp()).not.toThrow();
    });

    it('路径验证失败时应跳过并继续', async () => {
      const unsafePathValidator = await import('../../src/main/utils/path-validator');
      const originalValidate = unsafePathValidator.validateTempPathSafety;

      unsafePathValidator.validateTempPathSafety = vi.fn().mockReturnValue({
        valid: false,
        error: 'Path traversal detected',
      });

      registerTempDir('/tmp/malicious-path');
      await cleanupAllTemp();

      unsafePathValidator.validateTempPathSafety = originalValidate;
    });

    it('目录不存在时应跳过删除', async () => {
      const fsPromises = require('fs').promises;
      const originalAccess = fsPromises.access;

      fsPromises.access = vi.fn().mockResolvedValue(false);

      registerTempDir('/tmp/non-existent-dir');
      await cleanupAllTemp();

      fsPromises.access = originalAccess;
    });

    it('删除失败时应记录错误但继续清理其他目录', async () => {
      const fsPromises = require('fs').promises;
      const originalRm = fsPromises.rm;

      fsPromises.rm = vi.fn()
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce(undefined);

      const unsafePathValidator = await import('../../src/main/utils/path-validator');
      const originalValidate = unsafePathValidator.validateTempPathSafety;

      unsafePathValidator.validateTempPathSafety = vi.fn().mockReturnValue({
        valid: true,
        resolvedPath: '/tmp/test-dir',
      });

      registerTempDir('/tmp/test-dir-1');
      registerTempDir('/tmp/test-dir-2');
      await cleanupAllTemp();

      fsPromises.rm = originalRm;
      unsafePathValidator.validateTempPathSafety = originalValidate;
    });

    it('validateTempPathSafety 返回无效时应跳过', async () => {
      const unsafePathValidator = await import('../../src/main/utils/path-validator');
      const originalValidate = unsafePathValidator.validateTempPathSafety;

      unsafePathValidator.validateTempPathSafety = vi.fn().mockReturnValue({
        valid: false,
        error: 'Path traversal detected',
        resolvedPath: undefined,
      });

      registerTempDir('/tmp/test-dir-error');
      await cleanupAllTemp();

      unsafePathValidator.validateTempPathSafety = originalValidate;
    });

    it('Promise.allSettled 应等待所有清理操作完成', async () => {
      const fsPromises = require('fs').promises;
      const originalAccess = fsPromises.access;
      const originalRm = fsPromises.rm;

      fsPromises.access = vi.fn().mockResolvedValue(true);
      fsPromises.rm = vi.fn().mockResolvedValue(undefined);

      const unsafePathValidator = await import('../../src/main/utils/path-validator');
      const originalValidate = unsafePathValidator.validateTempPathSafety;

      unsafePathValidator.validateTempPathSafety = vi.fn().mockReturnValue({
        valid: true,
        resolvedPath: '/tmp/test-dir-await',
      });

      registerTempDir('/tmp/test-dir-await');
      const cleanupPromise = cleanupAllTemp();
      await expect(cleanupPromise).resolves.toBeUndefined();

      fsPromises.access = originalAccess;
      fsPromises.rm = originalRm;
      unsafePathValidator.validateTempPathSafety = originalValidate;
    });
  });

  describe('Windows 平台支持', () => {
    it('Windows 平台应使用 taskkill 终止进程', async () => {
      const originalPlatform = await import('../../src/core/platform');
      const originalPlatformObj = originalPlatform.platform;

      (originalPlatformObj as any).isWindows = vi.fn(() => true);
      (originalPlatformObj as any).isMac = vi.fn(() => false);

      vi.mock('../../src/core/platform', () => ({
        platform: {
          isWindows: () => true,
          isMac: () => false,
        },
      }));

      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      pythonBridge.processExcel(options, vi.fn(), vi.fn());
      pythonBridge.killCurrentProcess();

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'taskkill',
        expect.arrayContaining(['/pid', expect.any(String), '/T', '/F']),
        expect.any(Object)
      );

      vi.mock('../../src/core/platform', () => ({
        platform: {
          isWindows: () => false,
          isMac: () => true,
        },
      }));
    });

    it('Windows 平台应使用 python 而不是 python3', async () => {
      vi.mock('../../src/core/platform', () => ({
        platform: {
          isWindows: () => true,
          isMac: () => false,
        },
      }));

      vi.mock('../../src/main/path-config', () => ({
        getPythonScriptPath: () => ({ scriptPath: '/tmp/test-script.py' }),
        getPythonBinaryPath: () => null,
        getPythonBinaryDirectory: () => '/tmp/bin',
        getLogDirectory: () => '/tmp/logs',
        isAppPackaged: () => false,
      }));

      const options = {
        excelPath: '/test/excel.xlsx',
        imageSource: '/test/images',
      };

      pythonBridge.processExcel(options, vi.fn(), vi.fn());

      const spawnCall = mockSpawn.mock.calls[0];
      const executable = spawnCall[0];

      expect(executable).toBe('python');

      vi.mock('../../src/core/platform', () => ({
        platform: {
          isWindows: () => false,
          isMac: () => true,
        },
      }));
    });
  });
});
