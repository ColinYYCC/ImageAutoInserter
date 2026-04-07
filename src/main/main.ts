import { app, BrowserWindow } from 'electron';
import { setupIPCHandlers, initLogOnStartup } from './ipc-handlers';
import { createMainWindow, showStartupError, focusMainWindow } from './servers/window-manager';
import { logInfo, logError } from './logger';
import { performanceMonitor } from './performance-monitor';
import { cleanupAllTemp, pythonBridge } from './python-bridge';
import { platform } from '../core/platform';
import { performStartupCheck } from './startup-check';
import { securityBookmarkManager } from './utils/security-bookmark';

let isQuitting = false;

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');

function performCleanup(): void {
  logInfo('🧹 Starting cleanup...');

  pythonBridge.killCurrentProcess();
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

  await initLogOnStartup();
  logInfo('📱 App starting...');

  if (platform.isMac()) {
    securityBookmarkManager.restoreAllBookmarks();
    logInfo('✅ Security bookmarks restored');
  }

  if (!performStartupCheck()) {
    app.quit();
    return;
  }

  try {
    const mainWindow = await createMainWindow();

    if (mainWindow) {
      setupIPCHandlers();
      logInfo('✅ IPC handlers registered');
      logInfo('🔥 热更新已启用 - 主进程修改后将自动重启');
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

  logInfo('👋 All windows closed, quitting app');
  isQuitting = true;

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
  
  if (platform.isMac()) {
    securityBookmarkManager.stopAllAccesses();
  }
  
  performCleanup();
});

app.on('will-quit', () => {
  logInfo('👋 App will quit');
});

app.on('activate', async () => {
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

if (platform.isWindows()) {
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