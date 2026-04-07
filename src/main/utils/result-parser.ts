import { writeLog } from './logging';
import { PROGRESS_CONFIG } from '../../shared/constants';

export interface ProcessStats {
  total?: number;
  totalRows?: number;
  success?: number;
  successRows?: number;
  failed?: number;
  failedRows?: number;
  successRate?: number;
}

export interface ProcessResult {
  success: boolean;
  stats?: ProcessStats;
  outputPath?: string;
}

export interface ParseOptions {
  enableMarkers?: boolean;
  enableBraceFallback?: boolean;
  minJsonLength?: number;
}

export function safeParseJSON<T>(jsonString: string, fallback: T): T {
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

export class ResultParser {
  private options: Required<ParseOptions>;

  constructor(options: ParseOptions = {}) {
    this.options = {
      enableMarkers: options.enableMarkers ?? true,
      enableBraceFallback: options.enableBraceFallback ?? true,
      minJsonLength: options.minJsonLength ?? PROGRESS_CONFIG.MIN_JSON_LENGTH,
    };
  }

  public parse(fullOutput: string): ProcessResult | null {
    writeLog('[ResultParser] 开始解析输出，长度:', fullOutput.length);

    if (this.options.enableMarkers) {
      const markedResult = this.parseWithMarkers(fullOutput);
      if (markedResult) {
        writeLog('[ResultParser] 标记解析成功');
        return markedResult;
      }
      writeLog('[ResultParser] 标记解析失败，尝试降级解析');
    }

    if (this.options.enableBraceFallback) {
      const braceResult = this.parseWithBraces(fullOutput);
      if (braceResult) {
        writeLog('[ResultParser] 降级解析成功');
        return braceResult;
      }
    }

    writeLog('[ResultParser] 所有解析方法均失败');
    return null;
  }

  private parseWithMarkers(fullOutput: string): ProcessResult | null {
    const markerStart = '___RESULT_START___';
    const markerEnd = '___RESULT_END___';
    const jsonStart = fullOutput.indexOf(markerStart);
    const jsonEnd = fullOutput.indexOf(markerEnd);

    writeLog('[ResultParser] 标记位置 - start:', jsonStart, 'end:', jsonEnd);

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      writeLog('[ResultParser] 未找到有效标记');
      return null;
    }

    const jsonCandidate = fullOutput.substring(jsonStart + markerStart.length, jsonEnd).trim();
    writeLog('[ResultParser] 提取的 JSON:', jsonCandidate);

    const parsed = safeParseJSON<Record<string, unknown> | null>(jsonCandidate, null);

    if (!parsed || typeof parsed !== 'object') {
      writeLog('[ResultParser] JSON 解析失败');
      return null;
    }

    if ('success' in parsed) {
      return {
        success: Boolean(parsed.success),
        outputPath: this.extractOutputPath(parsed),
        stats: this.extractStats(parsed),
      };
    }

    writeLog('[ResultParser] 未找到 success 字段');
    return null;
  }

  private parseWithBraces(fullOutput: string): ProcessResult | null {
    const braceStart = fullOutput.indexOf('{');
    const braceEnd = fullOutput.lastIndexOf('}');

    writeLog('[ResultParser] 花括号位置 - start:', braceStart, 'end:', braceEnd);

    if (braceStart === -1 || braceEnd === -1 || braceEnd <= braceStart) {
      writeLog('[ResultParser] 未找到有效花括号');
      return null;
    }

    const jsonCandidate = fullOutput.substring(braceStart, braceEnd + 1);

    if (jsonCandidate.length < this.options.minJsonLength) {
      writeLog('[ResultParser] JSON 内容太短');
      return null;
    }

    writeLog('[ResultParser] 提取的 JSON 长度:', jsonCandidate.length);

    const parsed = safeParseJSON<Record<string, unknown> | null>(jsonCandidate, null);

    if (!parsed || typeof parsed !== 'object') {
      writeLog('[ResultParser] JSON 解析失败');
      return null;
    }

    if ('payload' in parsed && typeof parsed.payload === 'object' && parsed.payload !== null) {
      const payload = parsed.payload as Record<string, unknown>;
      writeLog('[ResultParser] 从 payload 提取');
      return {
        success: true,
        stats: this.extractStats(payload),
        outputPath: (payload.outputPath as string) || '',
      };
    }

    if ('success' in parsed) {
      writeLog('[ResultParser] Python 结构');
      return {
        success: Boolean(parsed.success),
        outputPath: this.extractOutputPath(parsed),
        stats: this.extractStats(parsed),
      };
    }

    const stats = this.extractStats(parsed);
    if (stats) {
      writeLog('[ResultParser] 旧格式顶层解析');
      return {
        success: true,
        stats,
        outputPath: this.extractOutputPath(parsed),
      };
    }

    writeLog('[ResultParser] 无效的结构');
    return null;
  }

  private extractStats(parsed: Record<string, unknown>): ProcessStats | undefined {
    if ('stats' in parsed && typeof parsed.stats === 'object' && parsed.stats !== null) {
      const pythonStats = parsed.stats as Record<string, unknown>;
      writeLog('[ResultParser] 提取 stats (Python 格式):', JSON.stringify(pythonStats));
      return {
        total: (pythonStats.total as number) || 0,
        success: (pythonStats.success as number) || 0,
        failed: (pythonStats.failed as number) || 0,
        successRate: (pythonStats.successRate as number) || 0,
      };
    }

    if ('total' in parsed || 'success' in parsed) {
      return {
        total: (parsed.total as number) || 0,
        success: (parsed.success as number) || 0,
        failed: (parsed.failed as number) || 0,
        successRate: (parsed.successRate as number) || 0,
      };
    }

    return undefined;
  }

  private extractOutputPath(parsed: Record<string, unknown>): string {
    return (parsed.output_path as string) || (parsed.outputPath as string) || '';
  }
}

export function parseProcessResult(
  fullOutput: string,
  options?: ParseOptions
): ProcessResult | null {
  const parser = new ResultParser(options);
  return parser.parse(fullOutput);
}

export function extractResultFromOutput(fullOutput: string): ProcessResult | null {
  return parseProcessResult(fullOutput);
}