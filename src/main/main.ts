import { app, BrowserWindow } from 'electron';
import path from 'path';
import { setupIPCHandlers, initLogOnStartup } from './ipc-handlers';
import { createMainWindow, showStartupError, focusMainWindow, getMainWindow } from './servers/window-manager';
import { cleanupViteProcess, stopConnectionHealthCheck } from './servers/dev-server-manager';
import { logInfo, logError, logWarn } from './logger';
import { performanceMonitor } from './performance-monitor';
import { cleanupAllTemp, pythonBridge } from './python-bridge';
import { isWindows } from './platform';
import { performStartupCheck } from './startup-check';

let electronReload: ((file: string, options?: object) => void) | null = null;
if (process.env.NODE_ENV === 'development') {
  try {
    electronReload = require('electron-reload');
  } catch {
    logWarn('electron-reload not found, hot reload disabled');
  }
}

let isQuitting = false;

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');

function setupElectronReload(): void {
  // 禁用 electron-reload，因为它会阻止应用正常退出
  // 如需热重载，请手动重启应用
  logInfo('🔥 electron-reload 已禁用（防止退出问题）');
}

function performCleanup(): void {
  logInfo('🧹 Starting cleanup...');

  // 停止连接健康检查
  stopConnectionHealthCheck();

  // 强制清理 Vite 进程
  cleanupViteProcess(true);

  // 终止 Python 子进程
  pythonBridge.killCurrentProcess();

  // 清理临时目录
  cleanupAllTemp();

  logInfo('✅ Cleanup completed');
}

app.whenReady().then(async () => {
  performanceMonitor.recordMemory('app', 'startup');

  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    logInfo('⚠️ Another instance is already running, quitting...');
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    logInfo('🔄 Second instance detected, focusing existing window...');
    focusMainWindow();
  });

  initLogOnStartup();
  logInfo('📱 App starting...');

  // 执行启动自检
  if (!performStartupCheck()) {
    app.quit();
    return;
  }

  try {
    const mainWindow = await createMainWindow();

    if (mainWindow) {
      setupIPCHandlers();
      logInfo('✅ IPC handlers registered');
      setupElectronReload();
    }
  } catch (err) {
    logError(`❌ Failed to create window: ${err}`);
    const error = err instanceof Error ? err : new Error(String(err));
    showStartupError(error);
  }
});

app.on('window-all-closed', () => {
  if (isQuitting) {
    return;
  }

  // 所有平台：关闭所有窗口后退出应用
  logInfo('👋 All windows closed, quitting app');
  isQuitting = true;

  // 开发模式：强制退出，确保 electron-reload 不会阻止退出
  if (process.env.NODE_ENV === 'development') {
    logInfo('👋 Development mode: force exit');
    app.exit(0);
  } else {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (isQuitting) {
    return;
  }
  logInfo('🧹 App before-quit, performing cleanup...');
  isQuitting = true;
  performCleanup();
});

app.on('will-quit', () => {
  logInfo('👋 App will quit');
});

app.on('activate', async () => {
  // macOS: 点击 Dock 图标时重新创建窗口（仅当应用未在退出过程中）
  if (!isQuitting && BrowserWindow.getAllWindows().length === 0) {
    const mainWindow = await createMainWindow();
    if (mainWindow) {
      setupIPCHandlers();
    }
  }
});

process.on('uncaughtException', (error) => {
  logError(`❌ Uncaught Exception: ${error.message}`);
  performCleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError(`❌ Unhandled Rejection: ${reason}`);
  performCleanup();
  process.exit(1);
});

if (isWindows()) {
  process.on('SIGBREAK', () => {
    logInfo('📡 Received SIGBREAK, cleaning up...');
    performCleanup();
    process.exit(0);
  });
} else {
  process.on('SIGTERM', () => {
    logInfo('📡 Received SIGTERM, cleaning up...');
    performCleanup();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logInfo('📡 Received SIGINT, cleaning up...');
    performCleanup();
    process.exit(0);
  });
}
