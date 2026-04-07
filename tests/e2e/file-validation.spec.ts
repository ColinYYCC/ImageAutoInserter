import { test, expect } from './test-fixtures';

test.describe('文件验证流程', () => {
  test('选择损坏的 ZIP 文件应显示错误', async ({ page }) => {
    test.skip(true, '需要完整的 Electron 环境（包含文件选择器和 Python 进程）');
  });

  test('选择无效 Excel 文件应显示错误', async ({ page }) => {
    test.skip(true, '需要完整的 Electron 环境（包含文件选择器和 Python 进程）');
  });

  test('空文件夹应显示错误', async ({ page }) => {
    test.skip(true, '需要完整的 Electron 环境（包含文件选择器和文件系统）');
  });

  test('Mock 文件选择器应返回取消状态', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      return await (window as any).electronAPI.selectFile(['.xlsx'], '选择文件', false);
    });

    expect(result.canceled).toBe(true);
    expect(result.filePaths).toEqual([]);
  });

  test('Mock 文件验证应返回有效状态', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      return await (window as any).electronAPI.validateFile('/mock/test.xlsx', ['.xlsx']);
    });

    expect(result.valid).toBe(true);
    expect(result.supportedCount).toBe(10);
    expect(result.totalFiles).toBe(10);
  });
});
