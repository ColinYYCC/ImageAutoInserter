import http from 'http';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { logInfo, logWarn, logError } from '../logger';
import { safeWriteFile } from '../utils/async-file';
import { getVitePortCachePath, getResourcesPath, getCacheDirectory } from '../path-config';
import { isWindows } from '../platform';

const VITE_STARTUP_TIMEOUT = 10000;
const PORT_CHECK_TIMEOUT = 200;
const MAX_PORT_CHECK_ATTEMPTS = 8;
const VITE_PORTS = [5173, 5174, 5175];
const PORT_CACHE_FILE = getVitePortCachePath();

let viteProcess: ChildProcess | null = null;
let isViteProcessOwned = false;
let connectionCheckInterval: NodeJS.Timeout | null = null;
let connectionRetryCount = 0;
const MAX_CONNECTION_RETRIES = 3;
const CONNECTION_CHECK_INTERVAL = 3000;

export interface DevServerStatus {
  port: number;
  isOwned: boolean;
  isConnected: boolean;
}

export function getCachedPort(): number | null {
  try {
    if (fs.existsSync(PORT_CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(PORT_CACHE_FILE, 'utf-8'));
      const timestamp = cache.timestamp as number;
      const port = cache.port as number;

      if (Date.now() - timestamp < 600000) {
        logInfo(`📦 Using cached Vite port: ${port}`);
        return port;
      }
    }
  } catch {
    logWarn(`⚠️ Failed to read port cache`);
  }
  return null;
}

export function savePortToCache(port: number): void {
  try {
    const cacheDir = getCacheDirectory();
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    safeWriteFile(PORT_CACHE_FILE, JSON.stringify({
      port,
      timestamp: Date.now()
    })).catch(() => {});
    logInfo(`💾 Cached Vite port: ${port}`);
  } catch {
    logWarn(`⚠️ Failed to save port cache`);
  }
}

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const url = `http://localhost:${port}`;

    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 404);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(PORT_CHECK_TIMEOUT, () => {
      req.destroy();
      resolve(false);
    });
  });
}

export async function findExistingVitePort(): Promise<number> {
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

export async function startViteServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    logInfo('🚀 Starting Vite dev server...');

    const viteEnv = { ...process.env };
    // 开发环境使用 process.cwd()，生产环境使用 resourcesPath
    const projectRoot = process.env.NODE_ENV === 'development' 
      ? process.cwd() 
      : getResourcesPath();
    
    logInfo(`📁 Project root: ${projectRoot}`);
    
    const vite = spawn('npm', ['run', 'dev:vite-only'], {
      cwd: projectRoot,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: viteEnv,
    });

    viteProcess = vite;
    isViteProcessOwned = true;
    let vitePort = 0;
    let serverReady = false;

    vite.stdout?.on('data', (data) => {
      const output = data.toString();
      logInfo(`[Vite] ${output.trim()}`);

      const parsedPort = parseVitePort(output);
      if (parsedPort && vitePort === 0) {
        vitePort = parsedPort;
        logInfo(`📡 Vite server started on port ${vitePort}`);
        savePortToCache(vitePort);
      }

      if (output.includes('ready in') && !serverReady) {
        serverReady = true;

        if (vitePort > 0) {
          resolve(vitePort);
        } else {
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

export async function waitForPort(port: number, maxAttempts: number = MAX_PORT_CHECK_ATTEMPTS): Promise<boolean> {
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

export async function initializeDevServer(): Promise<number> {
  logInfo('🔍 Initializing development server...');

  const existingPort = await findExistingVitePort();

  if (existingPort > 0) {
    logInfo(`✅ Using existing Vite server on port ${existingPort}`);
    return existingPort;
  }

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

export function startConnectionHealthCheck(
  port: number,
  onConnectionLost: () => void,
  onConnectionRecovered: () => void
): void {
  connectionCheckInterval = setInterval(async () => {
    const isReady = await checkPort(port);

    if (!isReady) {
      connectionRetryCount++;
      logWarn(`⚠️ Vite connection lost (attempt ${connectionRetryCount}/${MAX_CONNECTION_RETRIES})`);

      if (connectionRetryCount >= MAX_CONNECTION_RETRIES) {
        logError('❌ Vite connection permanently lost');
        onConnectionLost();
        clearInterval(connectionCheckInterval!);
        connectionCheckInterval = null;
      }
    } else {
      if (connectionRetryCount > 0) {
        logInfo('✅ Vite connection recovered');
        connectionRetryCount = 0;
        onConnectionRecovered();
      }
    }
  }, CONNECTION_CHECK_INTERVAL);

  logInfo(`❤️ Started connection health check (interval: ${CONNECTION_CHECK_INTERVAL}ms)`);
}

export function stopConnectionHealthCheck(): void {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
}

let cleanupTimeout: NodeJS.Timeout | null = null;

export function cleanupViteProcess(force = false): void {
  stopConnectionHealthCheck();

  if (cleanupTimeout) {
    clearTimeout(cleanupTimeout);
    cleanupTimeout = null;
  }

  if (viteProcess && isViteProcessOwned) {
    logInfo(`🧹 Stopping Vite server (PID: ${viteProcess.pid}, owned by this instance)...`);

    const killProcess = (signal: NodeJS.Signals) => {
      if (isWindows()) {
        try {
          const { execFileSync } = require('child_process');
          execFileSync('taskkill', ['/pid', String(viteProcess!.pid), '/T', '/F'], { encoding: 'utf-8' });
          logInfo('✅ Vite server stopped (taskkill)');
        } catch (e) {
          logWarn(`⚠️ taskkill failed, falling back to kill signal: ${e}`);
          try {
            viteProcess!.kill(signal);
          } catch (killError) {
            logError(`❌ Failed to kill Vite process: ${killError}`);
          }
        }
      } else {
        try {
          viteProcess!.kill(signal);
          logInfo(`✅ Vite server stopped (${signal})`);
        } catch (killError) {
          logError(`❌ Failed to kill Vite process: ${killError}`);
        }
      }
    };

    if (force) {
      // 强制立即终止
      killProcess('SIGKILL');
      viteProcess = null;
      isViteProcessOwned = false;
    } else {
      // 先尝试优雅终止
      killProcess('SIGTERM');

      cleanupTimeout = setTimeout(() => {
        if (viteProcess && !viteProcess.killed) {
          logWarn('⚠️ Vite process did not exit gracefully, force killing');
          killProcess('SIGKILL');
        }
        cleanupTimeout = null;
        viteProcess = null;
        isViteProcessOwned = false;
        logInfo('✅ Vite server cleanup completed');
      }, 3000);
      return;
    }
  } else if (viteProcess && !isViteProcessOwned) {
    logInfo('ℹ️ Vite server not stopped (started by external process)');
  } else {
    logInfo('ℹ️ No Vite server to stop');
  }
}

export function getDevServerStatus(): DevServerStatus {
  return {
    port: 0,
    isOwned: isViteProcessOwned,
    isConnected: connectionCheckInterval !== null
  };
}
