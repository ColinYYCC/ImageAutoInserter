import fs from 'fs';
import { dialog } from 'electron';
import { execFileSync } from 'child_process';
import { logInfo, logError } from './logger';
import { getRendererHtmlPath, getPreloadScriptPath, getScriptPaths } from './path-config';
import { isWindows } from './platform';

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

  if (process.env.NODE_ENV !== 'development') {
    const scriptPaths = getScriptPaths();
    const isNuitkaExe = isWindows() && scriptPaths.cliScript.endsWith('.exe');
    if (!isNuitkaExe) {
      checks.push(
        { name: 'Python GUI 脚本', path: scriptPaths.cliScript, required: true },
        { name: 'Python 工作目录', path: scriptPaths.workingDir, required: true }
      );
    }
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

const MIN_PYTHON_VERSION = '3.9.0';

function parsePythonVersion(versionStr: string): number[] {
  const match = versionStr.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function checkPythonAvailable(): boolean {
  if (isWindows() && getScriptPaths().cliScript.endsWith('.exe')) {
    logInfo('✅ Nuitka 编译模式，跳过 Python 可用性检查');
    return true;
  }

  const pythonCmd = isWindows() ? 'python' : 'python3';

  try {
    const output = execFileSync(pythonCmd, ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();

    const versionMatch = output.match(/Python (\d+\.\d+\.\d+)/);
    if (!versionMatch) {
      logError(`❌ 无法解析 Python 版本: ${output}`);
      showPythonInstallDialog();
      return false;
    }

    const currentVersion = parsePythonVersion(versionMatch[1]);
    const minVersion = parsePythonVersion(MIN_PYTHON_VERSION);

    if (compareVersions(currentVersion, minVersion) < 0) {
      logError(`❌ Python 版本过低: ${versionMatch[1]}，需要 ${MIN_PYTHON_VERSION}+`);
      dialog.showErrorBox(
        'Python 版本过低',
        `当前 Python 版本为 ${versionMatch[1]}，需要 ${MIN_PYTHON_VERSION} 或更高版本。\n\n请访问 https://www.python.org/downloads/ 下载最新版本。`
      );
      return false;
    }

    logInfo(`✅ Python 版本检查通过: ${versionMatch[1]}`);
    return true;
  } catch {
    logError('❌ 未检测到 Python 安装');
    showPythonInstallDialog();
    return false;
  }
}

function showPythonInstallDialog(): void {
  dialog.showErrorBox(
    '未检测到 Python',
    '应用需要 Python 3.9 或更高版本才能运行。\n\n请访问 https://www.python.org/downloads/ 下载安装 Python，安装时请勾选"Add Python to PATH"。'
  );
}

export function checkPythonDependencies(): boolean {
  if (isWindows() && getScriptPaths().cliScript.endsWith('.exe')) {
    logInfo('✅ Nuitka 编译模式，跳过 Python 依赖检查');
    return true;
  }

  const pythonCmd = isWindows() ? 'python' : 'python3';
  const requiredPackages = ['openpyxl', 'Pillow'];
  const missingPackages: string[] = [];

  for (const pkg of requiredPackages) {
    try {
      execFileSync(pythonCmd, ['-c', `import ${pkg}`], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      logInfo(`✅ Python 依赖检查通过: ${pkg}`);
    } catch {
      logError(`❌ Python 依赖缺失: ${pkg}`);
      missingPackages.push(pkg);
    }
  }

  if (missingPackages.length > 0) {
    const installCmd = `${pythonCmd} -m pip install ${missingPackages.join(' ')}`;
    dialog.showErrorBox(
      'Python 依赖缺失',
      `以下 Python 包未安装：${missingPackages.join('、')}\n\n请在终端执行以下命令安装：\n${installCmd}`
    );
    return false;
  }

  logInfo('✅ Python 依赖检查全部通过');
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
