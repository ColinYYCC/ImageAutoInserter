/**
 * Python 桥接模块
 *
 * 负责主进程与 Python 后端通信
 * 支持开发环境（直接调用 Python）和生产环境（调用二进制）
 * 支持开发环境热更新 Python 代码
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawn, ChildProcess, execFileSync } from 'child_process';
import { logInfo, logError, logWarn } from './logger';
import { getPythonScriptPath, getPythonBinaryPath, getPythonBinaryDirectory, getLogDirectory, isAppPackaged } from './path-config';
import { isWindows, isMac, getShortPathName, SYSTEM_CONFIG } from './platform';
import { PROCESS_CONFIG } from '../shared/constants';

function sanitizePathForLogging(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    return filePath;
  }

  try {
    const homeDir = os.homedir();
    if (filePath.startsWith(homeDir)) {
      return filePath.replace(homeDir, '~');
    }

    if (isWindows()) {
      const userProfile = process.env.USERPROFILE;
      if (userProfile && filePath.toLowerCase().startsWith(userProfile.toLowerCase())) {
        return filePath.replace(userProfile, '~');
      }
    }

    return filePath;
  } catch {
    return filePath;
  }
}

export interface PythonProcess {
  process: ChildProcess;
  kill: () => void;
}

export interface ProcessOptions {
  excelPath: string;
  imageSource: string;
}

export interface ProgressUpdate {
  type: 'progress';
  payload: {
    percent: number;
    current: string;
  };
}

export interface ProcessComplete {
  type: 'complete';
  payload: {
    total: number;
    success: number;
    failed: number;
    successRate: number;
    outputPath: string;
    errors: string[];
  };
}

export interface ProcessError {
  type: 'error';
  payload: {
    type: string;
    message: string;
    resolution: string;
  };
}

export type PythonMessage = ProgressUpdate | ProcessComplete | ProcessError;

export class PythonBridge {
  private currentProcess: ChildProcess | null = null;
  private currentPid: number | null = null;
  private fileWatcher: fs.FSWatcher | null = null;
  private restartPending: boolean = false;
  private pendingOptions: ProcessOptions | null = null;
  private pendingOnMessage: ((message: PythonMessage) => void) | null = null;
  private pendingOnError: ((error: Error) => void) | null = null;

  private getExecutablePath(): string {
    const isDev = !isAppPackaged();

    if (isDev) {
      logInfo('[PythonBridge] 开发模式：使用系统 Python');
      return isWindows() ? 'python' : 'python3';
    }

    const binaryPath = getPythonBinaryPath();
    if (binaryPath) {
      logInfo(`[PythonBridge] 生产模式：使用二进制 ${binaryPath}`);
      return binaryPath;
    }

    logWarn('[PythonBridge] 二进制不存在，回退到 Python 脚本');
    return isWindows() ? 'python' : 'python3';
  }

  private getScriptPath(): string {
    const { scriptPath } = getPythonScriptPath();
    return scriptPath;
  }

  processExcel(
    options: ProcessOptions,
    onMessage: (message: PythonMessage) => void,
    onError: (error: Error) => void
  ): PythonProcess {
    const isDev = !isAppPackaged();

    this.pendingOptions = options;
    this.pendingOnMessage = onMessage;
    this.pendingOnError = onError;

    const executable = this.getExecutablePath();

    const args: string[] = [];
    const binaryPath = getPythonBinaryPath();
    const useBinary = binaryPath !== null;

    if (isDev || !useBinary) {
      const scriptPath = this.getScriptPath();
      args.push('-u');
      args.push(scriptPath);
    }

    args.push(options.excelPath);
    args.push(options.imageSource);

    const sanitizedArgs = args.map(arg => sanitizePathForLogging(arg));
    logInfo(`[PythonBridge] 启动处理进程: ${executable} ${sanitizedArgs.join(' ')}`);

    const bridgeEnv: NodeJS.ProcessEnv = {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      PYTHONIOENCODING: 'utf-8',
      IMAGE_INSERTER_LOG_DIR: getLogDirectory(),
    };

    if (isWindows()) {
      bridgeEnv.PATH = SYSTEM_CONFIG.process.envPathSetup + ';' + (process.env.PATH || '');
    } else if (isMac()) {
      bridgeEnv.PATH = SYSTEM_CONFIG.process.envPathSetup + ':' + (process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin');
    }

    let scriptCwd: string;
    if (isDev) {
      scriptCwd = path.dirname(this.getScriptPath());
    } else {
      scriptCwd = useBinary
        ? getPythonBinaryDirectory()
        : path.join(getPythonBinaryDirectory(), '..', 'python');
    }

    const spawnOptions: {
      stdio: ('ignore' | 'pipe')[];
      env: NodeJS.ProcessEnv;
      cwd?: string;
    } = {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: bridgeEnv,
    };

    if (isWindows() && scriptCwd) {
      const shortCwd = getShortPathName(scriptCwd);
      if (shortCwd !== scriptCwd) {
        logInfo(`[PythonBridge] 使用短路径: ${shortCwd}`);
      }
      spawnOptions.cwd = shortCwd;
    } else if (scriptCwd) {
      spawnOptions.cwd = scriptCwd;
    }

    const proc = spawn(executable, args, spawnOptions);
    this.currentProcess = proc;
    this.currentPid = proc.pid || null;

    if (proc.pid) {
      logInfo(`[PythonBridge] 进程 PID: ${proc.pid}`);
    }

    if (isDev) {
      this.setupFileWatcher();
    }

    const timeoutHandle = setTimeout(() => {
      logWarn(`[PythonBridge] 进程超时（${PROCESS_CONFIG.TIMEOUT_MS / 1000 / 60}分钟），强制终止`);
      if (!proc.killed) {
        // Windows 不支持 POSIX 信號，使用默認 kill()
        if (isWindows()) {
          proc.kill();
        } else {
          proc.kill('SIGKILL');
        }
      }
      onError(new Error('处理超时，请检查文件大小或内容'));
    }, PROCESS_CONFIG.TIMEOUT_MS);

    const stdoutBuffer = new BufferAccumulator();
    const stderrBuffer = new BufferAccumulator();

    proc.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer.append(data);

      const lines = stdoutBuffer.extractLines();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const message = JSON.parse(trimmed) as PythonMessage;
          logInfo(`[PythonBridge] 收到消息: ${message.type}`);
          onMessage(message);
        } catch (parseError) {
          logInfo(`[PythonBridge] 输出: ${trimmed}`);
        }
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderrBuffer.append(data);
      const errorMsg = data.toString().trim();
      if (errorMsg) {
        logError(`[PythonBridge] Python 错误: ${errorMsg}`);
      }
    });

    proc.on('close', (code: number | null) => {
      clearTimeout(timeoutHandle);
      logInfo(`[PythonBridge] 进程退出，代码: ${code}`);
      this.currentProcess = null;
      this.currentPid = null;

      const remainingData = stdoutBuffer.getRemaining();
      if (remainingData.trim()) {
        try {
          const message = JSON.parse(remainingData.trim()) as PythonMessage;
          onMessage(message);
        } catch (parseError) {
          logWarn(`[PythonBridge] 无法解析剩余数据: ${remainingData.substring(0, 100)}`);
        }
      }

      if (code !== 0 && code !== null) {
        const stderrContent = stderrBuffer.getRemaining();
        const errorMessage = stderrContent
          ? `Python 进程异常退出，代码: ${code}\n错误详情: ${stderrContent.slice(-2000)}`
          : `Python 进程异常退出，代码: ${code}`;
        onError(new Error(errorMessage));
      }
    });

    proc.on('error', (error: Error) => {
      logError(`[PythonBridge] 进程错误: ${error.message}`);
      this.currentProcess = null;
      this.currentPid = null;
      onError(error);
    });

    const self = this;
    return {
      process: proc,
      kill: () => {
        if (!proc || proc.killed) {
          return;
        }

        logInfo('[PythonBridge] 终止进程');

        if (isWindows() && self.currentPid) {
          try {
            execFileSync('taskkill', ['/pid', String(self.currentPid), '/T', '/F'], {
              encoding: 'utf-8',
              timeout: PROCESS_CONFIG.KILL_TIMEOUT_MS,
            });
            logInfo('[PythonBridge] taskkill 终止成功');
          } catch (e) {
            const err = e as Error;
            logError(`[PythonBridge] taskkill 终止失败: ${err?.message || String(e)}`);
            try {
              proc.kill('SIGTERM');
            } catch (sigtermError) {
              logError(`[PythonBridge] SIGTERM 终止失败: ${String(sigtermError)}`);
            }
          }
        } else {
          try {
            proc.kill('SIGTERM');
          } catch (sigtermError) {
            logError(`[PythonBridge] SIGTERM 终止失败: ${String(sigtermError)}`);
          }

          setTimeout(() => {
            if (proc && !proc.killed) {
              logWarn('[PythonBridge] 强制终止进程');
              try {
                proc.kill('SIGKILL');
              } catch (sigkillError) {
                logError(`[PythonBridge] SIGKILL 终止失败: ${String(sigkillError)}`);
              }
            }
          }, PROCESS_CONFIG.KILL_TIMEOUT_MS);
        }
      },
    };
  }

  private setupFileWatcher(): void {
    if (this.fileWatcher) {
      return;
    }

    const scriptPath = this.getScriptPath();
    const scriptDir = path.dirname(scriptPath);
    const srcDir = path.dirname(scriptDir);

    try {
      this.fileWatcher = fs.watch(srcDir, { recursive: true }, (_eventType, filename) => {
        if (filename && filename.endsWith('.py')) {
          logInfo(`[PythonBridge] 检测到 Python 文件变化: ${filename}`);
          this.handleFileChange();
        }
      });

      logInfo(`[PythonBridge] 已设置 Python 热更新监视: ${srcDir}`);
    } catch (error) {
      logWarn(`[PythonBridge] 设置文件监视失败: ${error}`);
    }
  }

  private handleFileChange(): void {
    if (this.restartPending) {
      return;
    }

    this.restartPending = true;
    logInfo('[PythonBridge] 准备重启 Python 进程...');

    if (this.currentProcess && !this.currentProcess.killed) {
      this.killCurrentProcess();
    }

    setTimeout(() => {
      if (this.pendingOptions && this.pendingOnMessage && this.pendingOnError) {
        logInfo('[PythonBridge] 重新启动 Python 进程（热更新）...');
        this.restartPending = false;
        this.processExcel(this.pendingOptions, this.pendingOnMessage, this.pendingOnError);
      } else {
        this.restartPending = false;
      }
    }, 500);
  }

  private cleanupFileWatcher(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
      logInfo('[PythonBridge] 已清理文件监视');
    }
  }

  killCurrentProcess(): void {
    this.cleanupFileWatcher();

    if (this.currentProcess && !this.currentProcess.killed) {
      logInfo(`[PythonBridge] 终止当前进程 (PID: ${this.currentPid})`);

      if (isWindows() && this.currentPid) {
        // Windows: 使用 taskkill 强制终止进程树
        try {
          execFileSync('taskkill', ['/pid', String(this.currentPid), '/T', '/F'], {
            encoding: 'utf-8',
            timeout: PROCESS_CONFIG.KILL_TIMEOUT_MS,
          });
          logInfo('[PythonBridge] taskkill 终止成功');
        } catch (e) {
          const err = e as Error;
          logError(`[PythonBridge] taskkill 失败: ${err?.message || String(e)}`);
          // 备用方案：尝试 SIGTERM
          try {
            this.currentProcess.kill('SIGTERM');
          } catch (sigtermError) {
            logError(`[PythonBridge] SIGTERM 失败: ${String(sigtermError)}`);
          }
        }
      } else {
        // macOS/Linux: 先尝试 SIGTERM，超时后使用 SIGKILL
        try {
          this.currentProcess.kill('SIGTERM');
          logInfo('[PythonBridge] SIGTERM 信号已发送');

          // 等待进程退出，超时后强制终止
          const killTimeout = setTimeout(() => {
            if (this.currentProcess && !this.currentProcess.killed) {
              logWarn('[PythonBridge] 进程未响应 SIGTERM，强制终止');
              try {
                this.currentProcess.kill('SIGKILL');
              } catch (sigkillError) {
                logError(`[PythonBridge] SIGKILL 失败: ${String(sigkillError)}`);
              }
            }
          }, PROCESS_CONFIG.KILL_TIMEOUT_MS);

          // 监听进程退出，清理定时器
          this.currentProcess.once('exit', () => {
            clearTimeout(killTimeout);
          });
        } catch (sigtermError) {
          logError(`[PythonBridge] SIGTERM 失败: ${String(sigtermError)}`);
        }
      }
    }

    // 重置状态
    this.currentProcess = null;
    this.currentPid = null;
    logInfo('[PythonBridge] 进程状态已重置');
  }
}

class BufferAccumulator {
  private buffer: string = '';
  private maxSize: number = PROCESS_CONFIG.BUFFER_MAX_SIZE;

  append(data: Buffer): void {
    const chunk = data.toString();
    if (this.buffer.length + chunk.length > this.maxSize) {
      logWarn('[BufferAccumulator] 缓冲区达到上限，截断旧数据');
      const overflow = (this.buffer.length + chunk.length) - this.maxSize;
      if (overflow > 0 && this.buffer.length > overflow) {
        this.buffer = this.buffer.slice(overflow);
      }
    }
    this.buffer += chunk;
  }

  extractLines(): string[] {
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';
    return lines;
  }

  getRemaining(): string {
    return this.buffer;
  }

  clear(): void {
    this.buffer = '';
  }
}

export const pythonBridge = new PythonBridge();

export function killProcess(proc: ChildProcess, pid: number | null | undefined): void {
  if (!proc || proc.killed) {
    return;
  }

  logInfo('[Process] 终止进程');

  if (isWindows() && pid) {
    try {
      execFileSync('taskkill', ['/pid', String(pid), '/T', '/F'], {
        encoding: 'utf-8',
        timeout: PROCESS_CONFIG.KILL_TIMEOUT_MS,
      });
      logInfo('[Process] taskkill 终止成功');
    } catch (e) {
      const err = e as Error;
      logError(`[Process] taskkill 终止失败: ${err?.message || String(e)}`);
      try {
        proc.kill('SIGTERM');
      } catch (sigtermError) {
        logError(`[Process] SIGTERM 终止失败: ${String(sigtermError)}`);
      }
    }
  } else {
    try {
      proc.kill('SIGTERM');
    } catch (sigtermError) {
      logError(`[Process] SIGTERM 终止失败: ${String(sigtermError)}`);
    }

    setTimeout(() => {
      if (proc && !proc.killed) {
        logWarn('[Process] 强制终止进程');
        try {
          proc.kill('SIGKILL');
        } catch (sigkillError) {
          logError(`[Process] SIGKILL 终止失败: ${String(sigkillError)}`);
        }
      }
    }, PROCESS_CONFIG.KILL_TIMEOUT_MS);
  }
}

const registeredTempDirs = new Set<string>();

export function registerTempDir(dirPath: string): void {
  registeredTempDirs.add(dirPath);
}

export function cleanupAllTemp(): void {
  if (registeredTempDirs.size === 0) {
    return;
  }

  const fs = require('fs');
  const path = require('path');

  for (const tempDir of registeredTempDirs) {
    try {
      // 驗證路徑安全性
      if (!tempDir || typeof tempDir !== 'string') {
        logWarn(`[Cleanup] 跳過無效路徑: ${tempDir}`);
        continue;
      }

      const resolvedPath = path.resolve(tempDir);
      const normalizedPath = path.normalize(resolvedPath);

      // 必須是絕對路徑
      if (!path.isAbsolute(normalizedPath)) {
        logWarn(`[Cleanup] 跳過非絕對路徑: ${tempDir}`);
        continue;
      }

      // 檢查路徑遍歷
      const pathParts = normalizedPath.split(path.sep);
      if (pathParts.includes('..')) {
        logWarn(`[Cleanup] 跳過包含遍歷序列的路徑: ${tempDir}`);
        continue;
      }

      // 驗證路徑在臨時目錄範圍內
      const tempBase = path.normalize(os.tmpdir()).toLowerCase();
      const normalizedLower = normalizedPath.toLowerCase();
      if (!normalizedLower.startsWith(tempBase)) {
        logWarn(`[Cleanup] 跳過不在臨時目錄範圍內的路徑: ${tempDir}`);
        continue;
      }

      if (fs.existsSync(normalizedPath)) {
        // 使用 fs.rmSync 安全刪除，避免 shell 注入
        try {
          fs.rmSync(normalizedPath, { recursive: true, force: true });
          logInfo(`[Cleanup] 成功刪除: ${normalizedPath}`);
        } catch (fsError) {
          logError(`[Cleanup] 刪除失敗: ${normalizedPath}, 錯誤: ${String(fsError)}`);
        }
      }
    } catch (error) {
      logError(`[Cleanup] 清理臨時目錄失敗: ${tempDir}, 錯誤: ${String(error)}`);
    }
  }

  registeredTempDirs.clear();
  logInfo('[Cleanup] All registered temp directories cleared');
}
