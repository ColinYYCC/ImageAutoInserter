import { ipcMain, shell, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { FILE_EXTENSIONS, getExtension, PROGRESS_CONFIG } from '../../shared/constants';
import { getPythonScriptPath, getProcessTempDirectory, getLogDirectory } from '../path-config';
import { toLongPath, SYSTEM_CONFIG, isWindows } from '../platform';
import { logWarn, writeLog } from '../utils/logging';
import { killProcess } from '../python-bridge';
import { getMainWindow } from '../servers/window-manager';

// ============ 类型定义 ============

interface ProcessStats {
  total?: number;
  totalRows?: number;
  success?: number;
  successRows?: number;
  failed?: number;
  failedRows?: number;
  successRate?: number;
}

interface ProcessResult {
  success: boolean;
  stats?: ProcessStats;
  outputPath?: string;
}

interface PythonProcessResult {
  success: boolean;
  stats?: ProcessStats;
  outputPath?: string;
  output_path?: string;
}

interface StartProcessParams {
  excelPath: string;
  imageSourcePath: string;
}

interface ProcessError {
  type: 'VALIDATION_ERROR' | 'EXTRACT_ERROR' | 'PROCESS_ERROR' | 'CONFIG_ERROR' | 'SYSTEM_ERROR';
  message: string;
  resolution: string;
}

// ============ 错误解析映射 ============

const ERROR_RESOLUTION_MAP: Record<string, string> = {
  FileNotFoundError: '请检查文件路径是否正确，文件可能不存在',
  ImportError: '请确保所有依赖包已正确安装',
  PermissionError: '请检查文件权限设置',
  MemoryError: '内存不足，请尝试处理较小的文件',
};

// ============ 辅助函数 ============

let pythonProcess: ChildProcess | null = null;
let isProcessing = false;
let wasCancelled = false;

function safeToString(data: Buffer | string): string {
  if (typeof data === 'string') return data;
  try {
    return new TextDecoder('utf-8').decode(data);
  } catch (decodeError) {
    writeLog('[safeToString] 解码失败:', String(decodeError));
    return data.toString();
  }
}

function safeParseJSON<T>(jsonString: string, fallback: T): T {
  try {
    const trimmed = jsonString.trim();
    if (!trimmed) return fallback;
    return JSON.parse(trimmed) as T;
  } catch (error) {
    writeLog(`[safeParseJSON] 解析失败: ${error}, 输入长度: ${jsonString.length}`);
    writeLog(`[safeParseJSON] 内容前100字符: ${jsonString.substring(0, 100)}`);
    return fallback;
  }
}

function safeCleanupTempDir(tempPath: string | null): void {
  if (tempPath && fs.existsSync(tempPath)) {
    try {
      fs.rmSync(tempPath, { recursive: true, force: true });
      writeLog('[safeCleanupTempDir] 临时目录已清理:', tempPath);
    } catch (cleanupError) {
      writeLog('[safeCleanupTempDir] 清理失败:', String(cleanupError));
    }
  }
}

function sendProgressIfValid(percent: number, current: string): void {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('progress', { percent, current });
  }
}

class ProgressThrottler {
  private lastProgressTime = 0;
  private throttleMs: number;

  constructor(throttleMs: number) {
    this.throttleMs = throttleMs;
  }

  shouldThrottle(): boolean {
    const now = Date.now();
    if (now - this.lastProgressTime < this.throttleMs) {
      return true;
    }
    this.lastProgressTime = now;
    return false;
  }

  reset(): void {
    this.lastProgressTime = 0;
  }
}

function parseErrorResolution(stderrOutput: string): string {
  for (const [error, resolution] of Object.entries(ERROR_RESOLUTION_MAP)) {
    if (stderrOutput.includes(error)) {
      return resolution;
    }
  }
  return '请检查 Python 脚本和输入文件';
}

export function translateErrorMessage(error: Error | string): { message: string; resolution: string } {
  const errorMsg = error instanceof Error ? error.message : String(error);

  if (errorMsg.includes('ENOENT') || errorMsg.includes('not found') || errorMsg.includes('找不到')) {
    return { message: '程序文件未找到', resolution: '请重新安装应用或检查安装完整性' };
  }
  if (errorMsg.includes('ImportError') || errorMsg.includes('ModuleNotFoundError')) {
    return { message: 'Python 依赖包缺失', resolution: '请在终端执行：pip install openpyxl Pillow' };
  }
  if (errorMsg.includes('EACCES') || errorMsg.includes('Permission denied') || errorMsg.includes('权限')) {
    return { message: '文件访问权限不足', resolution: '请检查文件和目录的读写权限' };
  }
  if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('timeout') || errorMsg.includes('超时')) {
    return { message: '处理超时', resolution: '请检查文件大小是否过大，或尝试处理较小的文件' };
  }
  if (errorMsg.includes('MemoryError') || errorMsg.includes('内存') || errorMsg.includes('out of memory')) {
    return { message: '内存不足', resolution: '请关闭其他应用程序释放内存，或处理较小的文件' };
  }
  if (errorMsg.includes('SIGTERM') || errorMsg.includes('SIGKILL') || errorMsg.includes('killed')) {
    return { message: '处理进程被终止', resolution: '可能是内存不足或手动取消，请重试' };
  }
  if (errorMsg.includes('编码') || errorMsg.includes('UnicodeDecodeError') || errorMsg.includes('UnicodeEncodeError')) {
    return { message: '文件编码错误', resolution: '请确保文件使用 UTF-8 编码，避免文件名包含特殊字符' };
  }

  return { message: '处理过程中发生错误', resolution: '请检查输入文件和日志，如有需要请重试' };
}

function validateProcessPath(filePath: string, type: 'excel' | 'image'): { valid: boolean; error?: string } {
  // 1. 基本验证
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: '路径不能为空' };
  }

  // 2. 解析并正规化
  const resolvedPath = path.resolve(filePath);
  const normalizedPath = path.normalize(resolvedPath);

  // 3. 必须是绝对路径
  if (!path.isAbsolute(normalizedPath)) {
    return { valid: false, error: '只支持绝对路径' };
  }

  // 4. 检查路径遍历
  const pathParts = normalizedPath.split(path.sep);
  if (pathParts.includes('..')) {
    return { valid: false, error: '路径包含非法序列' };
  }

  // 5. 验证文件类型
  const ext = path.extname(normalizedPath).toLowerCase();
  if (type === 'excel' && ext !== '.xlsx') {
    return { valid: false, error: 'Excel 文件必须是 .xlsx 格式' };
  }
  if (type === 'image' && !['.zip', '.rar', '.7z', ''].includes(ext)) {
    // 空扩展名表示文件夹
    const stat = fs.statSync(normalizedPath);
    if (!stat.isDirectory()) {
      return { valid: false, error: '图片来源必须是文件夹或压缩文件' };
    }
  }

  // 6. 验证文件存在
  if (!fs.existsSync(normalizedPath)) {
    return { valid: false, error: '文件不存在' };
  }

  return { valid: true };
}

// ============ 提取归档辅助函数 ============

async function extractArchiveIfNeeded(
  imageSourcePath: string,
  onProgress?: (percent: number, current: string) => void
): Promise<{ success: boolean; extractedPath?: string; needsCleanup?: boolean; error?: string }> {
  const ext = path.extname(imageSourcePath).toLowerCase();

  // 只对压缩文件进行提取
  if (ext !== '.rar' && ext !== '.7z') {
    return { success: true, extractedPath: imageSourcePath };
  }

  writeLog(`[extractArchiveIfNeeded] 检测到 ${ext === '.rar' ? 'RAR' : '7Z'} 文件，开始提取:`, imageSourcePath);

  if (onProgress) {
    onProgress(0, `准备提取 ${ext === '.rar' ? 'RAR' : '7Z'} 文件...`);
  }

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

  try {
    if (ext === '.rar') {
      return await extractRarArchive(imageSourcePath, imageExtensions, onProgress);
    } else {
      return await extract7zArchive(imageSourcePath, imageExtensions, onProgress);
    }
  } catch (error) {
    writeLog(`[extractArchiveIfNeeded] 提取失败:`, error);
    return { success: false, error: `提取 ${ext === '.rar' ? 'RAR' : '7Z'} 文件失败: ${error}` };
  }
}

async function extractRarArchive(
  imageSourcePath: string,
  _imageExtensions: string[],
  onProgress?: (percent: number, current: string) => void
): Promise<{ success: boolean; extractedPath?: string; needsCleanup?: boolean; error?: string }> {
  try {
    const unrarModule = await import('node-unrar-js');
    const createExtractorFromFile = unrarModule.createExtractorFromFile;

    if (typeof createExtractorFromFile !== 'function') {
      return { success: false, error: 'RAR 提取模块不可用' };
    }

    const tempDir = getProcessTempDirectory('imageautoinserter_');

    if (onProgress) {
      onProgress(1, '扫描 RAR 文件...');
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

    const extractor = await createExtractorFromFile({
      filepath: imageSourcePath,
      targetPath: tempDir,
    });

    const list = extractor.getFileList();
    const imageFiles: string[] = [];

    for (const fileHeader of list.fileHeaders) {
      if (fileHeader.flags?.directory) continue;
      const fileExt = path.extname(fileHeader.name).toLowerCase();
      if (imageExtensions.includes(fileExt)) {
        imageFiles.push(fileHeader.name);
      }
    }

    if (imageFiles.length === 0) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      return { success: false, error: 'RAR 文件中没有找到支持的图片文件' };
    }

    if (onProgress) {
      onProgress(2, `开始提取 ${imageFiles.length} 个图片...`);
    }

    const extractResult = extractor.extract({ files: imageFiles });
    let extractedCount = 0;

    for (const _ of extractResult.files) {
      extractedCount++;
      if (extractedCount % 100 === 0 || extractedCount === imageFiles.length) {
        const percent = Math.round(2 + (extractedCount / imageFiles.length) * 6);
        if (onProgress) {
          onProgress(percent, `提取图片 ${extractedCount}/${imageFiles.length}`);
        }
      }
    }

    if (onProgress) {
      onProgress(8, '整理文件结构...');
    }

    reorganizeExtractedFiles(tempDir);

    if (onProgress) {
      onProgress(10, '提取完成，准备处理...');
    }

    writeLog('[extractRarIfNeeded] RAR 提取完成，临时目录:', tempDir);
    writeLog('[extractRarIfNeeded] 提取的图片文件数量:', imageFiles.length);
    writeLog('[extractRarIfNeeded] 前10个图片文件:', JSON.stringify(imageFiles.slice(0, 10)));

    return {
      success: true,
      extractedPath: tempDir,
      needsCleanup: true,
    };
  } catch (error) {
    writeLog('[extractRarIfNeeded] RAR 提取失败:', error);
    return {
      success: false,
      error: `RAR 文件提取失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function extract7zArchive(
  imageSourcePath: string,
  _imageExtensions: string[],
  onProgress?: (percent: number, current: string) => void
): Promise<{ success: boolean; extractedPath?: string; needsCleanup?: boolean; error?: string }> {
  try {
    const sevenZip = require('7zip-min');

    const tempDir = getProcessTempDirectory('imageautoinserter_');

    if (onProgress) {
      onProgress(1, '扫描 7Z 文件...');
      onProgress(2, '开始提取文件...');
    }

    await new Promise<void>((resolve, reject) => {
      sevenZip.unpack(imageSourcePath, tempDir, (err: Error | null, output: string) => {
        if (err) {
          reject(err);
        } else {
          writeLog('[extract7zArchive] 7z unpack output:', output);
          resolve();
        }
      });
    });

    if (onProgress) {
      onProgress(8, '整理文件结构...');
    }

    reorganizeExtractedFiles(tempDir);

    if (onProgress) {
      onProgress(10, '提取完成，准备处理...');
    }

    writeLog('[extract7zArchive] 7Z 提取完成，临时目录:', tempDir);

    return {
      success: true,
      extractedPath: tempDir,
      needsCleanup: true,
    };
  } catch (error) {
    writeLog('[extract7zArchive] 7Z 提取失败:', error);
    return {
      success: false,
      error: `7Z 文件提取失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function reorganizeExtractedFiles(tempDir: string): void {
  const subDirs = (fs.readdirSync(tempDir, { recursive: false }) as string[]).filter(
    (item) => fs.statSync(path.join(tempDir, item)).isDirectory()
  );

  for (const subDir of subDirs) {
    const subDirPath = path.join(tempDir, subDir);
    const files = fs.readdirSync(subDirPath) as string[];

    for (const file of files) {
      const srcPath = path.join(subDirPath, file);
      const dstPath = path.join(tempDir, file);

      if (!fs.existsSync(dstPath)) {
        fs.renameSync(srcPath, dstPath);
      } else {
        const baseName = path.basename(file, path.extname(file));
        const extName = path.extname(file);
        fs.renameSync(srcPath, path.join(tempDir, `${baseName}_${Date.now()}${extName}`));
      }
    }
  }

  // 清理空子目录
  for (const subDir of subDirs) {
    const subDirPath = path.join(tempDir, subDir);
    const remaining = fs.readdirSync(subDirPath) as string[];
    if (remaining.length === 0) {
      fs.rmdirSync(subDirPath);
    }
  }
}

// ============ 结果解析函数（减少嵌套）============

function tryParseJsonWithMarkers(fullOutput: string): ProcessResult | null {
  const markerStart = '___RESULT_START___';
  const markerEnd = '___RESULT_END___';
  const jsonStart = fullOutput.indexOf(markerStart);
  const jsonEnd = fullOutput.indexOf(markerEnd);

  // 添加详细日志：解析前的输出信息
  writeLog('[IPC] ====== MARKER PARSE DEBUG ======');
  writeLog('[IPC] 输出总长度:', fullOutput.length);
  writeLog('[IPC] markerStart 位置:', jsonStart, 'markerEnd 位置:', jsonEnd);

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    writeLog('[IPC] 标记解析：未找到有效标记');
    // 输出前500字符帮助诊断
    writeLog('[IPC] 输出前500字符:', fullOutput.substring(0, 500));
    return null;
  }

  const jsonCandidate = fullOutput.substring(jsonStart + markerStart.length, jsonEnd).trim();
  writeLog('[IPC] 解析的 JSON 内容:', jsonCandidate);

  const parsed = safeParseJSON<Record<string, unknown> | null>(jsonCandidate, null);

  if (!parsed || typeof parsed !== 'object') {
    writeLog('[IPC] 标记解析：JSON 解析失败');
    return null;
  }

  // 检查是否有 success 字段（Python 返回的结构）
  if ('success' in parsed) {
    // 处理 Python 返回的结构
    // Python: { success, message, output_path, stats: { total, success, failed, skipped, successRate } }
    const pythonStats = parsed.stats as Record<string, unknown> | undefined;

    writeLog('[IPC] Python 返回的 parsed 对象:', JSON.stringify(parsed));
    writeLog('[IPC] Python stats:', JSON.stringify(pythonStats));

    const result: ProcessResult = {
      success: Boolean(parsed.success),
      outputPath: (parsed.output_path as string) || (parsed.outputPath as string) || '',
    };

    if (pythonStats && typeof pythonStats === 'object') {
      result.stats = {
        total: (pythonStats.total as number) || 0,
        success: (pythonStats.success as number) || 0,
        failed: (pythonStats.failed as number) || 0,
        successRate: (pythonStats.successRate as number) || 0,
      };
      writeLog('[IPC] 提取的 stats:', JSON.stringify(result.stats));
    }

    writeLog('[IPC] JSON 解析成功（带标记），outputPath:', result.outputPath, 'stats:', result.stats);
    return result;
  }

  writeLog('[IPC] 标记解析：未找到 success 字段');
  return null;
}

function tryParseJsonWithBraces(fullOutput: string): ProcessResult | null {
  const braceStart = fullOutput.indexOf('{');
  const braceEnd = fullOutput.lastIndexOf('}');

  // 添加详细日志：降级解析诊断
  writeLog('[IPC] ====== BRACE PARSE DEBUG ======');
  writeLog('[IPC] 输出总长度:', fullOutput.length);
  writeLog('[IPC] 第一个 { 位置:', braceStart, '最后一个 } 位置:', braceEnd);

  if (braceStart === -1 || braceEnd === -1 || braceEnd <= braceStart) {
    writeLog('[IPC] 降级解析：未找到有效花括号');
    return null;
  }

  const jsonCandidate = fullOutput.substring(braceStart, braceEnd + 1);
  writeLog('[IPC] 降级解析提取的 JSON 长度:', jsonCandidate.length);
  writeLog('[IPC] 降级解析提取的 JSON 内容:', jsonCandidate);

  if (jsonCandidate.length < PROGRESS_CONFIG.MIN_JSON_LENGTH) {
    writeLog('[IPC] 降级解析内容太短，长度:', jsonCandidate.length, '最小要求:', PROGRESS_CONFIG.MIN_JSON_LENGTH);
    return null;
  }

  const parsed = safeParseJSON<Record<string, unknown> | null>(jsonCandidate, null);

  if (!parsed || typeof parsed !== 'object') {
    writeLog('[IPC] 降级解析：JSON 解析失败');
    return null;
  }

  writeLog('[IPC] 降级解析 parsed 对象:', JSON.stringify(parsed));

  // 尝试从 payload 字段解析
  if ('payload' in parsed && typeof parsed.payload === 'object' && parsed.payload !== null) {
    const payload = parsed.payload as Record<string, unknown>;
    writeLog('[IPC] 降级解析：从 payload 提取');
    return {
      success: true,
      stats: {
        total: (payload.total as number) || 0,
        success: (payload.success as number) || 0,
        failed: (payload.failed as number) || 0,
        successRate: (payload.successRate as number) || 0,
      },
      outputPath: (payload.outputPath as string) || '',
    };
  }

  // 尝试解析 Python 返回的结构
  // Python: { success, message, output_path, stats: { total, success, failed, skipped, successRate } }
  if ('success' in parsed) {
    const pythonStats = parsed.stats as Record<string, unknown> | undefined;

    writeLog('[IPC] 降级解析：Python 结构，stats:', JSON.stringify(pythonStats));

    const result: ProcessResult = {
      success: Boolean(parsed.success),
      outputPath: (parsed.output_path as string) || (parsed.outputPath as string) || '',
    };

    if (pythonStats && typeof pythonStats === 'object') {
      result.stats = {
        total: (pythonStats.total as number) || 0,
        success: (pythonStats.success as number) || 0,
        failed: (pythonStats.failed as number) || 0,
        successRate: (pythonStats.successRate as number) || 0,
      };
      writeLog('[IPC] 降级解析提取的 stats:', JSON.stringify(result.stats));
    }

    writeLog('[IPC] 降级解析成功（Python 结构）');
    return result;
  }

  // 尝试从顶层字段解析（旧格式兼容）
  if ('total' in parsed && 'success' in parsed) {
    writeLog('[IPC] 降级解析：旧格式顶层解析');
    return {
      success: true,
      stats: {
        total: (parsed.total as number) || 0,
        success: (parsed.success as number) || 0,
        failed: (parsed.failed as number) || 0,
        successRate: (parsed.successRate as number) || 0,
      },
      outputPath: (parsed.outputPath as string) || (parsed.output_path as string) || '',
    };
  }

  writeLog('[IPC] 降级解析结果无效：无效的结构');
  return null;
}

function extractResultFromOutput(fullOutput: string): ProcessResult | null {
  // 方法1: 尝试使用标记解析
  const markedResult = tryParseJsonWithMarkers(fullOutput);
  if (markedResult) {
    return markedResult;
  }

  // 方法2: 使用降级解析（花括号定位）
  writeLog('[IPC] 标记定位失败，使用降级解析');
  return tryParseJsonWithBraces(fullOutput);
}

// ============ 进程处理函数 ============

function handleProcessError(
  code: number,
  stderr: string,
  resolve: (result: unknown) => void
): void {
  let errorMessage = `Python 进程异常退出，代码：${code}`;
  let resolution = parseErrorResolution(stderr);

  if (stderr) {
    const truncatedStderr = stderr.slice(-PROGRESS_CONFIG.MAX_STDERR_LENGTH);
    errorMessage += `\n\n错误详情：\n${truncatedStderr}`;
  }

  sendProgressIfValid(0, '');
  const window = getMainWindow();
  if (window) {
    window.webContents.send('error', {
      type: 'PROCESS_ERROR',
      message: errorMessage,
      resolution: resolution
    });
  }
  resolve({
    success: false,
    error: {
      type: 'PROCESS_ERROR' as const,
      message: errorMessage,
      resolution: resolution
    }
  });
}

function handleProcessSuccess(result: ProcessResult, resolve: (result: unknown) => void): void {
  const transformedResult = {
    total: result.stats?.total || 0,
    success: result.stats?.success || 0,
    failed: result.stats?.failed || 0,
    successRate: result.stats?.successRate || 0,
    outputPath: result.outputPath || (result as PythonProcessResult).output_path || '',
  };
  writeLog('[IPC] 转换后的结果:', transformedResult);
  const window = getMainWindow();
  if (window) {
    window.webContents.send('complete', transformedResult);
  }
  resolve({ success: true, result: transformedResult });
}

function createProcessErrorResult(
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
    }
  };
}

// ============ IPC Handler 拆分函数 ============

interface ProcessBuffers {
  stdoutBuffer: string;
  stderrOutput: string;
  completePayload: Record<string, unknown> | null;
  errorPayload: Record<string, unknown> | null;
}

function setupPythonProcessHandlers(
  process: ChildProcess,
  progressThrottler: ProgressThrottler
): ProcessBuffers {
  // 使用对象包装器来保持引用，确保在事件处理器中的修改能被外部访问
  const buffers: ProcessBuffers = {
    stdoutBuffer: '',
    stderrOutput: '',
    completePayload: null,
    errorPayload: null
  };

  const parseProgressFromLine = (line: string) => {
    const progressMatch = line.match(/进度[：:]\s*(\d+)%?\s*-?\s*(.*)/);
    if (progressMatch) {
      if (progressThrottler.shouldThrottle()) {
        return;
      }
      const percent = parseInt(progressMatch[1], 10);
      const current = progressMatch[2]?.trim() || '';
      sendProgressIfValid(percent, current);
    }
  };

  process.stdout?.on('data', (data) => {
    const chunk = safeToString(data);
    buffers.stdoutBuffer += chunk;

    const lines = chunk.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (line.includes('进度')) {
        parseProgressFromLine(line);
      }

      try {
        const msg = JSON.parse(trimmed) as { type: string; payload?: Record<string, unknown> };
        if (msg.type === 'complete' && msg.payload) {
          buffers.completePayload = msg.payload;
        } else if (msg.type === 'error' && msg.payload) {
          buffers.errorPayload = msg.payload;
        } else if (msg.type === 'progress' && msg.payload) {
          const percent = typeof msg.payload.percent === 'number' ? msg.payload.percent : 0;
          const current = typeof msg.payload.current === 'string' ? msg.payload.current : '';
          if (!progressThrottler.shouldThrottle()) {
            sendProgressIfValid(percent, current);
          }
        }
      } catch {
        // 非 JSON 行，忽略
      }
    }
  });

  process.stderr?.on('data', (data) => {
    const output = safeToString(data);
    buffers.stderrOutput += output;
    writeLog('[IPC] Python stderr:', output.substring(0, 500));
  });

  return buffers;
}

async function executePythonProcess(
  excelPath: string,
  effectiveImagePath: string
): Promise<ChildProcess> {
  const { scriptPath: pythonScriptPath, cwd } = getPythonScriptPath();

  writeLog('[IPC] Python 进程启动:');
  writeLog('   脚本路径:', pythonScriptPath);
  writeLog('   工作目录:', cwd);
  writeLog('   图片路径:', effectiveImagePath);

  if (!fs.existsSync(pythonScriptPath)) {
    throw new Error('Python 脚本不存在');
  }

  const pythonExecutable = SYSTEM_CONFIG.process.pythonExecutable;
  const pythonArgs: string[] = [
    '-u',
    pythonScriptPath,
    excelPath,
    effectiveImagePath
  ];

  const spawnEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: SYSTEM_CONFIG.process.envPathSetup + path.delimiter + (process.env.PATH || ''),
    PYTHONUNBUFFERED: '1',
    IMAGE_INSERTER_LOG_DIR: getLogDirectory(),
  };

  const spawnOptions: {
    cwd: string;
    stdio: ('ignore' | 'pipe')[];
    env: NodeJS.ProcessEnv;
  } = {
    cwd: isWindows() ? toLongPath(cwd) : cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: spawnEnv,
  };

  return spawn(pythonExecutable, pythonArgs, spawnOptions);
}

// ============ 主 Handler ============

export function registerProcessHandlers(): void {
  ipcMain.handle('start-process', async (_, { excelPath, imageSourcePath }: StartProcessParams) => {
    writeLog('[IPC] start-process 被调用');
    writeLog('   excelPath:', excelPath);
    writeLog('   imageSourcePath:', imageSourcePath);

    // ============ 验证输入路径 ============
    const excelValidation = validateProcessPath(excelPath, 'excel');
    if (!excelValidation.valid) {
      logWarn(`[SEC] Excel 路径验证失败: ${excelValidation.error}`);
      return createProcessErrorResult(
        'VALIDATION_ERROR',
        `Excel 文件验证失败: ${excelValidation.error}`,
        '请选择有效的 Excel 文件'
      );
    }

    const imageValidation = validateProcessPath(imageSourcePath, 'image');
    if (!imageValidation.valid) {
      logWarn(`[SEC] 图片来源路径验证失败: ${imageValidation.error}`);
      return createProcessErrorResult(
        'VALIDATION_ERROR',
        `图片来源验证失败: ${imageValidation.error}`,
        '请选择有效的图片来源'
      );
    }

    if (isProcessing) {
      writeLog('[IPC] 拒绝重复调用，已有处理任务在进行中');
      return createProcessErrorResult(
        'PROCESS_ERROR',
        '已有处理任务在进行中，请等待完成后重试',
        '请勿重复点击开始按钮'
      );
    }

    isProcessing = true;
    wasCancelled = false;
    let tempExtractedPath: string | null = null;

    const cleanupTemp = () => {
      safeCleanupTempDir(tempExtractedPath);
    };

    const sendExtractProgress = (percent: number, current: string) => {
      const adjustedPercent = Math.round(percent * PROGRESS_CONFIG.EXTRACT_MULTIPLIER);
      sendProgressIfValid(adjustedPercent, current);
    };

    return new Promise((resolve) => {
      let isResolved = false;
      const safeResolve = (result: unknown) => {
        if (!isResolved) {
          isResolved = true;
          isProcessing = false;
          cleanupTemp();
          resolve(result);
        }
      };

      (async () => {
        try {
          // ============ 提取归档文件 ============
          const rarResult = await extractArchiveIfNeeded(imageSourcePath, sendExtractProgress);

          if (!rarResult.success) {
            safeResolve(createProcessErrorResult(
              'EXTRACT_ERROR',
              rarResult.error || '文件提取失败',
              '请确保压缩文件未损坏'
            ));
            return;
          }

          const effectiveImagePath = rarResult.extractedPath || imageSourcePath;
          if (rarResult.needsCleanup) {
            tempExtractedPath = effectiveImagePath;
          }

          // ============ 启动 Python 进程 ============
          const proc = await executePythonProcess(excelPath, effectiveImagePath);
          pythonProcess = proc;

          proc.on('error', (err) => {
            writeLog('[IPC] 进程启动错误:', err.message);
          });

          const progressThrottler = new ProgressThrottler(PROGRESS_CONFIG.THROTTLE_MS);
          const buffers = setupPythonProcessHandlers(
            proc,
            progressThrottler
          );

          proc.on('close', (code) => {
            const cancelled = wasCancelled;
            wasCancelled = false;
            writeLog('[IPC] 进程关闭，代码:', code, 'wasCancelled:', cancelled);

            if (cancelled) {
              writeLog('[IPC] 进程因取消而关闭，跳过错误处理');
              safeResolve({ success: true, cancelled: true });
              pythonProcess = null;
              return;
            }

            // 优先使用逐行解析捕获的 complete 消息
            let result: ProcessResult | null = null;
            if (buffers.completePayload) {
              const payload = buffers.completePayload;
              result = {
                success: true,
                outputPath: (payload.outputPath as string) || (payload.output_path as string) || '',
                stats: {
                  total: (payload.total as number) || (payload.totalRows as number) || 0,
                  success: (payload.success as number) || (payload.successRows as number) || 0,
                  failed: (payload.failed as number) || (payload.failedRows as number) || 0,
                  successRate: (payload.successRate as number) || 0,
                }
              };
              writeLog('[IPC] 从逐行解析获取 complete 消息, outputPath:', result.outputPath);
            } else if (buffers.errorPayload) {
              const errPayload = buffers.errorPayload;
              writeLog('[IPC] 从逐行解析获取 error 消息:', JSON.stringify(errPayload).substring(0, 200));
            }

            // 回退：尝试从整个缓冲区解析
            if (!result) {
              const fullOutput = buffers.stdoutBuffer;
              writeLog('[IPC] 逐行解析未获取 complete，回退到缓冲区解析');
              writeLog('[IPC] 完整输出长度:', String(fullOutput.length));
              result = extractResultFromOutput(fullOutput);
            }

            writeLog('[IPC] 解析结果 outputPath:', result?.outputPath || 'null');
            if (result?.stats) {
              writeLog('[IPC] 解析结果 stats:', JSON.stringify(result.stats));
            }

            if (code !== 0 && code !== null && !buffers.completePayload) {
              handleProcessError(code, buffers.stderrOutput, safeResolve);
            } else if (result) {
              handleProcessSuccess(result, safeResolve);
            } else {
              const errPayload = buffers.errorPayload;
              if (errPayload) {
                safeResolve(createProcessErrorResult(
                  'PROCESS_ERROR',
                  (errPayload.message as string) || '处理过程中发生错误',
                  (errPayload.resolution as string) || '请检查输入文件或重试'
                ));
              } else {
                safeResolve(createProcessErrorResult(
                  'PROCESS_ERROR',
                  '未能解析处理结果',
                  '请检查输入文件或重试'
                ));
              }
            }
            pythonProcess = null;
          });
        } catch (err) {
          writeLog('[IPC] start-process 异常:', err);
          safeResolve(createProcessErrorResult(
            'SYSTEM_ERROR',
            err instanceof Error ? err.message : String(err),
            '请重试'
          ));
        }
      })();
    });
  });

  ipcMain.handle('cancel-process', () => {
    if (pythonProcess) {
      wasCancelled = true;
      killProcess(pythonProcess, pythonProcess.pid);
      pythonProcess = null;
      isProcessing = false;
      return { success: true };
    }
    return { success: false, error: '没有正在处理的进程' };
  });

  ipcMain.handle('open-file', async (_, filePath: string) => {
    writeLog(`[SEC] open-file 被调用，原始路径: ${filePath}`);
    try {
      // 1. 解析并正规化路径
      const resolvedPath = path.resolve(filePath);
      const normalizedPath = path.normalize(resolvedPath);

      // 2. 验证绝对路径
      if (!path.isAbsolute(normalizedPath)) {
        logWarn(`[SEC] 拒绝非绝对路径: ${filePath}`);
        return { success: false, error: '只支持绝对路径' };
      }

      // 3. 严格验证路径遍历（正规化后）
      const pathParts = normalizedPath.split(path.sep);
      if (pathParts.includes('..')) {
        logWarn(`[SEC] 阻止路径遍历攻击: ${filePath}`);
        return { success: false, error: '不允许路径遍历攻击' };
      }

      // 4. 验证文件类型
      const ext = getExtension(normalizedPath);
      if (!FILE_EXTENSIONS.ALL.includes(ext as typeof FILE_EXTENSIONS.ALL[number])) {
        logWarn(`[SEC] 拒绝打开不允许的文件类型: ${ext}`);
        return { success: false, error: `不允许打开此文件类型: ${ext}` };
      }

      // 5. 验证实际解析后的路径（防止符号链接攻击）
      let realPath: string;
      try {
        realPath = fs.realpathSync(normalizedPath);
      } catch {
        realPath = normalizedPath;
      }

      // 6. 检查是否在允许的目录范围内
      const allowedPrefixes = [
        app.getPath('documents'),
        app.getPath('desktop'),
        app.getPath('downloads'),
        app.getPath('temp'),
        app.getPath('userData'),
      ].map(p => path.normalize(p).toLowerCase());

      const realPathLower = realPath.toLowerCase();
      const isAllowed = allowedPrefixes.some(prefix =>
        realPathLower.startsWith(prefix)
      );

      if (!isAllowed) {
        logWarn(`[SEC] 拒绝访问不在允许范围内的路径: ${realPath}`);
        return { success: false, error: '路径不在允许范围内' };
      }

      // 7. 检查系统目录
      const systemPathPrefixes = new Set([
        'c:\\windows', 'c:\\program files', 'c:\\program files (x86)',
        '/etc', '/proc', '/sys', '/bin', '/sbin', '/usr/bin', '/usr/sbin'
      ]);
      for (const prefix of systemPathPrefixes) {
        if (realPathLower.startsWith(prefix)) {
          logWarn(`[SEC] 拒绝访问系统目录: ${realPath}`);
          return { success: false, error: '不允许访问系统目录' };
        }
      }

      // 8. 验证文件存在
      if (!fs.existsSync(realPath)) {
        logWarn(`[SEC] 文件不存在: ${realPath}`);
        return { success: false, error: '文件不存在' };
      }

      // 9. 打开文件
      const result = await shell.openPath(realPath);
      if (result) {
        writeLog(`[SEC] 文件打开失败: ${result}`);
        return { success: false, error: `打开文件失败: ${result}` };
      }
      writeLog(`[SEC] 成功打开文件: ${realPath}`);
      return { success: true };
    } catch (error) {
      writeLog(`[SEC] 打开文件异常: ${error}`);
      return { success: false, error: `打开文件时出错: ${error}` };
    }
  });

  writeLog('[IPC] Process handlers registered');
}

export function cancelProcess(): void {
  if (pythonProcess) {
    wasCancelled = true;
    killProcess(pythonProcess, pythonProcess.pid);
    pythonProcess = null;
    isProcessing = false;
  }
}
