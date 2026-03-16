/**
 * Excel 文件处理器
 * 优化版本：支持大文件的流式读取和异步验证
 */
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import {
  FileHandler,
  FileInfo,
  FileType,
  HandlerConfig,
  ValidationResult,
  ProcessingResult,
  ProcessingOptions,
  ProgressInfo
} from '../types';

export interface ExcelValidationOptions {
  maxHeaderSearchRows?: number;
  requiredColumns?: string[];
  sheetRows?: number;
}

export class ExcelHandler implements FileHandler {
  readonly config: HandlerConfig = {
    name: 'excel-handler',
    supportedTypes: [FileType.EXCEL],
    allowedExtensions: ['.xlsx', '.xls'],
    maxFileSize: 500 * 1024 * 1024, // 500MB
    options: {
      maxHeaderSearchRows: 60,
      requiredColumns: ['商品编码'],
      sheetRows: 60 // 大文件时只读取前60行
    }
  };

  private readonly LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB

  /**
   * 检查是否能处理此文件
   */
  canHandle(fileInfo: FileInfo): boolean {
    return fileInfo.type === FileType.EXCEL ||
           this.config.allowedExtensions?.includes(fileInfo.extension.toLowerCase()) ||
           false;
  }

  /**
   * 验证 Excel 文件
   * 优化：大文件使用流式读取，避免阻塞
   */
  async validate(
    fileInfo: FileInfo,
    options: ProcessingOptions = {}
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const validationOptions: ExcelValidationOptions = {
      ...this.config.options,
      ...options
    };

    try {
      // 检查文件是否存在
      if (!fs.existsSync(fileInfo.path)) {
        return {
          valid: false,
          error: '文件不存在',
          resolution: '请检查文件路径是否正确'
        };
      }

      // 报告进度
      options.progressCallback?.({
        percent: 10,
        current: 1,
        total: 5,
        stage: 'checking',
        message: '检查文件...'
      });

      const stat = fs.statSync(fileInfo.path);
      const fileSizeMB = stat.size / (1024 * 1024);

      // 检查文件大小
      if (stat.size > (this.config.maxFileSize || 0)) {
        return {
          valid: false,
          error: `文件大小超过限制 (${fileSizeMB.toFixed(2)}MB > ${(this.config.maxFileSize! / 1024 / 1024).toFixed(0)}MB)`,
          resolution: '请选择更小的文件'
        };
      }

      // 报告进度
      options.progressCallback?.({
        percent: 30,
        current: 2,
        total: 5,
        stage: 'reading',
        message: '读取文件内容...'
      });

      // 读取工作簿
      const workbook = await this.readWorkbook(fileInfo.path, stat.size);

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
          valid: false,
          error: 'Excel 文件中没有工作表',
          resolution: '请确保文件包含有效的工作表'
        };
      }

      // 报告进度
      options.progressCallback?.({
        percent: 60,
        current: 3,
        total: 5,
        stage: 'parsing',
        message: '解析表格结构...'
      });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (!data || data.length === 0) {
        return {
          valid: false,
          error: 'Excel 文件为空',
          resolution: '请确保文件包含数据'
        };
      }

      // 报告进度
      options.progressCallback?.({
        percent: 80,
        current: 4,
        total: 5,
        stage: 'validating',
        message: '验证表头...'
      });

      // 查找表头
      const headerResult = this.findHeaderRow(data, validationOptions);

      if (!headerResult.found) {
        return {
          valid: false,
          error: `Excel 文件中未找到"${validationOptions.requiredColumns?.join('"或"')}"列`,
          resolution: `请确保 Excel 文件包含"${validationOptions.requiredColumns?.join('"、"')}"列`,
          metadata: { totalRows: data.length }
        };
      }

      // 报告进度
      options.progressCallback?.({
        percent: 100,
        current: 5,
        total: 5,
        stage: 'completed',
        message: '验证完成'
      });

      const duration = Date.now() - startTime;

      return {
        valid: true,
        metadata: {
          headers: headerResult.headers,
          headerRowIndex: headerResult.rowIndex,
          totalRows: data.length,
          fileSizeMB: fileSizeMB.toFixed(2),
          duration: `${duration}ms`,
          isLargeFile: stat.size > this.LARGE_FILE_THRESHOLD
        }
      };
    } catch (error) {
      console.error('[ExcelHandler] Validation error:', error);
      return {
        valid: false,
        error: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
        resolution: '请检查文件是否损坏或格式是否正确'
      };
    }
  }

  /**
   * 处理 Excel 文件
   */
  async process(
    fileInfo: FileInfo,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // 首先验证
      const validationResult = await this.validate(fileInfo, options);
      if (!validationResult.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: validationResult.error || '验证失败',
            resolution: validationResult.resolution
          }
        };
      }

      // 处理逻辑（示例）
      options.progressCallback?.({
        percent: 0,
        current: 0,
        total: 100,
        stage: 'processing',
        message: '开始处理...'
      });

      // 模拟处理过程
      await this.simulateProcessing(options.progressCallback);

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          filePath: fileInfo.path,
          headers: validationResult.metadata?.headers,
          processedAt: new Date().toISOString()
        },
        metrics: {
          startTime,
          endTime: Date.now(),
          duration
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : '处理失败',
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }

  /**
   * 读取工作簿（优化版本）
   * 大文件使用限制行数的方式读取
   */
  private async readWorkbook(filePath: string, fileSize: number): Promise<xlsx.WorkBook> {
    const isLargeFile = fileSize > this.LARGE_FILE_THRESHOLD;

    return new Promise((resolve, reject) => {
      try {
        // 使用 setImmediate 避免阻塞事件循环
        setImmediate(() => {
          try {
            if (isLargeFile) {
              console.log(`[ExcelHandler] Large file detected (${(fileSize / 1024 / 1024).toFixed(2)}MB), using optimized reading`);
              // 大文件：只读取前 N 行
              const workbook = xlsx.readFile(filePath, {
                sheetRows: this.config.options.sheetRows || 60,
                cellFormula: false, // 不解析公式
                cellHTML: false,    // 不解析 HTML
                cellNF: false,      // 不解析数字格式
                cellStyles: false   // 不解析样式
              });
              resolve(workbook);
            } else {
              // 小文件：正常读取
              const workbook = xlsx.readFile(filePath);
              resolve(workbook);
            }
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 查找表头行
   */
  private findHeaderRow(
    data: any[][],
    options: ExcelValidationOptions
  ): { found: boolean; rowIndex: number; headers: string[] } {
    const maxSearchRows = options.maxHeaderSearchRows || 60;
    const requiredColumns = options.requiredColumns || ['商品编码'];

    for (let i = 0; i < Math.min(maxSearchRows, data.length); i++) {
      const row = data[i];
      if (!row || !Array.isArray(row)) continue;

      const rowHeaders = row.map((h: any) => String(h || '').trim());

      // 检查是否包含必需的列
      const hasRequiredColumn = requiredColumns.some(col =>
        rowHeaders.includes(col)
      );

      if (hasRequiredColumn) {
        return {
          found: true,
          rowIndex: i,
          headers: rowHeaders
        };
      }
    }

    return { found: false, rowIndex: -1, headers: [] };
  }

  /**
   * 模拟处理过程（用于演示）
   */
  private async simulateProcessing(
    progressCallback?: (progress: ProgressInfo) => void
  ): Promise<void> {
    const stages = [
      { percent: 20, message: '读取数据...' },
      { percent: 40, message: '处理图片...' },
      { percent: 60, message: '插入到表格...' },
      { percent: 80, message: '保存文件...' },
      { percent: 100, message: '完成' }
    ];

    for (let i = 0; i < stages.length; i++) {
      await this.delay(200);
      progressCallback?.({
        percent: stages[i].percent,
        current: i + 1,
        total: stages.length,
        stage: 'processing',
        message: stages[i].message
      });
    }
  }

  /**
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
export const excelHandler = new ExcelHandler();
