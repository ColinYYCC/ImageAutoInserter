/**
 * macOS 进程服务实现
 * 处理 macOS 特定进程操作
 */

import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import { ProcessService, SpawnOptions } from '../interfaces';

export class MacProcessService implements ProcessService {
  private _pythonExecutable: string = 'python3';
  private _shellExecutable: string = '/bin/zsh';

  constructor() {
    this.findPythonExecutable();
  }

  private findPythonExecutable(): void {
    const isArm = process.arch === 'arm64';
    const searchPaths = isArm
      ? [
          '/opt/homebrew/bin/python3',
          '/usr/local/bin/python3',
          '/usr/bin/python3',
        ]
      : [
          '/usr/local/bin/python3',
          '/opt/homebrew/bin/python3',
          '/usr/bin/python3',
        ];

    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        this._pythonExecutable = p;
        console.info(`[MacProcess] 找到 Python: ${p}`);
        return;
      }
    }

    try {
      const { execSync } = require('child_process');
      const result = execSync('which python3', { encoding: 'utf-8', timeout: 5000 });
      const whichPath = result.trim();
      if (whichPath && fs.existsSync(whichPath)) {
        this._pythonExecutable = whichPath;
        console.info(`[MacProcess] 通过 which python3 找到: ${whichPath}`);
        return;
      }
    } catch {
      console.warn('[MacProcess] which python3 查找失败');
    }

    try {
      const { execSync } = require('child_process');
      const result = execSync('which python', { encoding: 'utf-8', timeout: 5000 });
      const whichPath = result.trim();
      if (whichPath && fs.existsSync(whichPath)) {
        this._pythonExecutable = whichPath;
        console.info(`[MacProcess] 通过 which python 找到: ${whichPath}`);
        return;
      }
    } catch {
      console.warn('[MacProcess] which python 查找失败');
    }

    console.warn('[MacProcess] 未找到 Python，回退到 python3');
    this._pythonExecutable = 'python3';
  }

  get pythonExecutable(): string {
    return this._pythonExecutable;
  }

  get shellExecutable(): string {
    return this._shellExecutable;
  }

  spawnPython(scriptPath: string, args: string[], options: SpawnOptions): ChildProcess {
    const pythonExe = this._pythonExecutable;
    const cwd = options.cwd || os.homedir();

    const spawnOptions: {
      cwd: string;
      stdio: ('ignore' | 'pipe')[];
      env: NodeJS.ProcessEnv;
    } = {
      cwd: cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...options.env,
        PYTHONUNBUFFERED: '1',
      },
    };

    const spawnArgs = ['-u', scriptPath, ...args];
    console.info(`[MacProcess] 启动 Python: ${pythonExe} ${spawnArgs.join(' ')}`);
    console.info(`[MacProcess] 工作目录: ${cwd}`);

    return spawn(pythonExe, spawnArgs, spawnOptions);
  }

  async terminateProcess(pid: number): Promise<void> {
    return new Promise((resolve) => {
      try {
        process.kill(pid, 'SIGTERM');
        setTimeout(() => {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {
            // 进程已终止
          }
          resolve();
        }, 1000);
      } catch {
        console.warn(`[MacProcess] 终止进程失败: PID ${pid}`);
        resolve();
      }
    });
  }

  isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
