import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import { logInfo, logError, logWarn } from './logger';

export interface UpdateState {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  version: string | null;
  releaseNotes: string | null;
  progress: number;
}

export class UpdateManager {
  private mainWindow: BrowserWindow | null = null;
  private state: UpdateState = {
    checking: false,
    available: false,
    downloaded: false,
    error: null,
    version: null,
    releaseNotes: null,
    progress: 0
  };

  constructor() {
    this.setupAutoUpdater();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setupAutoUpdater() {
    // 配置自动更新
    autoUpdater.autoDownload = false; // 不自动下载，让用户确认
    autoUpdater.autoInstallOnAppQuit = true;

    // 监听更新事件
    autoUpdater.on('checking-for-update', () => {
      logInfo('🔍 正在检查更新...');
      this.state.checking = true;
      this.state.error = null;
      this.notifyRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      logInfo(`✅ 发现新版本: ${info.version}`);
      this.state.checking = false;
      this.state.available = true;
      this.state.version = info.version;
      this.state.releaseNotes = info.releaseNotes as string || null;
      this.notifyRenderer('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes
      });
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      logInfo(`ℹ️ 当前已是最新版本: ${info.version}`);
      this.state.checking = false;
      this.state.available = false;
      this.notifyRenderer('update-not-available', { version: info.version });
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.state.progress = progress.percent;
      this.notifyRenderer('update-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      logInfo(`✅ 更新已下载: ${info.version}`);
      this.state.downloaded = true;
      this.state.progress = 100;
      this.notifyRenderer('update-downloaded', { version: info.version });
    });

    autoUpdater.on('error', (err: Error) => {
      logError(`❌ 更新错误: ${err.message}`);
      this.state.checking = false;
      this.state.error = err.message;
      this.notifyRenderer('update-error', { error: err.message });
    });
  }

  private notifyRenderer(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      logError(`❌ 检查更新失败: ${err}`);
      this.state.error = err instanceof Error ? err.message : String(err);
      this.notifyRenderer('update-error', { error: this.state.error });
    }
  }

  /**
   * 下载更新
   */
  async downloadUpdate(): Promise<void> {
    try {
      logInfo('⬇️ 开始下载更新...');
      await autoUpdater.downloadUpdate();
    } catch (err) {
      logError(`❌ 下载更新失败: ${err}`);
      this.state.error = err instanceof Error ? err.message : String(err);
      this.notifyRenderer('update-error', { error: this.state.error });
    }
  }

  /**
   * 安装更新并重启
   */
  quitAndInstall(): void {
    logInfo('🔄 安装更新并重启应用...');
    autoUpdater.quitAndInstall();
  }

  /**
   * 获取当前更新状态
   */
  getState(): UpdateState {
    return { ...this.state };
  }

  /**
   * 获取当前应用版本
   */
  getCurrentVersion(): string {
    return autoUpdater.currentVersion.version;
  }
}

// 导出单例
export const updateManager = new UpdateManager();
