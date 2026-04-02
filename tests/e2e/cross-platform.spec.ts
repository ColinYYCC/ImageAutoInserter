import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/AppPage';

test.describe('跨平台路径处理', () => {
  const pathTestCases = [
    {
      name: '英文路径',
      path: '/Users/test/Pictures',
      skip: process.platform === 'win32',
    },
    {
      name: '中文路径',
      path: '/Users/测试用户/图片',
      skip: process.platform === 'win32',
    },
    {
      name: '空格路径',
      path: '/Users/Test User/Images',
      skip: process.platform === 'win32',
    },
    {
      name: 'Windows 中文路径',
      path: 'C:\\Users\\测试用户\\Pictures',
      skip: process.platform !== 'win32',
    },
    {
      name: 'Windows 空格路径',
      path: 'C:\\Program Files\\Images',
      skip: process.platform !== 'win32',
    },
  ];

  for (const tc of pathTestCases) {
    test(`${tc.name} - ${tc.path}`, async ({ page }) => {
      test.skip(!!tc.skip, '平台限制');

      const appPage = new AppPage(page);
      await appPage.goto();

      await appPage.selectImageSource();

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
      ]);

      await fileChooser.setFiles(tc.path);

      await page.waitForTimeout(1000);

      const errorVisible = await page.getByText(/错误|失败|找不到/).isVisible().catch(() => false);
      expect(errorVisible).toBeFalsy();
    });
  }

  test('路径序列化在 IPC 中正确传输', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    const testPaths = [
      'C:\\Users\\测试\\文件.xlsx',
      '/Users/测试/文件.xlsx',
      '\\\\server\\share\\file.xlsx',
    ];

    for (const testPath of testPaths) {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.evaluate(async (p) => {
        const result = await (window as any).electronAPI.validateFile(p, '.xlsx');
        return result;
      }, testPath);

      await page.waitForTimeout(500);

      const hasJsonError = consoleErrors.some(e =>
        e.includes('JSON') ||
        e.includes('parse') ||
        e.includes('Unexpected')
      );

      expect(hasJsonError).toBeFalsy();
    }
  });

  test('相对路径和绝对路径正确处理', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    const testCases = [
      { path: '/absolute/path/to/file.jpg', isAbsolute: true },
      { path: './relative/path.jpg', isAbsolute: false },
      { path: '~/home/path.jpg', isAbsolute: false },
    ];

    for (const tc of testCases) {
      await page.evaluate(async (p) => {
        return await (window as any).electronAPI.validateFile(p, '.xlsx');
      }, tc.path);

      await page.waitForTimeout(200);
    }
  });
});

test.describe('文件扩展名处理', () => {
  const extensionCases = [
    { ext: '.zip', supported: true },
    { ext: '.rar', supported: true },
    { ext: '.7z', supported: true },
    { ext: '.tar', supported: false },
    { ext: '.gz', supported: false },
  ];

  for (const ec of extensionCases) {
    test(`扩展名 ${ec.ext} 处理`, async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();

      await appPage.selectImageSource();

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
      ]);

      await fileChooser.setFiles(`test-file${ec.ext}`);

      await page.waitForTimeout(1000);

      if (ec.supported) {
        const isEnabled = await appPage.isStartButtonEnabled();
        if (isEnabled) {
          const excelChooserPromise = page.waitForEvent('filechooser');
          await appPage.selectExcelFile();
          await excelChooserPromise.then(fc => fc.setFiles('valid.xlsx'));
        }
      } else {
        const errorVisible = await page.getByText(/不支持|无效/).isVisible().catch(() => false);
        expect(errorVisible).toBeTruthy();
      }
    });
  }
});
