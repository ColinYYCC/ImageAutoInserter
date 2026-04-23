import { app, BrowserWindow } from 'electron';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { setupIPCHandlers, initLogOnStartup } from './ipc-handlers';
import { createMainWindow, showStartupError, focusMainWindow } from './servers/window-manager';
import { cleanupViteProcess, stopConnectionHealthCheck } from './servers/dev-server-manager';
import { logInfo, logError } from './logger';
import { performanceMonitor } from './performance-monitor';
import { cleanupAllTemp, pythonBridge } from './python-bridge';
import { isWindows } from './platform';
import { performStartupCheck } from './startup-check';
import { flushBatchedLogger, getRendererHtmlPath } from './path-config';
import { asyncFileManager } from './utils/async-file';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

let prodServer: http.Server | null = null;
let prodServerPort = 0;

function startProductionServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const rendererDir = path.dirname(getRendererHtmlPath());
    logInfo(`[ProdServer] Serving from: ${rendererDir}`);

    if (!fs.existsSync(path.join(rendererDir, 'index.html'))) {
      reject(new Error(`index.html not found in ${rendererDir}`));
      return;
    }

    prodServer = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url?.split('?')[0] || '/');
      let filePath = path.join(rendererDir, urlPath);

      if (urlPath === '/' || urlPath === '/index.html') {
        filePath = path.join(rendererDir, 'index.html');
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(rendererDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    prodServer.listen(0, '127.0.0.1', () => {
      const addr = prodServer?.address();
      if (addr && typeof addr === 'object') {
        prodServerPort = addr.port;
        logInfo(`[ProdServer] Listening on http://127.0.0.1:${prodServerPort}`);
        resolve(prodServerPort);
      } else {
        reject(new Error('Failed to get server port'));
      }
    });

    prodServer.on('error', (err) => {
      logError(`[ProdServer] Error: ${err.message}`);
      reject(err);
    });
  });
}

export function stopProductionServer(): void {
  if (prodServer) {
    prodServer.close();
    prodServer = null;
    logInfo('[ProdServer] Stopped');
  }
}

export function getProductionServerPort(): number {
  return prodServerPort;
}

let isQuitting = false;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  focusMainWindow();
});

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');

function setupElectronReload(): void {
  // 禁用 electron-reload，因为它会阻止应用正常退出
  // 如需热重载，请手动重启应用
  logInfo('🔥 electron-reload 已禁用（防止退出问题）');
}

function performCleanup(): void {
  logInfo('🧹 Starting cleanup...');

  stopProductionServer();

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

  if (process.env.NODE_ENV !== 'development') {
    try {
      const port = await startProductionServer();
      logInfo(`✅ Production server started on port ${port}`);
    } catch (err) {
      logError(`❌ Failed to start production server: ${err}`);
    }
  }

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

process.on('uncaughtException', async (error) => {
  logError(`❌ Uncaught Exception: ${error.message}\nStack: ${error.stack}`);

  performCleanup();

  try {
    flushBatchedLogger();
    await asyncFileManager.flushAll();
  } catch (e) {
    console.error('刷新日志失败:', e);
  }

  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', async (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logError(`❌ Unhandled Rejection: ${error.message}\nStack: ${error.stack}`);

  performCleanup();

  try {
    flushBatchedLogger();
    await asyncFileManager.flushAll();
  } catch (e) {
    console.error('刷新日志失败:', e);
  }

  setTimeout(() => {
    process.exit(1);
  }, 1000);
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
