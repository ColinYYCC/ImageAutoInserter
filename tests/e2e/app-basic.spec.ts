import { test, expect } from '@playwright/test';

test.describe('应用基础功能验证', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('应用标题显示正确', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText).toContain('商品图片自动插入工具');
  });

  test('初始状态开始按钮禁用', async ({ page }) => {
    const startButton = page.getByRole('button', { name: /开始处理|Start Processing/i });
    await expect(startButton).toBeDisabled();
  });

  test('选择图片来源区域存在', async ({ page }) => {
    const imageSection = page.locator('text=图片来源路径').locator('..');
    await expect(imageSection).toBeVisible();
  });

  test('选择 Excel 区域存在', async ({ page }) => {
    const excelSection = page.locator('text=Excel 文件路径').locator('..');
    await expect(excelSection).toBeVisible();
  });
});

test.describe('应用启动检查', () => {
  test('应用可以启动并加载', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('没有 JavaScript 错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
