import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import { getPythonScriptPath, getLogDirectory } from '../path-config';
import { getShortPathName, SYSTEM_CONFIG } from '../platform';
import { platform } from '../../core/platform';
import { writeLog } from './logging';
import { ProcessResult, extractResultFromOutput } from './result-parser';

export interface ProcessError {
  type: 'VALIDATION_ERROR' | 'EXTRACT_ERROR' | 'PROCESS_ERROR' | 'CONFIG_ERROR' | 'SYSTEM_ERROR';
  message: string;
  resolution: string;
}

export interface ProcessBuffers {
  stdoutBuffer: string;
  stderrOutput: string;
}

export interface ProcessOptions {
  excelPath: string;
  imagePath: string;
  onProgress?: (percent: number, current: string) => void;
  onComplete?: (result: ProcessResult) => void;
  onError?: (error: ProcessError) => void;
}

export interface ProgressCallback {
  (percent: number, current: string): void;
}

export interface CompleteCallback {
  (result: ProcessResult): void;
}

export interface ErrorCallback {
  (error: ProcessError): void;
}

const ERROR_RESOLUTION_MAP: Record<string, string> = {
  FileNotFoundError: '请检查文件路径是否正确，文件可能不存在',
  ImportError: '请确保所有依赖包已正确安装',
  PermissionError: '请检查文件权限设置',
  MemoryError: '内存不足，请尝试处理较小的文件',
};

function safeToString(data: Buffer | string): string {
  if (typeof data === 'string') return data;
  try {
    return new TextDecoder('utf-8').decode(data);
  } catch (decodeError) {
    writeLog('[safeToString] 解码失败:', String(decodeError));
    return data.toString();
  }
}

export function parseErrorResolution(stderrOutput: string): string {
  for (const [error, resolution] of Object.entries(ERROR_RESOLUTION_MAP)) {
    if (stderrOutput.includes(error)) {
      return resolution;
    }
  }
  return '请检查 Python 脚本和输入文件';
}

export class ProcessManager {
  private process: ChildProcess | null = null;
  private buffers: ProcessBuffers = {
    stdoutBuffer: '',
    stderrOutput: '',
  };

  public async start(options: ProcessOptions): Promise<ChildProcess> {
    const { excelPath, imagePath } = options;
    const { scriptPath: pythonScriptPath, cwd } = getPythonScriptPath();

    writeLog('[ProcessManager] Python 进程启动:');
    writeLog('   脚本路径:', pythonScriptPath);
    writeLog('   工作目录:', cwd);
    writeLog('   图片路径:', imagePath);

    if (!fs.existsSync(pythonScriptPath)) {
      throw new Error('Python 脚本不存在');
    }

    const pythonExecutable = SYSTEM_CONFIG.process.pythonExecutable;

    const windowsShortPath = (p: string) => platform.isWindows() ? getShortPathName(p) : p;

    const pythonArgs: string[] = [
      '-u',
      windowsShortPath(pythonScriptPath),
      'process_excel',
      windowsShortPath(excelPath),
      windowsShortPath(imagePath),
    ];

    const spawnEnv: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: SYSTEM_CONFIG.process.envPathSetup + (platform.isWindows() ? ';' : ':') + (process.env.PATH || ''),
      PYTHONUNBUFFERED: '1',
      IMAGE_INSERTER_LOG_DIR: getLogDirectory(),
    };

    const spawnOptions: {
      cwd: string;
      stdio: ('ignore' | 'pipe')[];
      env: NodeJS.ProcessEnv;
    } = {
      cwd: platform.isWindows() ? getShortPathName(cwd) : cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: spawnEnv,
    };

    this.process = spawn(pythonExecutable, pythonArgs, spawnOptions);
    this.setupHandlers(options);

    return this.process;
  }

  private setupHandlers(options: ProcessOptions): void {
    if (!this.process) return;

    this.buffers = {
      stdoutBuffer: '',
      stderrOutput: '',
    };

    this.process.stdout?.on('data', (data) => {
      const chunk = safeToString(data);
      this.buffers.stdoutBuffer += chunk;

      const lines = chunk.split(/\r?\n/);
      lines.forEach((line: string) => {
        if (line.includes('进度')) {
          const progressMatch = line.match(/进度[：:]\s*(\d+)%?\s*-?\s*(.*)/);
          if (progressMatch && options.onProgress) {
            const percent = parseInt(progressMatch[1], 10);
            const current = progressMatch[2]?.trim() || '';
            options.onProgress(percent, current);
          }
        }
      });
    });

    this.process.stderr?.on('data', (data) => {
      const output = safeToString(data);
      this.buffers.stderrOutput += output;
      writeLog('[ProcessManager] Python stderr:', output.substring(0, 500));
    });

    this.process.on('error', (err) => {
      writeLog('[ProcessManager] 进程启动错误:', err.message);
      if (options.onError) {
        options.onError({
          type: 'SYSTEM_ERROR',
          message: `进程启动失败: ${err.message}`,
          resolution: '请检查 Python 环境配置',
        });
      }
    });

    this.process.on('close', (code) => {
      writeLog('[ProcessManager] 进程关闭，代码:', code);

      const fullOutput = this.buffers.stdoutBuffer;
      writeLog('[ProcessManager] ====== DEBUG OUTPUT PATH ======');
      writeLog('[ProcessManager] 完整输出长度:', String(fullOutput.length));
      writeLog('[ProcessManager] 完整输出前1000字符:', fullOutput.substring(0, Math.min(1000, fullOutput.length)));
      writeLog('[ProcessManager] 完整输出末尾500字符:', fullOutput.substring(Math.max(0, fullOutput.length - 500)));
      const startCount = (fullOutput.match(/___RESULT_START___/g) || []).length;
      const endCount = (fullOutput.match(/___RESULT_END___/g) || []).length;
      writeLog('[ProcessManager] ___RESULT_START___ 出现次数:', startCount, '___RESULT_END___ 出现次数:', endCount);

      if (code !== 0 && code !== null) {
        if (options.onError) {
          const errorMessage = `Python 进程异常退出，代码：${code}`;
          let detailedMessage = errorMessage;
          if (this.buffers.stderrOutput) {
            const truncatedStderr = this.buffers.stderrOutput.slice(-2000);
            detailedMessage += `\n\n错误详情：\n${truncatedStderr}`;
          }
          options.onError({
            type: 'PROCESS_ERROR',
            message: detailedMessage,
            resolution: parseErrorResolution(this.buffers.stderrOutput),
          });
        }
      } else {
        const result = extractResultFromOutput(fullOutput);
        writeLog('[ProcessManager] 解析结果 outputPath:', result?.outputPath || 'null');
        if (result?.stats) {
          writeLog('[ProcessManager] 解析结果 stats:', JSON.stringify(result.stats));
        }
        writeLog('[ProcessManager] ====== END DEBUG ======');

        if (result) {
          if (options.onComplete) {
            options.onComplete(result);
          }
        } else {
          const hasStartMarker = fullOutput.includes('___RESULT_START___');
          const hasEndMarker = fullOutput.includes('___RESULT_END___');
          writeLog('[ProcessManager] 解析失败诊断 - 开始标记:', hasStartMarker, '结束标记:', hasEndMarker);
          const jsonMatch = fullOutput.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            writeLog('[ProcessManager] 找到可能的 JSON 内容:', jsonMatch[0].substring(0, 200));
          }
          if (options.onError) {
            options.onError({
              type: 'PROCESS_ERROR',
              message: '未能解析处理结果',
              resolution: '请检查输入文件或重试',
            });
          }
        }
      }

      this.process = null;
    });
  }

  public stop(): boolean {
    if (this.process) {
      this.process.kill();
      this.process = null;
      return true;
    }
    return false;
  }

  public getOutput(): ProcessBuffers {
    return { ...this.buffers };
  }
}

export function createProcessErrorResult(
  errorType: ProcessError['type'],
  message: string,
  resolution: string
): { success: false; error: ProcessError } {
  return {
    success: false,
    error: {
      type: errorType,
      message,
      resolution,
    },
  };
}