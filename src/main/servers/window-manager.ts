import { BrowserWindow, dialog } from 'electron';
import { logInfo, logError } from '../logger';
import { performanceMonitor } from '../performance-monitor';
import { updateManager } from '../update-manager';
import { getPreloadScriptPath, getRendererHtmlPath } from '../path-config';

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function createMainWindow(): Promise<BrowserWindow> {
  return new Promise(async (resolve, reject) => {
    const preloadPath = getPreloadScriptPath();

    const window = new BrowserWindow({
      width: 1100,
      height: 800,
      minWidth: 900,
      minHeight: 700,
      resizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
      },
      show: false,
      title: '图片自动插入工具',
      center: true,
      backgroundColor: '#FAFAF9',
    });

    mainWindow = window;

    const ensureWindowVisible = () => {
      const { screen } = require('electron');
      const displays = screen.getAllDisplays();
      const windowBounds = window.getBounds();
      const primaryDisplay = screen.getPrimaryDisplay();

      let isVisible = false;
      for (const display of displays) {
        const { x, y, width, height } = display.bounds;
        if (
          windowBounds.x >= x &&
          windowBounds.y >= y &&
          windowBounds.x + windowBounds.width <= x + width &&
          windowBounds.y + windowBounds.height <= y + height
        ) {
          isVisible = true;
          break;
        }
      }

      if (!isVisible) {
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        const newX = Math.round((screenWidth - windowBounds.width) / 2);
        const newY = Math.round((screenHeight - windowBounds.height) / 2);
        window.setBounds({ x: newX, y: newY, width: windowBounds.width, height: windowBounds.height });
      }
    };

    performanceMonitor.recordMemory('app', 'window_created');
    performanceMonitor.recordMetric('app', 'window_create_time', Date.now() - performanceMonitor.getReport().appStartTime, 'ms');

    if (process.env.VITE_DEV_SERVER_URL) {
      logInfo(`🚀 Loading dev server from ${process.env.VITE_DEV_SERVER_URL}`);

      const loadTimeout = setTimeout(() => {
        logError('❌ Timeout loading dev server');
        dialog.showErrorBox('加载失败', '加载开发服务器超时（30秒）');
      }, 30000);

      window.loadURL(process.env.VITE_DEV_SERVER_URL)
        .then(() => {
          clearTimeout(loadTimeout);
          logInfo('✅ Dev server loaded successfully');
          window.show();
          window.webContents.openDevTools();
          performanceMonitor.logStartupSummary();
          resolve(window);
        })
        .catch((err) => {
          clearTimeout(loadTimeout);
          logError(`❌ Failed to load URL: ${err.message}`);
          dialog.showErrorBox('加载失败', `无法加载应用界面。\n\n错误信息：${err.message}`);
          reject(err);
        });
    } else {
      const htmlPath = getRendererHtmlPath();
      logInfo(`📄 加载渲染进程: ${htmlPath}`);

      window.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
        logError(`❌ 渲染进程加载失败: ${errorCode} - ${errorDescription}`);
      });

      window.webContents.on('render-process-gone', (_, details) => {
        logError(`❌ 渲染进程终止: ${details.reason}`);
      });

      window.webContents.on('did-finish-load', () => {
        logInfo('✅ 渲染进程加载完成');
        ensureWindowVisible();
        window.show();
        setTimeout(() => {
          logInfo('🔍 启动时检查更新...');
          updateManager.checkForUpdates();
        }, 3000);
      });

      window.loadFile(htmlPath).then(() => {
        logInfo('✅ 窗口加载成功');
      }).catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logError(`❌ 加载窗口失败: ${errorMessage}`);
        dialog.showErrorBox(
          '启动失败',
          `无法加载应用界面。\n\n错误信息：${errorMessage}\n\n请重新安装应用或联系技术支持。`
        );
        reject(err);
      });

      resolve(window);
    }

    window.on('closed', () => {
      logInfo('🪟 Main window closed');
      mainWindow = null;
    });

    updateManager.setMainWindow(window);
  });
}

export function showStartupError(error: Error): void {
  const message = error.message;

  let title = '启动失败';
  let detail = '';

  if (message.includes('(PORT_IN_USE)')) {
    title = '端口被占用';
    detail = '请关闭其他 Electron 应用或 Vite 开发服务器，然后重试。\n\n可以在终端运行 "lsof -i :5173" 查看占用端口的进程。';
  } else if (message.includes('(NOT_FOUND)')) {
    title = '环境未配置';
    detail = '请确保已安装 Node.js 和 npm，然后重新启动应用。\n\n可以在终端运行 "node -v" 和 "npm -v" 检查。';
  } else if (message.includes('(PERMISSION)')) {
    title = '权限不足';
    detail = '请以管理员身份运行应用，或检查项目文件夹的读写权限。';
  } else if (message.includes('(TIMEOUT)')) {
    title = '连接超时';
    detail = '网络连接超时，请检查网络后重试。';
  } else {
    detail = `错误信息：${message}\n\n请查看日志文件了解详细信息。`;
  }

  dialog.showErrorBox(title, detail);
}

export function focusMainWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
}

export function sendToRenderer(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}