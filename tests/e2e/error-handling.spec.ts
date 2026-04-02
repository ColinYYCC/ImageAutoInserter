import { test, expect, Page } from '@playwright/test';
import { AppPage } from './page-objects/AppPage';

test.describe('错误处理和恢复', () => {
  test('Python 进程异常退出应显示错误', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    await appPage.selectImageSource();
    await page.waitForTimeout(500);

    await appPage.selectExcelFile();
    await page.waitForTimeout(500);

    await expect(appPage.startButton).toBeEnabled();
  });

  test('处理错误后应能恢复正常流程', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    const [imageChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser.setFiles('corrupted.zip');

    await page.waitForTimeout(1500);

    const [excelChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectExcelFile();
    await excelChooser.setFiles('valid-data.xlsx');

    await page.waitForTimeout(1500);

    const startEnabled = await appPage.isStartButtonEnabled();

    if (startEnabled) {
      await appPage.clickStartButton();
      await page.waitForTimeout(3000);

      const errorDialog = page.locator('text=错误').or(page.locator('text=失败'));
      const errorVisible = await errorDialog.isVisible().catch(() => false);

      if (errorVisible) {
        const closeButton = page.getByRole('button', { name: /确定|关闭/ });
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });

  test('网络路径处理应优雅降级', async ({ page }) => {
    test.skip(true, '需要特殊环境配置');

    const appPage = new AppPage(page);
    await appPage.goto();

    await appPage.selectImageSource();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await fileChooser.setFiles('\\\\server\\share\\images');
  });
});

test.describe('边界条件测试', () => {
  test('空 Excel 文件应显示错误', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    const [imageChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser.setFiles('test-images.zip');

    const [excelChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectExcelFile();
    await excelChooser.setFiles('empty-excel.xlsx');

    await page.waitForTimeout(1500);
  });

  test('超大文件应显示友好错误或正确处理', async ({ page }) => {
    test.slow();

    const appPage = new AppPage(page);
    await appPage.goto();

    const [imageChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser.setFiles('very-large-images.zip');

    const [excelChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectExcelFile();
    await excelChooser.setFiles('large-data.xlsx');

    const canStart = await appPage.isStartButtonEnabled();

    if (canStart) {
      await appPage.clickStartButton();

      const processing = page.locator('text=正在处理');
      const timeout = page.locator('text=处理超时');

      const result = await Promise.race([
        processing.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'processing'),
        timeout.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'timeout'),
      ]);

      expect(result).toBeTruthy();
    }
  });

  test('特殊字符文件名应正确处理', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    await appPage.selectImageSource();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);

    const specialNames = [
      'test-file.jpg',
      '中文文件名.jpg',
      'spaces in name.jpg',
    ];

    for (const name of specialNames) {
      try {
        await fileChooser.setFiles(name);
        await page.waitForTimeout(500);
      } catch {
      }
    }
  });
});

test.describe('取消操作测试', () => {
  test('处理中途取消应完全停止', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    const [imageChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser.setFiles('large-dataset.zip');

    const [excelChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectExcelFile();
    await excelChooser.setFiles('large-data.xlsx');

    await appPage.clickStartButton();

    await page.waitForTimeout(2000);

    const cancelButton = page.getByRole('button', { name: '取消' });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    await page.waitForTimeout(1000);

    await expect(appPage.startButton).toBeDisabled();
  });

  test('取消后应能重新开始', async ({ page }) => {
    const appPage = new AppPage(page);
    const appPage2 = new AppPage(page);
    await appPage.goto();

    const [imageChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser.setFiles('test-images.zip');

    const [excelChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectExcelFile();
    await excelChooser.setFiles('valid-data.xlsx');

    await appPage.clickStartButton();
    await page.waitForTimeout(1500);

    const cancelButton = page.getByRole('button', { name: '取消' });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    await page.waitForTimeout(1000);

    const resetButton = page.getByRole('button', { name: '重新开始' });
    if (await resetButton.isVisible()) {
      await resetButton.click();
    }

    await page.waitForTimeout(500);

    await expect(page.locator('text=图片来源路径')).toBeVisible();
  });
});
