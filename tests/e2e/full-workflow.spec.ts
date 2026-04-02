import { test, expect, Page } from '@playwright/test';
import { AppPage, ProcessingPage, ResultPage } from './page-objects/AppPage';

test.describe('完整用户工作流', () => {
  let appPage: AppPage;
  let processingPage: ProcessingPage;
  let resultPage: ResultPage;

  test.beforeEach(async ({ page }) => {
    appPage = new AppPage(page);
    processingPage = new ProcessingPage(page);
    resultPage = new ResultPage(page);
    await appPage.goto();
  });

  test('验证初始状态', async () => {
    await expect(appPage.title).toContainText('商品图片自动插入工具');
    await expect(appPage.startButton).toBeDisabled();
  });

  test('选择文件后开始按钮应启用', async ({ page }) => {
    await expect(appPage.startButton).toBeDisabled();

    const [imageChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser.setFiles('test-images.zip');

    await expect(appPage.startButton).toBeDisabled();

    const [excelChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectExcelFile();
    await excelChooser.setFiles('test-data.xlsx');

    await expect(appPage.startButton).toBeEnabled();
  });

  test('完整处理流程', async ({ page }) => {
    await expect(appPage.startButton).toBeDisabled();

    const [imageChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser.setFiles('test-images.zip');

    const [excelChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectExcelFile();
    await excelChooser.setFiles('test-data.xlsx');

    await expect(appPage.startButton).toBeEnabled();
    await appPage.clickStartButton();

    await processingPage.waitForProcessing();
    await expect(processingPage.isProgressBarVisible()).toBeTruthy();

    await resultPage.waitForComplete();
    await expect(resultPage.openFileButton).toBeVisible();
  });
});

test.describe('处理取消功能', () => {
  test('点击取消应终止处理并重置状态', async ({ page }) => {
    const appPage = new AppPage(page);
    const processingPage = new ProcessingPage(page);

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
    await processingPage.waitForProcessing();
    await page.waitForTimeout(2000);

    await processingPage.clickCancel();

    await expect(appPage.title).toBeVisible();
    await expect(appPage.startButton).toBeDisabled();
  });
});

test.describe('多文件连续处理', () => {
  test('完成一次处理后可立即开始第二次', async ({ page }) => {
    const appPage = new AppPage(page);
    const processingPage = new ProcessingPage(page);
    const resultPage = new ResultPage(page);

    await appPage.goto();

    const [imageChooser1] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser1.setFiles('images-set-1.zip');

    const [excelChooser1] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectExcelFile();
    await excelChooser1.setFiles('data-set-1.xlsx');

    await appPage.clickStartButton();
    await resultPage.waitForComplete();

    await resultPage.clickReset();

    await expect(appPage.title).toBeVisible();
    await expect(appPage.startButton).toBeDisabled();

    const [imageChooser2] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectImageSource();
    await imageChooser2.setFiles('images-set-2.zip');

    const [excelChooser2] = await Promise.all([
      page.waitForEvent('filechooser'),
    ]);
    await appPage.selectExcelFile();
    await excelChooser2.setFiles('data-set-2.xlsx');

    await appPage.clickStartButton();
    await resultPage.waitForComplete();
  });
});
