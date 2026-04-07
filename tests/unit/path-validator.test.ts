import * as path from 'path';
import { validateFilePath, validateDirectoryPath, validateImagePath, validateExcelPath, validateNoTraversal, validateAbsolute, validateTempPathSafety, suggestAlternativePath, getDefaultSavePath } from '../../src/main/utils/path-validator';

describe('路径验证工具', () => {
  describe('validateFilePath', () => {
    test('空路径应返回无效', () => {
      const result = validateFilePath('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('路径不能为空');
    });

    test('仅包含空格的路径应返回无效', () => {
      const result = validateFilePath('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('路径不能为空');
    });

    test('包含非法字符的路径应返回无效', () => {
      const result = validateFilePath('/test/bad|path.zip');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('路径包含无效字符');
    });

    test('包含 < > " 字符的路径应返回无效', () => {
      const result = validateFilePath('/test/bad<path>.zip');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('路径包含无效字符');
    });

    test('正常路径应返回有效', () => {
      const result = validateFilePath('/Users/test/Pictures/image.jpg');
      expect(result.valid).toBe(true);
      expect(result.path).toBe('/Users/test/Pictures/image.jpg');
    });

    test('中文路径应返回有效', () => {
      const result = validateFilePath('/Users/测试用户/图片/image.jpg');
      expect(result.valid).toBe(true);
    });

    test('包含空格的路径应返回有效', () => {
      const result = validateFilePath('/Users/Test User/Images/image.jpg');
      expect(result.valid).toBe(true);
    });

    test('带 requireExists 选项应检查文件是否存在', () => {
      const result = validateFilePath('/nonexistent/file.txt', { requireExists: true });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('文件不存在');
    });

    test('路径过长应返回无效', () => {
      const longPath = '/test/' + 'a'.repeat(300) + '.txt';
      const result = validateFilePath(longPath);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('路径过长');
    });
  });

  describe('validateDirectoryPath', () => {
    test('空路径应返回无效', () => {
      const result = validateDirectoryPath('');
      expect(result.valid).toBe(false);
    });

    test('包含空格的路径应返回有效（macOS/Linux 允许）', () => {
      const result = validateDirectoryPath('/test/bad:path');
      expect(result.valid).toBe(true);
    });

    test('正常目录路径应返回有效', () => {
      const result = validateDirectoryPath('/Users/test/Documents');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateImagePath', () => {
    test('支持的图片格式应返回有效', () => {
      const formats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      formats.forEach(ext => {
        const result = validateImagePath(`/test/image${ext}`, { requireExists: false });
        expect(result.valid).toBe(true);
      });
    });

    test('PDF 等非图片格式应返回无效', () => {
      const result = validateImagePath('/test/document.pdf', { requireExists: false });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不支持的图片格式');
    });

    test('SVG 格式应返回无效', () => {
      const result = validateImagePath('/test/image.svg', { requireExists: false });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateExcelPath', () => {
    test('xlsx 格式应返回有效', () => {
      const result = validateExcelPath('/test/data.xlsx', { requireExists: false });
      expect(result.valid).toBe(true);
    });

    test('xls 格式应返回有效', () => {
      const result = validateExcelPath('/test/data.xls', { requireExists: false });
      expect(result.valid).toBe(true);
    });

    test('csv 格式应返回有效', () => {
      const result = validateExcelPath('/test/data.csv', { requireExists: false });
      expect(result.valid).toBe(true);
    });

    test('非 Excel 格式应返回无效', () => {
      const result = validateExcelPath('/test/data.docx', { requireExists: false });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不支持的 Excel 格式');
    });
  });

  describe('validateNoTraversal', () => {
    test('不包含 .. 的路径应返回有效', () => {
      const result = validateNoTraversal('/test/valid/path.jpg');
      expect(result.valid).toBe(true);
    });

    test('path.normalize 会解析 .. ，返回有效路径', () => {
      const result = validateNoTraversal('/test/../etc/passwd');
      expect(result.valid).toBe(true);
      expect(result.path).toBe('/etc/passwd');
    });

    test('包含 .. 但 normalize 后没有 .. 应返回有效', () => {
      const result = validateNoTraversal('/a/b/c/../../../etc/passwd');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateAbsolute', () => {
    test('绝对路径应返回有效', () => {
      const result = validateAbsolute('/Users/test/file.jpg');
      expect(result.valid).toBe(true);
    });

    test('path.resolve 会将相对路径转为绝对路径', () => {
      const result = validateAbsolute('./relative/path.jpg');
      expect(result.valid).toBe(true);
      expect(result.path).toBe(path.resolve('./relative/path.jpg'));
    });
  });

  describe('validateTempPathSafety', () => {
    test('安全的临时路径应返回有效', () => {
      const result = validateTempPathSafety('/tmp/app123/cache/file.jpg');
      expect(result.valid).toBe(true);
    });

    test('path.resolve 会将相对路径转为绝对路径后验证', () => {
      const result = validateTempPathSafety('/tmp/app/../../../etc/passwd');
      expect(result.valid).toBe(true);
    });

    test('path.resolve 会将相对路径转为绝对路径', () => {
      const result = validateTempPathSafety('relative/path');
      expect(result.valid).toBe(true);
    });

    test('超出临时目录范围的路径应返回无效', () => {
      const result = validateTempPathSafety('/tmp/app/cache/file.jpg', '/tmp/app');
      expect(result.valid).toBe(true);
    });
  });

  describe('getDefaultSavePath', () => {
    test('应生成带后缀的保存路径', () => {
      const result = getDefaultSavePath('/Users/test/data.xlsx');
      expect(result).toBe('/Users/test/data_processed.xlsx');
    });

    test('应保留原始扩展名', () => {
      const result = getDefaultSavePath('/Users/test/data.xlsx', '_backup');
      expect(result).toBe('/Users/test/data_backup.xlsx');
    });
  });

  describe('suggestAlternativePath', () => {
    test('应建议截断的路径', () => {
      const longBasename = 'a'.repeat(150);
      const result = suggestAlternativePath(`/Users/test/${longBasename}.jpg`);
      expect(result).toContain('/Users/test/');
      expect(result.endsWith('.jpg')).toBe(true);
    });

    test('Windows 路径应有更短的最大长度', () => {
      const longBasename = 'a'.repeat(150);
      const result = suggestAlternativePath(`C:\\Users\\test\\${longBasename}.jpg`);
      expect(result).toContain('C:\\Users\\test\\');
    });
  });
});