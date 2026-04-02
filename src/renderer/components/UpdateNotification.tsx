import React, { useState, useEffect } from 'react';
import styles from './UpdateNotification.module.css';

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  version: string | null;
  releaseNotes: string | null;
  progress: number;
}

type ViewState = 'hidden' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'details' | 'installing';

interface InstallData {
  message: string;
  timeout: number;
}

export const UpdateNotification: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdateState>({
    checking: false,
    available: false,
    downloaded: false,
    error: null,
    version: null,
    releaseNotes: null,
    progress: 0
  });
  const [viewState, setViewState] = useState<ViewState>('hidden');
  const [currentVersion, setCurrentVersion] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);
  const [installMessage, setInstallMessage] = useState('');

  useEffect(() => {
    if (!window.electronAPI) {
      return;
    }
    window.electronAPI.getAppVersion().then(({ version }) => {
      setCurrentVersion(version);
    });

    const unsubscribeChecking = window.electronAPI.onUpdateChecking(() => {
      setUpdateState(prev => ({ ...prev, checking: true, error: null }));
      setViewState('checking');
    });

    const unsubscribeAvailable = window.electronAPI.onUpdateAvailable((data) => {
      setUpdateState(prev => ({
        ...prev,
        checking: false,
        available: true,
        version: data.version,
        releaseNotes: data.releaseNotes || null
      }));
      if (!isDismissed) {
        setViewState('available');
      }
    });

    const unsubscribeNotAvailable = window.electronAPI.onUpdateNotAvailable(() => {
      setUpdateState(prev => ({
        ...prev,
        checking: false,
        available: false
      }));
      setTimeout(() => setViewState('hidden'), 1500);
    });

    const unsubscribeProgress = window.electronAPI.onUpdateProgress((data) => {
      setUpdateState(prev => ({ ...prev, progress: data.percent }));
      setViewState('downloading');
    });

    const unsubscribeDownloaded = window.electronAPI.onUpdateDownloaded(() => {
      setUpdateState(prev => ({
        ...prev,
        downloaded: true,
        progress: 100
      }));
      setViewState('downloaded');
    });

    const unsubscribeError = window.electronAPI.onUpdateError((data) => {
      setUpdateState(prev => ({
        ...prev,
        checking: false,
        error: data.error
      }));
      setViewState('error');
    });

    // 监听即将安装事件 - 保存用户状态
    const unsubscribeWillInstall = window.electronAPI.onUpdateWillInstall?.((data: InstallData) => {
      setInstallMessage(data.message);
      setViewState('installing');
      
      // 触发保存用户状态逻辑
      saveUserState();
    }) || (() => {});

    return () => {
      unsubscribeChecking();
      unsubscribeAvailable();
      unsubscribeNotAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
      unsubscribeError();
      unsubscribeWillInstall();
    };
  }, [isDismissed]);

  // 自动检查更新（启动后延迟检查）
  useEffect(() => {
    const timer = setTimeout(() => {
      handleManualCheck();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // 检查超时处理 - 如果10秒内没有响应，自动隐藏
  useEffect(() => {
    if (viewState === 'checking') {
      const timeoutTimer = setTimeout(() => {
        setViewState('hidden');
      }, 10000);
      return () => clearTimeout(timeoutTimer);
    }
  }, [viewState]);

  // 保存用户状态的函数
  const saveUserState = () => {
    // 保存当前表单数据到 localStorage
    try {
      const formData = {
        timestamp: new Date().toISOString(),
        // 可以添加更多需要保存的状态
      };
      localStorage.setItem('update_save_state', JSON.stringify(formData));
      console.log('用户状态已保存');
    } catch (e) {
      console.error('保存用户状态失败:', e);
    }
  };

  const handleDownload = async () => {
    await window.electronAPI.downloadUpdate();
  };

  const handleInstall = () => {
    window.electronAPI.quitAndInstall();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setViewState('hidden');
  };

  const handleManualCheck = async () => {
    if (!window.electronAPI) {
      return;
    }
    setUpdateState(prev => ({ ...prev, checking: true, error: null }));
    setViewState('checking');
    await window.electronAPI.checkForUpdates();
  };

  const handleShowDetails = () => {
    setViewState('details');
  };

  const handleBackToNotification = () => {
    setViewState('available');
  };

  // 隐藏状态 - 不显示任何内容
  if (viewState === 'hidden') {
    return null;
  }

  // 检查中状态 - 简洁的加载提示
  if (viewState === 'checking') {
    return (
      <div className={styles.notificationContainer}>
        <div className={`${styles.notificationCard} ${styles.checkingCard}`}>
          <div className={styles.checkingContent}>
            <div className={styles.spinner} />
            <span className={styles.checkingText}>正在检查更新...</span>
          </div>
        </div>
      </div>
    );
  }

  // 发现新版本 - 智能提示条
  if (viewState === 'available') {
    return (
      <div className={styles.notificationContainer}>
        <div className={`${styles.notificationCard} ${styles.availableCard}`}>
          <div className={styles.availableContent}>
            <div className={styles.iconWrapper}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className={styles.message}>
              <span className={styles.title}>发现新版本 v{updateState.version}</span>
              <span className={styles.subtitle}>当前: v{currentVersion}</span>
            </div>
            <div className={styles.actions}>
              <button onClick={handleShowDetails} className={styles.textButton}>
                详情
              </button>
              <button onClick={handleDownload} className={styles.primaryButton}>
                立即更新
              </button>
              <button onClick={handleDismiss} className={styles.closeButton}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 详情视图
  if (viewState === 'details') {
    return (
      <div className={styles.notificationContainer}>
        <div className={`${styles.notificationCard} ${styles.detailsCard}`}>
          <div className={styles.detailsHeader}>
            <div className={styles.iconWrapperLarge}>
              <svg className={styles.iconLarge} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className={styles.detailsTitle}>
              <h4>新版本可用</h4>
              <p>v{currentVersion} → v{updateState.version}</p>
            </div>
            <button onClick={handleDismiss} className={styles.closeButton}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {updateState.releaseNotes && (
            <div className={styles.releaseNotes}>
              <h5>更新内容</h5>
              <div className={styles.notesContent}>
                {updateState.releaseNotes}
              </div>
            </div>
          )}
          
          <div className={styles.detailsActions}>
            <button onClick={handleBackToNotification} className={styles.secondaryButton}>
              返回
            </button>
            <button onClick={handleDownload} className={styles.primaryButtonLarge}>
              下载更新
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 下载中状态
  if (viewState === 'downloading') {
    return (
      <div className={styles.notificationContainer}>
        <div className={`${styles.notificationCard} ${styles.downloadingCard}`}>
          <div className={styles.downloadingContent}>
            <div className={styles.progressInfo}>
              <span className={styles.progressText}>正在下载更新...</span>
              <span className={styles.progressPercent}>{Math.round(updateState.progress)}%</span>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${updateState.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 下载完成状态
  if (viewState === 'downloaded') {
    return (
      <div className={styles.notificationContainer}>
        <div className={`${styles.notificationCard} ${styles.downloadedCard}`}>
          <div className={styles.downloadedContent}>
            <div className={`${styles.iconWrapper} ${styles.successIcon}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className={styles.message}>
              <span className={styles.title}>更新已下载</span>
              <span className={styles.subtitle}>v{updateState.version} 准备就绪</span>
            </div>
            <div className={styles.actions}>
              <button onClick={handleDismiss} className={styles.textButton}>
                稍后
              </button>
              <button onClick={handleInstall} className={`${styles.primaryButton} ${styles.successButton}`}>
                立即安装
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 正在安装状态 - 显示保存状态提示
  if (viewState === 'installing') {
    return (
      <div className={styles.notificationContainer}>
        <div className={`${styles.notificationCard} ${styles.installingCard}`}>
          <div className={styles.installingContent}>
            <div className={styles.spinner} />
            <div className={styles.message}>
              <span className={styles.title}>正在准备更新</span>
              <span className={styles.subtitle}>{installMessage || '正在保存您的工作状态...'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (viewState === 'error') {
    return (
      <div className={styles.notificationContainer}>
        <div className={`${styles.notificationCard} ${styles.errorCard}`}>
          <div className={styles.errorContent}>
            <div className={`${styles.iconWrapper} ${styles.errorIcon}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className={styles.message}>
              <span className={styles.title}>检查更新失败</span>
              <span className={styles.subtitle}>{updateState.error}</span>
            </div>
            <div className={styles.actions}>
              <button onClick={handleDismiss} className={styles.textButton}>
                关闭
              </button>
              <button onClick={handleManualCheck} className={styles.primaryButton}>
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
