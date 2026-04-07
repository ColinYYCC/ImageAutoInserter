import fs from 'fs';
import { dialog } from 'electron';
import { logInfo, logError } from './logger';
import { getRendererHtmlPath, getPreloadScriptPath, getScriptPaths } from './path-config';

interface FileCheck {
  name: string;
  path: string;
  required: boolean;
}

/**
 * 应用启动自检
 * 检查所有关键文件是否存在
 */
export function performStartupCheck(): boolean {
  logInfo('🔍 执行启动自检...');

  const checks: FileCheck[] = [
    { name: '渲染进程 HTML', path: getRendererHtmlPath(), required: true },
    { name: '预加载脚本', path: getPreloadScriptPath(), required: true },
  ];

  // 只在生产环境检查 Python 脚本
  if (process.env.NODE_ENV !== 'development') {
    const scriptPaths = getScriptPaths();
    checks.push(
      { name: 'Python CLI 脚本', path: scriptPaths.cliScript, required: true },
      { name: 'Python 工作目录', path: scriptPaths.workingDir, required: true }
    );
  }

  const missing: string[] = [];
  const results: string[] = [];

  for (const check of checks) {
    const exists = fs.existsSync(check.path);
    const status = exists ? '✅' : '❌';
    const required = check.required ? '(必需)' : '(可选)';
    const message = `${status} ${check.name} ${required}: ${check.path}`;

    results.push(message);

    if (!exists) {
      logError(`缺少文件: ${check.name} -> ${check.path}`);
      if (check.required) {
        missing.push(`${check.name}: ${check.path}`);
      }
    }
  }

  // 打印检查结果
  logInfo('启动自检结果:\n' + results.join('\n'));

  if (missing.length > 0) {
    const errorMessage = `以下必要文件缺失：\n\n${missing.join('\n')}\n\n请重新安装应用或联系技术支持。`;
    logError(`启动自检失败: ${errorMessage}`);

    dialog.showErrorBox(
      '应用启动失败',
      errorMessage
    );
    return false;
  }

  logInfo('✅ 启动自检通过');
  return true;
}

/**
 * 验证窗口是否正确加载
 */
export function validateWindowLoaded(window: Electron.BrowserWindow): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const startTime = Date.now();

    // 等待渲染进程稳定（初始延迟）
    const initialDelay = 1000;
    const timeout = 10000; // 10秒超时，给慢速系统更长时间

    setTimeout(() => {
      if (resolved) return;

      // 监听 did-finish-load 事件
      window.webContents.once('did-finish-load', () => {
        if (!resolved) {
          resolved = true;
          const elapsed = Date.now() - startTime;
          logInfo(`✅ 窗口加载完成（耗时 ${elapsed}ms）`);
          resolve(true);
        }
      });

      // 监听 did-fail-load 事件
      window.webContents.once('did-fail-load', (_, errorCode, errorDescription) => {
        if (!resolved) {
          resolved = true;
          logError(`❌ 窗口加载失败: ${errorCode} - ${errorDescription}`);
          resolve(false);
        }
      });

      // 监听渲染进程崩溃
      window.webContents.on('render-process-gone', (_event, details) => {
        if (!resolved) {
          resolved = true;
          logError(`❌ 渲染进程终止: ${details.reason}`);
          resolve(false);
        }
      });

      // 主超时逻辑
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          const elapsed = Date.now() - startTime;
          // 检查窗口是否仍然有效
          if (!window.isDestroyed() && window.webContents.isLoading()) {
            logError(`❌ 窗口加载超时（已等待 ${elapsed}ms）`);
            resolve(false);
          } else {
            // 窗口可能已经加载完成，只是事件未触发
            logInfo(`✅ 窗口已就绪（超时后验证，耗时 ${elapsed}ms）`);
            resolve(true);
          }
        }
      }, timeout - initialDelay);
    }, initialDelay);
  });
}
