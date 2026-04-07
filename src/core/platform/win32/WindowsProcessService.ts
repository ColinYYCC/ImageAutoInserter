/**
 * Windows 进程服务实现
 * 处理 Windows 特定进程操作
 */

import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import { ProcessService, SpawnOptions } from '../interfaces';

export class WindowsProcessService implements ProcessService {
  private _pythonExecutable: string = 'python';
  private _shellExecutable: string = 'cmd.exe';

  constructor() {
    this.findPythonExecutable();
  }

  private findPythonExecutable(): void {
    const pythonVersions = ['39', '310', '311', '312'];
    const searchPaths: string[] = [];

    for (let drive = 65; drive <= 90; drive++) {
      const driveLetter = String.fromCharCode(drive);

      for (const version of pythonVersions) {
        searchPaths.push(`${driveLetter}:\\Python${version}\\python.exe`);
        searchPaths.push(`${driveLetter}:\\Program Files\\Python${version}\\python.exe`);
      }
      searchPaths.push(`${driveLetter}:\\Anaconda3\\python.exe`);
      searchPaths.push(`${driveLetter}:\\Miniconda3\\python.exe`);
      searchPaths.push(`${driveLetter}:\\ProgramData\\Anaconda3\\python.exe`);
      searchPaths.push(`${driveLetter}:\\ProgramData\\Miniconda3\\python.exe`);
    }

    const userHome = os.homedir();
    searchPaths.push(`${userHome}\\anaconda3\\python.exe`);
    searchPaths.push(`${userHome}\\miniconda3\\python.exe`);

    for (const pythonPath of searchPaths) {
      if (fs.existsSync(pythonPath)) {
        this._pythonExecutable = pythonPath;
        console.info(`[WindowsProcess] 找到 Python: ${pythonPath}`);
        return;
      }
    }

    try {
      const { execSync } = require('child_process');
      const result = execSync('where python', { encoding: 'utf-8', timeout: 5000 });
      const lines = result.trim().split('\n');
      if (lines.length > 0) {
        this._pythonExecutable = lines[0].trim();
        console.info(`[WindowsProcess] 通过 where python 找到: ${this._pythonExecutable}`);
      }
    } catch {
      console.warn('[WindowsProcess] 查找 Python 失败，使用默认命令');
      this._pythonExecutable = 'python';
    }
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
    console.info(`[WindowsProcess] 启动 Python: ${pythonExe} ${spawnArgs.join(' ')}`);
    console.info(`[WindowsProcess] 工作目录: ${cwd}`);

    return spawn(pythonExe, spawnArgs, spawnOptions);
  }

  async terminateProcess(pid: number): Promise<void> {
    return new Promise((resolve) => {
      try {
        const { execFileSync } = require('child_process');
        execFileSync('taskkill', ['/F', '/PID', pid.toString()], {
          encoding: 'utf-8',
          timeout: 5000,
        });
        console.info(`[WindowsProcess] 终止进程成功: PID ${pid}`);
        resolve();
      } catch {
        console.warn(`[WindowsProcess] 终止进程失败: PID ${pid}`);
        resolve();
      }
    });
  }

  isProcessRunning(pid: number): boolean {
    try {
      const { execFileSync } = require('child_process');
      execFileSync('tasklist', ['/FI', `PID eq ${pid}`], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
