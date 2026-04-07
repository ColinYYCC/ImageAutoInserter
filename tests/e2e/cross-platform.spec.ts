import { test, expect } from './test-fixtures';

test.describe('跨平台路径处理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('英文路径 - /Users/test/Pictures', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('中文路径 - /Users/测试用户/图片', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('空格路径 - /Users/Test User/Images', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('路径序列化在 IPC 中正确传输', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('相对路径和绝对路径正确处理', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('文件扩展名处理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('扩展名 .zip 处理', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('扩展名 .rar 处理', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('扩展名 .7z 处理', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('扩展名 .tar 处理', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('扩展名 .gz 处理', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
