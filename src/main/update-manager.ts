import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import { logInfo, logError } from './logger';
import { withRetry, CircuitBreaker, ErrorRecoveryManager } from './retry-handler';

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
  private isUpdateEnabled: boolean = true;
  // 添加熔断器防止更新服务器过载
  private circuitBreaker = new CircuitBreaker(5, 60000);
  // 后台定时检查定时器
  private periodicCheckTimer: NodeJS.Timeout | null = null;
  // 用户状态保存超时时间（毫秒）
  private readonly SAVE_STATE_TIMEOUT = 5000;

  constructor() {
    if (process.env.DISABLE_AUTO_UPDATE === 'true' || !app.isPackaged) {
      this.isUpdateEnabled = false;
      logInfo('ℹ️ 自动更新已禁用（开发模式或 DISABLE_AUTO_UPDATE=true）');
      return;
    }
    this.setupAutoUpdater();
    this.setupErrorRecovery();
    this.startPeriodicCheck();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setupAutoUpdater() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

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

  /**
   * 设置错误恢复策略
   */
  private setupErrorRecovery(): void {
    const recoveryManager = ErrorRecoveryManager.getInstance();

    if (!recoveryManager) {
      logInfo('ℹ️ 错误恢复管理器暂不可用，跳过错误恢复设置');
      return;
    }

    // 注册网络错误恢复策略
    recoveryManager.registerStrategy('network_error', async () => {
      logInfo('🔄 尝试恢复网络错误...');
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    });

    // 注册服务器错误恢复策略
    recoveryManager.registerStrategy('server_error', async () => {
      logInfo('🔄 服务器错误，等待后重试...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      return true;
    });
  }

  /**
   * 启动后台定期检查
   */
  private startPeriodicCheck(): void {
    if (!this.isUpdateEnabled) return;

    // 每 24 小时检查一次更新
    const CHECK_INTERVAL = 24 * 60 * 60 * 1000;
    
    this.periodicCheckTimer = setInterval(() => {
      logInfo('🕐 执行后台定期检查更新...');
      this.checkForUpdates();
    }, CHECK_INTERVAL);

    logInfo('✅ 后台定期更新检查已启动（每 24 小时）');
  }

  /**
   * 停止后台定期检查
   */
  stopPeriodicCheck(): void {
    if (this.periodicCheckTimer) {
      clearInterval(this.periodicCheckTimer);
      this.periodicCheckTimer = null;
      logInfo('⏹️ 后台定期更新检查已停止');
    }
  }

  removeAllListeners(): void {
    autoUpdater.removeAllListeners('checking-for-update');
    autoUpdater.removeAllListeners('update-available');
    autoUpdater.removeAllListeners('update-not-available');
    autoUpdater.removeAllListeners('download-progress');
    autoUpdater.removeAllListeners('update-downloaded');
    autoUpdater.removeAllListeners('error');
    this.stopPeriodicCheck();
    logInfo('[UpdateManager] 已移除所有更新监听器');
  }

  private notifyRenderer(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * 检查更新（集成重试机制和熔断器）
   */
  async checkForUpdates(): Promise<void> {
    if (!this.isUpdateEnabled) {
      logInfo('ℹ️ 自动更新已禁用，跳过检查');
      return;
    }

    try {
      // 使用熔断器包装更新检查
      await this.circuitBreaker.execute(async () => {
        // 使用重试机制
        const result = await withRetry(
          () => autoUpdater.checkForUpdates(),
          {
            maxAttempts: 3,
            initialDelayMs: 2000,
            backoffMultiplier: 2,
          }
        );

        if (!result.success) {
          throw result.error;
        }

        return result.result;
      });
    } catch (err) {
      await this.handleUpdateError(err);
    }
  }

  /**
   * 处理更新错误（包含更细致的错误分类）
   */
  private async handleUpdateError(err: any): Promise<void> {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // 404 错误 - 暂无更新
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      logInfo('ℹ️ 暂无更新（未找到更新配置文件）');
      this.state.error = null;
      this.notifyRenderer('update-no-available');
      return;
    }

    // 403 错误 - 权限问题
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      logError('❌ 更新检查被拒绝（权限问题）');
      this.state.error = '更新服务暂时不可用，请稍后重试';
      this.notifyRenderer('update-error', { error: this.state.error });
      return;
    }

    // 500/502/503 错误 - 服务器错误
    if (errorMessage.includes('500') || errorMessage.includes('502') ||
        errorMessage.includes('503') || errorMessage.includes('504')) {
      logError('❌ 更新服务器错误');
      this.state.error = '更新服务器暂时不可用，请稍后重试';
      this.notifyRenderer('update-error', { error: this.state.error });

      // 尝试错误恢复
      const recoveryManager5xx = ErrorRecoveryManager.getInstance();
      if (recoveryManager5xx) {
        await recoveryManager5xx.recover('server_error');
      }
      return;
    }

    // 网络超时错误
    if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      logError('❌ 更新检查超时');
      this.state.error = '网络连接超时，请检查网络后重试';
      this.notifyRenderer('update-error', { error: this.state.error });

      // 尝试错误恢复
      const recoveryManagerTimeout = ErrorRecoveryManager.getInstance();
      if (recoveryManagerTimeout) {
        await recoveryManagerTimeout.recover('network_error');
      }
      return;
    }

    // 其他网络错误
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('EAI_AGAIN')) {
      logError('❌ 网络连接错误');
      this.state.error = '网络连接失败，请检查网络设置';
      this.notifyRenderer('update-error', { error: this.state.error });
      return;
    }

    // 熔断器打开错误
    if (errorMessage.includes('Circuit breaker is OPEN')) {
      logError('❌ 更新服务暂时不可用（熔断器已打开）');
      this.state.error = '更新服务暂时不可用，请 1 分钟后重试';
      this.notifyRenderer('update-error', { error: this.state.error });
      return;
    }

    // 默认错误处理
    logError(`❌ 检查更新失败: ${err}`);
    this.state.error = errorMessage;
    this.notifyRenderer('update-error', { error: this.state.error });
  }

  /**
   * 下载更新（集成重试机制）
   */
  async downloadUpdate(): Promise<void> {
    try {
      logInfo('⬇️ 开始下载更新...');
      
      // 使用重试机制下载
      const result = await withRetry(
        () => autoUpdater.downloadUpdate(),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      if (!result.success) {
        throw result.error;
      }
      
      logInfo(`✅ 下载完成（重试次数: ${result.attempts}，总耗时: ${result.totalTimeMs}ms）`);
    } catch (err) {
      logError(`❌ 下载更新失败: ${err}`);
      this.state.error = err instanceof Error ? err.message : String(err);
      this.notifyRenderer('update-error', { error: this.state.error });
    }
  }

  /**
   * 安装更新并重启（添加用户状态保存）
   */
  quitAndInstall(): void {
    logInfo('🔄 准备安装更新...');
    
    // 1. 通知渲染进程保存用户工作状态
    this.notifyRenderer('update-will-install', { 
      message: '应用即将更新并重启，请保存您的工作',
      timeout: this.SAVE_STATE_TIMEOUT 
    });
    
    logInfo('⏳ 等待用户状态保存...');
    
    // 2. 等待保存完成（带超时保护）
    setTimeout(() => {
      logInfo('🔄 安装更新并重启应用...');
      
      // 停止后台检查
      this.stopPeriodicCheck();
      
      // 执行更新安装
      autoUpdater.quitAndInstall();
    }, this.SAVE_STATE_TIMEOUT);
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

  /**
   * 获取熔断器状态（用于调试）
   */
  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  /**
   * 重置熔断器（用于手动恢复）
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    logInfo('✅ 熔断器已重置');
  }
}

// 导出单例
export const updateManager = new UpdateManager();
