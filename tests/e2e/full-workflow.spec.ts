import { test, expect, mockConfig } from './test-fixtures';

test.describe('完整用户工作流', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('验证初始状态', async ({ page }) => {
    const startButton = page.getByRole('button', { name: /开始处理|Start Processing/i });
    await expect(startButton).toBeDisabled();

    const title = page.locator('h1');
    await expect(title).toContainText('商品图片自动插入工具');
  });

  test('Mock 模式下开始按钮默认禁用', async ({ page }) => {
    const startButton = page.getByRole('button', { name: /开始处理|Start Processing/i });
    await expect(startButton).toBeDisabled();
  });

  test('Mock startProcess 应返回成功', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      return await (window as any).electronAPI.startProcess('/mock/excel.xlsx', '/mock/images');
    });

    expect(result.success).toBe(true);
  });

  test('Mock cancelProcess 应返回成功', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      return await (window as any).electronAPI.cancelProcess();
    });

    expect(result.success).toBe(true);
  });
});

test.describe('处理取消功能', () => {
  test('Mock 取消操作应正常工作', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cancelResult = await page.evaluate(async () => {
      return await (window as any).electronAPI.cancelProcess();
    });

    expect(cancelResult.success).toBe(true);
  });
});

test.describe('多文件连续处理', () => {
  test('Mock 连续处理应正常工作', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result1 = await page.evaluate(async () => {
      return await (window as any).electronAPI.startProcess('/mock/excel1.xlsx', '/mock/images1');
    });

    expect(result1.success).toBe(true);

    await page.waitForTimeout(1200);

    const result2 = await page.evaluate(async () => {
      return await (window as any).electronAPI.startProcess('/mock/excel2.xlsx', '/mock/images2');
    });

    expect(result2.success).toBe(true);
  });
});
