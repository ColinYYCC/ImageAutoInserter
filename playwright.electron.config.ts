import { defineConfig, devices, chromium, ElectronApplication, test as playwrightTest } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

let electronApp: ElectronApplication | null = null;
let electronProcess: ChildProcess | null = null;

async function launchElectron(): Promise<ElectronApplication> {
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';

  const projectRoot = path.join(__dirname, '../..');
  const appPath = isMac
    ? path.join(projectRoot, 'dist/mac-arm64/ImageAutoInserter.app')
    : isWindows
      ? path.join(projectRoot, 'dist/win-unpacked/ImageAutoInserter.exe')
      : path.join(projectRoot, 'dist/linux-unpacked/ImageAutoInserter');

  if (!fs.existsSync(appPath)) {
    throw new Error(`Application not found at: ${appPath}`);
  }

  const executablePath = isMac
    ? path.join(appPath, 'Contents/MacOS/ImageAutoInserter')
    : appPath;

  console.log(`Launching Electron from: ${executablePath}`);

  electronProcess = spawn(executablePath, [], {
    cwd: isMac ? path.dirname(appPath) : path.dirname(executablePath),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'pipe',
  });

  electronApp = await chromium.launchElectron({
    executablePath,
    args: [isMac ? path.dirname(appPath) : path.dirname(executablePath)],
  });

  return electronApp;
}

async function closeElectron(): Promise<void> {
  if (electronApp) {
    await electronApp.close();
    electronApp = null;
  }
  if (electronProcess) {
    electronProcess.kill();
    electronProcess = null;
  }
}

export { launchElectron, closeElectron };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 180000,
  expect: {
    timeout: 30000,
  },
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
        },
      },
    },
  ],
});