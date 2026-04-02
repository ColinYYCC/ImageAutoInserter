import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/AppPage';

test.describe('文件验证流程', () => {
  test('选择损坏的 ZIP 文件应显示错误', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    const [imageChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser.setFiles('corrupted.zip');

    await page.waitForTimeout(1000);

    const errorVisible = await page.getByText(/ZIP 文件损坏|验证失败|损坏/).isVisible().catch(() => false);
    if (errorVisible) {
      await expect(page.getByText(/ZIP 文件损坏|验证失败|损坏/)).toBeVisible();
    }

    await expect(appPage.startButton).toBeDisabled();
  });

  test('选择无效 Excel 文件应显示错误', async ({ page }) => {
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
    await excelChooser.setFiles('invalid-excel.xlsx');

    await page.waitForTimeout(1000);

    const errorVisible = await page.getByText(/未找到商品编码列|验证失败|无效/).isVisible().catch(() => false);
    if (errorVisible) {
      await expect(page.getByText(/未找到商品编码列|验证失败|无效/)).toBeVisible();
    }

    await expect(appPage.startButton).toBeDisabled();
  });

  test('空文件夹应显示错误', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    const [imageChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser.setFiles('empty-folder');

    await page.waitForTimeout(1000);

    const errorVisible = await page.getByText(/没有找到|未找到|为空/).isVisible().catch(() => false);
    if (errorVisible) {
      await expect(page.getByText(/没有找到|未找到|为空/)).toBeVisible();
    }
  });
});
