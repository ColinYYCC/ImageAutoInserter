import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { setupIPCHandlers } from './ipc-handlers';
import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import { logInfo, logError, logWarn, ensureLogDir } from './logger';
import { ensureLogDir as ensureLogDirForCache } from './logger';
import { updateManager } from './update-manager';

let electronReload: ((file: string, options?: object) => void) | null = null;
if (process.env.NODE_ENV === 'development') {
  try {
    electronReload = require('electron-reload');
  } catch (e) {
    console.warn('electron-reload not found, hot reload disabled');
  }
}

// 禁用沙盒模式（macOS 权限问题）
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');

let mainWindow: BrowserWindow | null = null;
let devServerPort = 5173;
let viteProcess: ChildProcess | null = null;
let connectionCheckInterval: NodeJS.Timeout | null = null;
let connectionRetryCount = 0;
const MAX_CONNECTION_RETRIES = 3;
const CONNECTION_CHECK_INTERVAL = 3000; // 3 秒检查一次连接

// 标记 Vite 进程是否由当前 Electron 实例启动
let isViteProcessOwned = false;

// 启动配置
const VITE_STARTUP_TIMEOUT = 10000; // Vite 启动超时 10 秒 (优化：15s -> 10s)
const PORT_CHECK_TIMEOUT = 200; // 单端口检测超时 (优化：300ms -> 200ms)
const MAX_PORT_CHECK_ATTEMPTS = 8; // 最大检测次数 (优化：10 -> 8)
const VITE_PORTS = [5173, 5174, 5175]; // 精简端口范围
const PORT_CACHE_FILE = path.join(app.getPath('userData'), 'vite-port-cache.json');

/**
 * 端口缓存管理 - 加速启动
 */
function getCachedPort(): number | null {
  try {
    if (fs.existsSync(PORT_CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(PORT_CACHE_FILE, 'utf-8'));
      const timestamp = cache.timestamp as number;
      const port = cache.port as number;
      
      // 缓存有效期 10 分钟（开发时频繁重启，避免使用过期端口）
      const now = Date.now();
      if (now - timestamp < 600000) {
        logInfo(`📦 Using cached Vite port: ${port}`);
        return port;
      }
    }
  } catch (e) {
    logWarn(`⚠️ Failed to read port cache: ${e}`);
  }
  return null;
}

function savePortToCache(port: number) {
  try {
    ensureLogDirForCache();
    fs.writeFileSync(PORT_CACHE_FILE, JSON.stringify({
      port,
      timestamp: Date.now()
    }));
    logInfo(`💾 Cached Vite port: ${port}`);
  } catch (e) {
    logWarn(`⚠️ Failed to save port cache: ${e}`);
  }
}

/**
 * 检测指定端口是否有 HTTP 服务响应（并行优化版）
 */
function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const url = `http://localhost:${port}`;
    
    const req = http.get(url, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    req.on('error', () => resolve(false));
    req.setTimeout(PORT_CHECK_TIMEOUT, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * P0: 并行检测多个端口 - 快速响应 (带缓存优化)
 */
async function findExistingVitePort(): Promise<number> {
  // P0: 优先检查缓存
  const cachedPort = getCachedPort();
  if (cachedPort) {
    const isReady = await checkPort(cachedPort);
    if (isReady) {
      logInfo(`✅ Using cached Vite port: ${cachedPort}`);
      return cachedPort;
    }
    logInfo(`⚠️ Cached port ${cachedPort} not available, scanning...`);
  }
  
  logInfo('🔍 Parallel port scanning...');
  
  // 并行检测所有端口
  const checks = VITE_PORTS.map(port => 
    checkPort(port).then(ready => ready ? port : -1)
  );
  
  const results = await Promise.all(checks);
  const found = results.find(p => p > 0);
  
  if (found) {
    logInfo(`✅ Found Vite server on port ${found}`);
    savePortToCache(found);
    return found;
  }
  
  logInfo('⚠️ No existing Vite server found');
  return 0;
}

/**
 * P3: 增强版端口解析 - 支持多种 Vite 输出格式
 */
function parseVitePort(output: string): number | null {
  const patterns = [
    /Local:\s*http:\/\/localhost:(\d+)/,
    /http:\/\/localhost:(\d+)/,
    /127\.0\.0\.1:(\d+)/,
    /localhost:(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return null;
}

/**
 * 自动启动 Vite 开发服务器
 */
function startViteServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    logInfo('🚀 Starting Vite dev server...');
    
    const vite = spawn('npm', ['run', 'dev:vite-only'], {
      cwd: path.join(__dirname, '../..'),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    viteProcess = vite;
    isViteProcessOwned = true; // 标记为当前实例启动
    let vitePort = 0;
    let serverReady = false;
    
    vite.stdout?.on('data', (data) => {
      const output = data.toString();
      logInfo(`[Vite] ${output.trim()}`);
      
      // P3: 增强端口解析
      const parsedPort = parseVitePort(output);
      if (parsedPort && vitePort === 0) {
        vitePort = parsedPort;
        logInfo(`📡 Vite server started on port ${vitePort}`);
        savePortToCache(vitePort); // 保存端口到缓存
      }
      
      // 检测 Vite 启动完成
      if (output.includes('ready in') && !serverReady) {
        serverReady = true;
        
        if (vitePort > 0) {
          resolve(vitePort);
        } else {
          // 备用方案：检测已运行的端口
          setTimeout(async () => {
            const port = await findExistingVitePort();
            resolve(port > 0 ? port : 5173);
          }, 200);
        }
      }
    });
    
    vite.stderr?.on('data', (data) => {
      const output = data.toString();
      if (output.trim()) {
        logWarn(`[Vite Warn] ${output.trim()}`);
      }
    });
    
    vite.on('error', (error) => {
      logError(`❌ Failed to start Vite: ${error.message}`);
      reject(handleStartupError(error));
    });
    
    vite.on('exit', (code) => {
      if (!serverReady && code !== 0) {
        logError(`❌ Vite exited with code ${code}`);
        reject(new Error(`Vite 进程意外退出，退出码：${code}`));
      }
    });
    
    // 启动超时保护
    setTimeout(() => {
      if (!serverReady) {
        const errorMsg = 'Vite 服务器启动超时（15 秒）';
        logError(`❌ ${errorMsg}`);
        
        if (viteProcess) {
          viteProcess.kill();
          viteProcess = null;
        }
        
        reject(new Error(errorMsg));
      }
    }, VITE_STARTUP_TIMEOUT);
  });
}

/**
 * P3: 错误类型细分处理
 */
function handleStartupError(error: Error | NodeJS.ErrnoException): Error {
  const message = error.message || String(error);
  
  const errorMappings: Record<string, { code: string; userMsg: string }> = {
    'ENOENT': { 
      code: 'NOT_FOUND', 
      userMsg: 'npm 命令未找到，请确保已安装 Node.js' 
    },
    'EACCES': { 
      code: 'PERMISSION', 
      userMsg: '权限不足，请以管理员身份运行或检查文件权限' 
    },
    'ETIMEDOUT': { 
      code: 'TIMEOUT', 
      userMsg: '网络连接超时，请检查网络' 
    },
    'EADDRINUSE': { 
      code: 'PORT_IN_USE', 
      userMsg: '端口被占用，请关闭其他 Electron 应用或 Vite 服务' 
    },
    'spawn npm': {
      code: 'SPAWN_FAILED',
      userMsg: '无法启动 npm，请检查 Node.js 和 npm 是否正确安装'
    }
  };
  
  for (const [key, mapping] of Object.entries(errorMappings)) {
    if (message.includes(key)) {
      return new Error(`${mapping.userMsg} (${mapping.code})`);
    }
  }
  
  return error;
}

/**
 * P3: 显示细分错误对话框
 */
function showStartupError(error: Error): void {
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

/**
 * 等待指定端口的服务器就绪
 */
async function waitForPort(port: number, maxAttempts: number = MAX_PORT_CHECK_ATTEMPTS): Promise<boolean> {
  logInfo(`⏳ Waiting for server on port ${port}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isReady = await checkPort(port);
    
    if (isReady) {
      logInfo(`✅ Server ready on port ${port} (attempt ${attempt})`);
      return true;
    }
    
    if (attempt % 3 === 0) {
      logInfo(`⏳ Still waiting... (${attempt}/${maxAttempts})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

/**
 * 初始化开发服务器（检测已有或自动启动）
 */
async function initializeDevServer(): Promise<number> {
  logInfo('🔍 Initializing development server...');

  // P0: 并行检测端口
  const existingPort = await findExistingVitePort();

  if (existingPort > 0) {
    logInfo(`✅ Using existing Vite server on port ${existingPort}`);
    return existingPort;
  }

  // 自动启动 Vite
  try {
    const vitePort = await startViteServer();

    const isReady = await waitForPort(vitePort);
    if (!isReady) {
      throw new Error('等待 Vite 服务器就绪超时');
    }

    logInfo(`✅ Vite server auto-started on port ${vitePort}`);
    return vitePort;
  } catch (error) {
    logError(`❌ Auto-start Vite failed: ${error}`);
    throw error;
  }
}

/**
 * 创建主窗口
 */
async function createWindow() {
  // 开发模式：初始化开发服务器
  if (process.env.NODE_ENV === 'development') {
    try {
      devServerPort = await initializeDevServer();
    } catch (error) {
      logError(`❌ Failed to initialize dev server: ${error}`);
      showStartupError(error instanceof Error ? error : new Error(String(error)));
      app.quit();
      return;
    }
  }

  // 开发模式下 preload.js 在 dist/main 目录，生产模式在同级目录
  const preloadPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../dist/main/preload.js')
    : path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
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
    title: '图片自动插入工具'
  });

  // 开发模式：加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    logInfo(`🚀 Loading dev server from http://localhost:${devServerPort}`);
    
    const loadTimeout = setTimeout(() => {
      logError('❌ Timeout loading dev server');
      showStartupError(new Error('加载开发服务器超时（30秒）'));
    }, 30000);
    
    mainWindow?.loadURL(`http://localhost:${devServerPort}`)
      .then(() => {
        clearTimeout(loadTimeout);
        logInfo('✅ Dev server loaded successfully');
        
        // 启动连接健康检查
        startConnectionHealthCheck(devServerPort);
        
        mainWindow?.show();
      })
      .catch((err) => {
        clearTimeout(loadTimeout);
        logError(`❌ Failed to load URL: ${err.message}`);
        dialog.showErrorBox('加载失败', `无法加载应用界面。\n\n错误信息：${err.message}`);
      });
    
    if (process.env.OPEN_DEVTOOLS === 'true') {
      mainWindow?.webContents.openDevTools();
    }
  } else {
    // 生产模式
    mainWindow?.loadFile(path.join(__dirname, '../renderer/index.html'));
    mainWindow?.show();

    // 生产模式下启动时检查更新（延迟5秒，避免影响启动速度）
    setTimeout(() => {
      logInfo('🔍 启动时检查更新...');
      updateManager.checkForUpdates();
    }, 5000);
  }

  mainWindow.on('closed', () => {
    logInfo('🪟 Main window closed');
    // 窗口关闭时清理 Vite 进程
    cleanupViteProcess();
    mainWindow = null;
  });

  // 设置更新管理器的主窗口引用
  updateManager.setMainWindow(mainWindow);
}

/**
 * 清理 Vite 进程 - 只清理由当前实例启动的进程
 */
function cleanupViteProcess() {
  // 停止连接检查
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
  
  // 只清理由当前 Electron 实例启动的 Vite 进程
  if (viteProcess && isViteProcessOwned) {
    logInfo('🧹 Stopping Vite server (owned by this instance)...');
    
    viteProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (viteProcess && !viteProcess.killed) {
        logWarn('⚠️ Force killing Vite process');
        viteProcess.kill('SIGKILL');
      }
    }, 3000);
    
    viteProcess = null;
    isViteProcessOwned = false;
    logInfo('✅ Vite server stopped');
  } else if (viteProcess && !isViteProcessOwned) {
    logInfo('ℹ️ Vite server not stopped (started by external process)');
  } else {
    logInfo('ℹ️ No Vite server to stop');
  }
}

/**
 * 连接健康检查 - 监控 Vite 服务器状态
 */
function startConnectionHealthCheck(port: number) {
  connectionCheckInterval = setInterval(async () => {
    const isReady = await checkPort(port);
    
    if (!isReady) {
      connectionRetryCount++;
      logWarn(`⚠️ Vite connection lost (attempt ${connectionRetryCount}/${MAX_CONNECTION_RETRIES})`);
      
      if (connectionRetryCount >= MAX_CONNECTION_RETRIES) {
        logError('❌ Vite connection permanently lost');
        
        if (mainWindow && !mainWindow.isDestroyed()) {
          dialog.showErrorBox(
            '开发服务器断开',
            'Vite 开发服务器已断开连接。\n\n请重启应用以重新连接。'
          );
        }
        
        clearInterval(connectionCheckInterval!);
        connectionCheckInterval = null;
      }
    } else {
      // 连接恢复
      if (connectionRetryCount > 0) {
        logInfo('✅ Vite connection recovered');
        connectionRetryCount = 0;
      }
    }
  }, CONNECTION_CHECK_INTERVAL);
  
  logInfo(`❤️ Started connection health check (interval: ${CONNECTION_CHECK_INTERVAL}ms)`);
}

// 等待 app 准备就绪
app.whenReady().then(async () => {
  // 单实例锁：确保只有一个应用实例运行
  const gotTheLock = app.requestSingleInstanceLock();
  
  if (!gotTheLock) {
    logInfo('⚠️ Another instance is already running, quitting...');
    app.quit();
    return;
  }
  
  // 监听第二个实例启动事件
  app.on('second-instance', () => {
    logInfo('🔄 Second instance detected, focusing existing window...');
    
    // 如果已有窗口，聚焦它
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
  
  logInfo('📱 App starting...');
  
  try {
    await createWindow();
    
    if (mainWindow) {
      setupIPCHandlers(mainWindow);
      logInfo('✅ IPC handlers registered');
      
      // 初始化主进程热更新
      if (process.env.NODE_ENV === 'development' && electronReload) {
        const distMain = path.join(__dirname);
        logInfo(`🔥 Setting up electron-reload on: ${distMain}`);
        
        electronReload(distMain, {
          electron: path.join(__dirname, '../../node_modules/.bin/electron'),
          hardResetMethod: 'exit',
          awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100
          }
        });
        
        logInfo('✅ Main process hot reload enabled');
      }
    }
  } catch (err) {
    logError(`❌ Failed to create window: ${err}`);
    dialog.showErrorBox('启动失败', `应用启动失败。\n\n错误信息：${err instanceof Error ? err.message : String(err)}`);
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
      if (mainWindow) {
        setupIPCHandlers(mainWindow);
      }
    }
  });
});

// 窗口全部关闭时
app.on('window-all-closed', () => {
  cleanupViteProcess();
  app.quit();
});

// 应用即将退出时
app.on('before-quit', () => {
  logInfo('🧹 App quitting...');
  cleanupViteProcess();
  
  if (mainWindow) {
    mainWindow.webContents.send('app-quitting');
  }
});

app.on('will-quit', () => {
  logInfo('👋 App will quit');
});

// 全局错误处理
process.on('uncaughtException', (error) => {
  logError(`❌ Uncaught Exception: ${error.message}`);
  cleanupViteProcess();
});

process.on('unhandledRejection', (reason) => {
  logError(`❌ Unhandled Rejection: ${reason}`);
  cleanupViteProcess();
});
