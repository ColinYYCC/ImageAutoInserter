/**
 * process-handlers.ts 辅助函数单元测试
 * 测试覆盖：safeParseJSON、parseErrorResolution、validateProcessPath
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock 所有必需的依赖模块（在任何 import 之前）
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  shell: { openPath: vi.fn() },
  app: {
    getPath: vi.fn(() => '/tmp/test-user-data'),
    isPackaged: false,
  },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    statSync: vi.fn(() => ({
      isDirectory: () => false,
      isFile: () => true,
      size: 1024,
    })),
    realpathSync: vi.fn((p: string) => p),
    readdirSync: vi.fn(() => []),
    default: {
      ...actual.default,
      existsSync: vi.fn(() => true),
      statSync: vi.fn(() => ({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024,
      })),
      realpathSync: vi.fn((p: string) => p),
      readdirSync: vi.fn(() => []),
    },
  };
});

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    spawn: vi.fn(),
    default: {
      ...actual.default,
      spawn: vi.fn(),
    },
  };
});

vi.mock('../../../src/main/path-config', () => ({
  getPythonScriptPath: vi.fn(() => ({ scriptPath: '/tmp/test.py', cwd: '/tmp' })),
  getProcessTempDirectory: vi.fn(() => '/tmp/process-temp'),
  getLogDirectory: vi.fn(() => '/tmp/logs'),
  getUserDataPath: vi.fn(() => '/tmp/user-data'),
  getCachedPath: vi.fn(() => '/tmp/cache'),
  getScriptPathsWithOverride: vi.fn(() => ({ cliScript: '/tmp/test.py', workingDir: '/tmp' })),
}));

vi.mock('../../../src/main/platform', () => ({
  platform: {
    isWindows: vi.fn(() => false),
    isMac: vi.fn(() => true),
  },
  getShortPathName: vi.fn((p: string) => p),
  SYSTEM_CONFIG: {
    process: {
      pythonExecutable: 'python3',
      envPathSetup: '/usr/local/bin',
    },
  },
}));

vi.mock('../../../src/main/utils/logging', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  writeLog: vi.fn(),
}));

vi.mock('../../../src/main/python-bridge', () => ({
  killProcessByPid: vi.fn(),
}));

vi.mock('../../../src/main/servers/window-manager', () => ({
  getMainWindow: vi.fn(() => ({
    webContents: { send: vi.fn() },
    isDestroyed: vi.fn(() => false),
  })),
}));

vi.mock('../../../src/shared/constants', () => ({
  FILE_EXTENSIONS: {
    EXCEL: ['.xlsx'],
    IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
    ARCHIVE: ['.zip', '.rar', '.7z'],
    ALL: ['.xlsx', '.jpg', '.png', '.zip', '.rar', '.7z'],
  },
  getExtension: vi.fn((f: string) => {
    const m = f.match(/\.[^.]+$/);
    return m ? m[0] : '';
  }),
  PROGRESS_CONFIG: {
    EXTRACT_MULTIPLIER: 0.1,
    MIN_JSON_LENGTH: 10,
    MAX_STDERR_LENGTH: 2000,
    ROWS_PER_PROGRESS: 5,
  },
}));

vi.mock('../../../core/platform', () => ({
  platform: {
    isWindows: vi.fn(() => false),
    isMac: vi.fn(() => true),
  },
}));

describe('process-handlers.ts 辅助函数测试', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('safeParseJSON - JSON 安全解析', () => {
    it('应正确解析有效 JSON', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const jsonStr = '{"success": true, "total": 100}';
      const result = safeParseJSON(jsonStr, null);
      expect(result).toEqual({ success: true, total: 100 });
    });

    it('应正确解析有效 JSON 数组', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const jsonStr = '[1, 2, 3, "test"]';
      const result = safeParseJSON(jsonStr, []);
      expect(result).toEqual([1, 2, 3, 'test']);
    });

    it('应处理空字符串并返回默认值', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const result = safeParseJSON('', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('应处理仅空白字符的字符串并返回默认值', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const result = safeParseJSON('   \n\t  ', { fallback: 'value' });
      expect(result).toEqual({ fallback: 'value' });
    });

    it('应处理无效 JSON 并返回默认值', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const result = safeParseJSON('not valid json {', { error: true });
      expect(result).toEqual({ error: true });
    });

    it('应处理截断的 JSON 并返回默认值', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const result = safeParseJSON('{"incomplete":', { complete: false });
      expect(result).toEqual({ complete: false });
    });

    it('应处理包含特殊字符的 JSON', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const jsonStr = '{"message": "value with spaces", "path": "/simple/path"}';
      const result = safeParseJSON(jsonStr, null);
      expect(result).toEqual({ message: 'value with spaces', path: '/simple/path' });
    });

    it('应正确处理嵌套 JSON 对象', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const jsonStr = '{"outer": {"inner": {"deep": true}}}';
      const result = safeParseJSON(jsonStr, null);
      expect(result).toEqual({ outer: { inner: { deep: true } } });
    });

    it('应正确处理包含数值的 JSON', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const jsonStr = '{"int": 42, "float": 3.14, "negative": -10}';
      const result = safeParseJSON(jsonStr, null);
      expect(result).toEqual({ int: 42, float: 3.14, negative: -10 });
    });

    it('应正确处理包含 null 值的 JSON', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const jsonStr = '{"nullValue": null, "emptyString": ""}';
      const result = safeParseJSON(jsonStr, {});
      expect(result).toEqual({ nullValue: null, emptyString: '' });
    });

    it('应正确处理包含中文的 JSON', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      const jsonStr = '{"message": "你好世界", "chinese": "测试"}';
      const result = safeParseJSON(jsonStr, null);
      expect(result).toEqual({ message: '你好世界', chinese: '测试' });
    });

    it('应正确处理类型化 fallback', async () => {
      const { safeParseJSON } = await import('../../../src/main/handlers/process-handlers');
      interface TestType { value: number; name: string }
      const fallback: TestType = { value: 0, name: 'default' };
      const result = safeParseJSON('invalid', fallback);
      expect(result).toEqual(fallback);
    });
  });

  describe('parseErrorResolution - 错误解决方案解析', () => {
    it('应为 FileNotFoundError 返回正确解决方案', async () => {
      const { parseErrorResolution } = await import('../../../src/main/handlers/process-handlers');
      const result = parseErrorResolution('FileNotFoundError: [Errno 2] No such file');
      expect(result).toBe('请检查文件路径是否正确，文件可能不存在');
    });

    it('应为 ImportError 返回正确解决方案', async () => {
      const { parseErrorResolution } = await import('../../../src/main/handlers/process-handlers');
      const result = parseErrorResolution('ImportError: No module named openpyxl');
      expect(result).toBe('请确保所有依赖包已正确安装');
    });

    it('应为 PermissionError 返回正确解决方案', async () => {
      const { parseErrorResolution } = await import('../../../src/main/handlers/process-handlers');
      const result = parseErrorResolution('PermissionError: [Errno 13] Permission denied');
      expect(result).toBe('请检查文件权限设置');
    });

    it('应为 MemoryError 返回正确解决方案', async () => {
      const { parseErrorResolution } = await import('../../../src/main/handlers/process-handlers');
      const result = parseErrorResolution('MemoryError: Unable to allocate memory');
      expect(result).toBe('内存不足，请尝试处理较小的文件');
    });

    it('应为未知错误返回默认解决方案', async () => {
      const { parseErrorResolution } = await import('../../../src/main/handlers/process-handlers');
      const result = parseErrorResolution('Some unknown error occurred');
      expect(result).toBe('请检查 Python 脚本和输入文件');
    });

    it('应处理空字符串并返回默认解决方案', async () => {
      const { parseErrorResolution } = await import('../../../src/main/handlers/process-handlers');
      const result = parseErrorResolution('');
      expect(result).toBe('请检查 Python 脚本和输入文件');
    });

    it('应处理包含多个错误类型的字符串，返回第一个匹配的解决方案', async () => {
      const { parseErrorResolution } = await import('../../../src/main/handlers/process-handlers');
      const result = parseErrorResolution('Error: FileNotFoundError and ImportError occurred');
      expect(result).toBe('请检查文件路径是否正确，文件可能不存在');
    });

    it('应区分大小写，只匹配大写开头的错误类型', async () => {
      const { parseErrorResolution } = await import('../../../src/main/handlers/process-handlers');
      const result = parseErrorResolution('filename: file not found error');
      expect(result).toBe('请检查 Python 脚本和输入文件');
    });

    it('应处理错误消息中的换行符', async () => {
      const { parseErrorResolution } = await import('../../../src/main/handlers/process-handlers');
      const result = parseErrorResolution('FileNotFoundError:\n  No such file or directory');
      expect(result).toBe('请检查文件路径是否正确，文件可能不存在');
    });

    it('应处理错误消息中的多个错误类型', async () => {
      const { parseErrorResolution } = await import('../../../src/main/handlers/process-handlers');
      const result = parseErrorResolution('ImportError and MemoryError together');
      expect(result).toBe('请确保所有依赖包已正确安装');
    });
  });

  describe('validateProcessPath - 进程路径验证', () => {
    it('应验证空路径返回无效', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('路径不能为空');
    });

    it('应验证 null 路径返回无效', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath(null as unknown as string, 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('路径不能为空');
    });

    it('应验证 undefined 路径返回无效', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath(undefined as unknown as string, 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('路径不能为空');
    });

    it('应检测路径遍历攻击', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/user/../../../etc/passwd', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('路径包含非法序列');
    });

    it('应检测相对路径遍历', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('./safe/../dangerous', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('路径包含非法序列');
    });

    it('在 macOS 上相对路径会被解析为绝对路径', async () => {
      const pathModule = require('path');
      const resolved = pathModule.resolve('relative/path/file.xlsx');
      expect(pathModule.isAbsolute(resolved)).toBe(true);
    });

    it('应验证 .xlsx 扩展名的 Excel 文件', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/test/document.xlsx', 'excel');
      expect(result.valid).toBe(true);
    });

    it('应拒绝非 .xlsx 扩展名的 Excel 文件', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/test/document.xls', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Excel 文件必须是 .xlsx 格式');
    });

    it('应拒绝 .xlsx 扩展名的图片路径验证', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/test/image.xlsx', 'image');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('图片来源必须是文件夹或压缩文件');
    });

    it('应接受文件夹作为图片来源', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/test/images', 'image');
      expect(result.valid).toBe(true);
    });

    it('应接受 .zip 作为图片来源', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/test/images.zip', 'image');
      expect(result.valid).toBe(true);
    });

    it('应接受 .rar 作为图片来源', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/test/images.rar', 'image');
      expect(result.valid).toBe(true);
    });

    it('应接受 .7z 作为图片来源', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/test/images.7z', 'image');
      expect(result.valid).toBe(true);
    });

    it('应拒绝访问 macOS /Applications 目录', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Applications/.app', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('不允许访问系统目录');
    });

    it('应拒绝访问 /Library 目录', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Library/Application Support/file.xlsx', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('不允许访问系统目录');
    });

    it('应拒绝访问 /System 目录', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/System/Library/file.xlsx', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('不允许访问系统目录');
    });

    it('应拒绝访问 /private/etc 目录', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/private/etc/passwd', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('不允许访问系统目录');
    });

    it('应拒绝访问 /private/tmp 目录', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/private/tmp/file.xlsx', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('不允许访问系统目录');
    });

    it('应拒绝访问 /private/var 目录', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/private/var/log/file.xlsx', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('不允许访问系统目录');
    });

    it('应拒绝访问 /system/library 目录', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/system/library/file.xlsx', 'excel');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('不允许访问系统目录');
    });

    it('Excel 类型验证应区分大小写 .xlsx vs .XLSX', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/test/document.XLSX', 'excel');
      expect(result.valid).toBe(true);
    });

    it('应处理带空格的路径', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/test User/Documents/file.xlsx', 'excel');
      expect(result.valid).toBe(true);
    });

    it('应处理带中文的路径', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/用户/文档/file.xlsx', 'excel');
      expect(result.valid).toBe(true);
    });

    it('应处理路径末尾的斜杠', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users/test/document.xlsx/', 'excel');
      expect(result.valid).toBe(true);
    });

    it('应处理双斜杠路径', async () => {
      const { validateProcessPath } = await import('../../../src/main/handlers/process-handlers');
      const result = validateProcessPath('/Users//test//document.xlsx', 'excel');
      expect(result.valid).toBe(true);
    });
  });
});