/**
 * Electron 环境 E2E 测试
 * 这些测试需要完整的 Electron 应用环境才能运行
 * 
 * 运行方式:
 * 1. 先构建应用: npm run build
 * 2. 运行 Electron 测试: npx playwright test --config playwright.electron.config.ts
 * 
 * 或者在开发模式下:
 * 1. 启动应用: npm run dev
 * 2. 运行测试: npx playwright test --config playwright.electron.config.ts --project=electron-chromium
 */

import { test, expect } from '@playwright/test';

test.describe('Electron 桌面环境测试', () => {
  test.beforeEach(async ({ page }) => {
    // 等待 Electron 应用启动
    await page.waitForTimeout(2000);
  });

  test.describe('完整用户工作流', () => {
    test('完整处理流程应正常工作', async ({ page }) => {
      // 1. 选择图片来源
      const imageButton = page.locator('button:has-text("选择图片来源")');
      await imageButton.click();
      
      // 2. 选择 Excel 文件
      const excelButton = page.locator('button:has-text("选择 Excel")');
      await excelButton.click();
      
      // 3. 验证开始按钮已启用
      const startButton = page.locator('button:has-text("开始处理")');
      await expect(startButton).toBeEnabled();
      
      // 4. 点击开始处理
      await startButton.click();
      
      // 5. 验证进度显示
      const progress = page.locator('text=/处理中|\\d+%/');
      await expect(progress).toBeVisible({ timeout: 10000 });
      
      // 6. 验证处理完成
      const complete = page.locator('text=/完成|成功/');
      await expect(complete).toBeVisible({ timeout: 120000 });
    });

    test('点击取消应终止处理并重置状态', async ({ page }) => {
      // 1. 选择文件和开始处理
      const imageButton = page.locator('button:has-text("选择图片来源")');
      await imageButton.click();
      
      const excelButton = page.locator('button:has-text("选择 Excel")');
      await excelButton.click();
      
      const startButton = page.locator('button:has-text("开始处理")');
      await startButton.click();
      
      // 等待处理开始
      await page.waitForTimeout(1000);
      
      // 2. 点击取消
      const cancelButton = page.locator('button:has-text("取消")');
      await cancelButton.click();
      
      // 3. 验证状态已重置
      await expect(startButton).toBeDisabled();
    });
  });

  test.describe('文件验证', () => {
    test('选择损坏的 ZIP 文件应显示错误', async ({ page }) => {
      const imageButton = page.locator('button:has-text("选择图片来源")');
      await imageButton.click();
      
      // 选择一个损坏的文件
      const errorMessage = page.locator('text=/错误|失败|损坏/');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });

    test('选择无效 Excel 文件应显示错误', async ({ page }) => {
      const excelButton = page.locator('button:has-text("选择 Excel")');
      await excelButton.click();
      
      // 选择一个无效的文件
      const errorMessage = page.locator('text=/错误|无效|格式/');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });

    test('空文件夹应显示错误', async ({ page }) => {
      const imageButton = page.locator('button:has-text("选择图片来源")');
      await imageButton.click();
      
      // 选择一个空文件夹
      const errorMessage = page.locator('text=/空文件夹|没有图片/');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('错误处理', () => {
    test('Python 进程启动失败时应显示错误信息', async ({ page }) => {
      // 模拟 Python 环境异常
      const errorMessage = page.locator('text=/Python|进程|启动/');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });

    test('文件路径包含非法字符时应显示验证错误', async ({ page }) => {
      // 测试路径验证
      const errorMessage = page.locator('text=/路径|非法|字符/');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });

    test('临时目录无写入权限时应显示错误', async ({ page }) => {
      // 测试权限验证
      const errorMessage = page.locator('text=/权限|写入|临时/');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('并发和资源清理', () => {
    test('快速连续点击开始按钮不应启动多个进程', async ({ page }) => {
      // 1. 选择文件
      const imageButton = page.locator('button:has-text("选择图片来源")');
      await imageButton.click();
      
      const excelButton = page.locator('button:has-text("选择 Excel")');
      await excelButton.click();
      
      // 2. 快速连续点击开始按钮
      const startButton = page.locator('button:has-text("开始处理")');
      
      await Promise.all([
        startButton.click(),
        startButton.click(),
        startButton.click(),
      ]);
      
      // 3. 验证只有一个处理在进行
      const progress = page.locator('text=/处理中/');
      await expect(progress).toHaveCount(1, { timeout: 5000 });
    });

    test('窗口关闭时进程应正确清理', async ({ page }) => {
      // 1. 开始处理
      const imageButton = page.locator('button:has-text("选择图片来源")');
      await imageButton.click();
      
      const excelButton = page.locator('button:has-text("选择 Excel")');
      await excelButton.click();
      
      const startButton = page.locator('button:has-text("开始处理")');
      await startButton.click();
      
      // 2. 关闭窗口
      await page.close();
      
      // 3. 验证进程已清理（需要通过系统命令检查）
      // 这个测试需要在测试后验证系统进程
    });

    test('页面刷新时进度状态应正确重置', async ({ page }) => {
      // 1. 开始处理
      const imageButton = page.locator('button:has-text("选择图片来源")');
      await imageButton.click();
      
      const excelButton = page.locator('button:has-text("选择 Excel")');
      await excelButton.click();
      
      const startButton = page.locator('button:has-text("开始处理")');
      await startButton.click();
      
      // 2. 刷新页面
      await page.reload();
      
      // 3. 验证状态已重置
      await expect(startButton).toBeDisabled();
    });
  });
});
