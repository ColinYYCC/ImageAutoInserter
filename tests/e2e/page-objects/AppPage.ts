import { Page, Locator } from '@playwright/test';

export class AppPage {
  readonly page: Page;
  readonly title: Locator;
  readonly startButton: Locator;
  readonly imageSourceSection: Locator;
  readonly excelFileSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1');
    this.startButton = page.getByRole('button', { name: '开始处理' });
    this.imageSourceSection = page.locator('text=选择图片来源').locator('..');
    this.excelFileSection = page.locator('text=选择 Excel').locator('..');
  }

  async goto() {
    await this.page.goto('http://localhost:5173');
  }

  async selectImageSource() {
    const browseButton = this.imageSourceSection.getByRole('button', { name: '浏览' });
    await browseButton.waitFor({ state: 'visible', timeout: 5000 });
    await browseButton.click();
  }

  async selectExcelFile() {
    const browseButton = this.excelFileSection.getByRole('button', { name: '浏览' });
    await browseButton.waitFor({ state: 'visible', timeout: 5000 });
    await browseButton.click();
  }

  async isStartButtonEnabled(): Promise<boolean> {
    return await this.startButton.isEnabled();
  }

  async clickStartButton() {
    await this.startButton.click();
  }
}

export class ProcessingPage {
  readonly page: Page;
  readonly progressBar: Locator;
  readonly cancelButton: Locator;
  readonly processingText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.progressBar = page.locator('[role="progressbar"]');
    this.cancelButton = page.getByRole('button', { name: '取消' });
    this.processingText = page.locator('text=正在处理');
  }

  async waitForProcessing() {
    await this.processingText.waitFor({ state: 'visible', timeout: 5000 });
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async isProgressBarVisible(): Promise<boolean> {
    return await this.progressBar.isVisible();
  }
}

export class ResultPage {
  readonly page: Page;
  readonly openFileButton: Locator;
  readonly resetButton: Locator;
  readonly successText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openFileButton = page.getByRole('button', { name: '打开文件' });
    this.resetButton = page.getByRole('button', { name: '重新开始' });
    this.successText = page.locator('text=处理完成');
  }

  async waitForComplete(timeout: number = 120000) {
    await this.successText.waitFor({ state: 'visible', timeout });
  }

  async clickOpenFile() {
    await this.openFileButton.click();
  }

  async clickReset() {
    await this.resetButton.click();
  }
}
