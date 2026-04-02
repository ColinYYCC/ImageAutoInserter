import { BrowserWindow } from 'electron';
import * as path from 'path';
import { safeAppendFile } from './utils/async-file';
import { getLogDirectory } from './path-config';

export interface WindowConfig {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

export interface WindowPreferences {
  bounds?: {
    x?: number;
    y?: number;
    width: number;
    height: number;
  };
}

const DEFAULT_CONFIG: WindowConfig = {
  width: 1100,
  height: 800,
  minWidth: 900,
  minHeight: 700,
};

const STORE_NAME = 'window-preferences';

function getStore() {
  try {
    const Store = require('electron-store');
    return new Store({ name: STORE_NAME });
  } catch (e) {
    const err = e as Error;
    try {
      const logDir = getLogDirectory();
      const logPath = path.join(logDir, 'startup-error.log');
      safeAppendFile(logPath, `[${new Date().toISOString()}] Store init failed: ${err?.message || String(e)}\n`).catch(() => {});
    } catch {}
    return null;
  }
}

export function getWindowConfig(): WindowConfig {
  const store = getStore();

  if (store) {
    try {
      const saved = store.get('windowBounds') as WindowPreferences['bounds'] | undefined;
      if (saved) {
        return {
          width: saved.width || DEFAULT_CONFIG.width,
          height: saved.height || DEFAULT_CONFIG.height,
          minWidth: DEFAULT_CONFIG.minWidth,
          minHeight: DEFAULT_CONFIG.minHeight,
        };
      }
    } catch (e) {
    }
  }

  return DEFAULT_CONFIG;
}

export function saveWindowPreferences(window: BrowserWindow): void {
  const store = getStore();
  if (!store) {
    return;
  }

  try {
    const bounds = window.getBounds();
    store.set('windowBounds', bounds);
  } catch {
  }
}

export function createMainWindow(preloadPath: string): BrowserWindow {
  const config = getWindowConfig();

  const window = new BrowserWindow({
    width: config.width,
    height: config.height,
    minWidth: config.minWidth,
    minHeight: config.minHeight,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    show: false,
    title: '图片自动插入工具',
  });

  window.on('close', () => {
    saveWindowPreferences(window);
  });

  return window;
}

export function getWindowConfigWithEnv(): WindowConfig {
  const envWidth = parseInt(process.env.WINDOW_WIDTH || '0', 10);
  const envHeight = parseInt(process.env.WINDOW_HEIGHT || '0', 10);

  const defaultConfig = getWindowConfig();

  return {
    width: envWidth > 0 ? envWidth : defaultConfig.width,
    height: envHeight > 0 ? envHeight : defaultConfig.height,
    minWidth: parseInt(process.env.WINDOW_MIN_WIDTH || String(DEFAULT_CONFIG.minWidth), 10),
    minHeight: parseInt(process.env.WINDOW_MIN_HEIGHT || String(DEFAULT_CONFIG.minHeight), 10),
  };
}
