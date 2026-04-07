import * as path from 'path';
import * as fs from 'fs';
import { getProcessTempDirectory } from '../path-config';
import { writeLog } from './logging';

export interface ExtractProgress {
  percent: number;
  current: string;
}

export interface ExtractResult {
  success: boolean;
  extractedPath?: string;
  needsCleanup?: boolean;
  error?: string;
}

export interface ExtractorOptions {
  imageExtensions?: string[];
  onProgress?: (progress: ExtractProgress) => void;
}

const DEFAULT_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

export function safeCleanupTempDir(tempPath: string | null): void {
  if (tempPath && fs.existsSync(tempPath)) {
    try {
      fs.rmSync(tempPath, { recursive: true, force: true });
      writeLog('[safeCleanupTempDir] 临时目录已清理:', tempPath);
    } catch (cleanupError) {
      writeLog('[safeCleanupTempDir] 清理失败:', String(cleanupError));
    }
  }
}

export class ArchiveExtractor {
  private imageExtensions: string[];

  constructor(options: ExtractorOptions = {}) {
    this.imageExtensions = options.imageExtensions || DEFAULT_IMAGE_EXTENSIONS;
  }

  public shouldExtract(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.rar' || ext === '.7z';
  }

  public async extractIfNeeded(
    filePath: string,
    onProgress?: (progress: ExtractProgress) => void
  ): Promise<ExtractResult> {
    if (!this.shouldExtract(filePath)) {
      return { success: true, extractedPath: filePath };
    }

    const ext = path.extname(filePath).toLowerCase();
    writeLog(`[ArchiveExtractor] 检测到 ${ext.toUpperCase()} 文件，开始提取:`, filePath);

    if (onProgress) {
      onProgress({ percent: 0, current: `准备提取 ${ext.toUpperCase()} 文件...` });
    }

    try {
      if (ext === '.rar') {
        return await this.extractRar(filePath, onProgress);
      } else {
        return await this.extract7z(filePath, onProgress);
      }
    } catch (error) {
      writeLog(`[ArchiveExtractor] 提取失败:`, error);
      return {
        success: false,
        error: `提取 ${ext.toUpperCase()} 文件失败: ${error}`,
      };
    }
  }

  private async extractRar(
    filePath: string,
    onProgress?: (progress: ExtractProgress) => void
  ): Promise<ExtractResult> {
    try {
      const unrarModule = await import('node-unrar-js');
      const createExtractorFromFile = unrarModule.createExtractorFromFile;

      if (typeof createExtractorFromFile !== 'function') {
        return { success: false, error: 'RAR 提取模块不可用' };
      }

      const tempDir = getProcessTempDirectory('imageautoinserter_');

      if (onProgress) {
        onProgress({ percent: 1, current: '扫描 RAR 文件...' });
      }

      const extractor = await createExtractorFromFile({
        filepath: filePath,
        targetPath: tempDir,
      });

      const list = extractor.getFileList();
      const imageFiles: string[] = [];

      for (const fileHeader of list.fileHeaders) {
        if (fileHeader.flags?.directory) continue;
        const fileExt = path.extname(fileHeader.name).toLowerCase();
        if (this.imageExtensions.includes(fileExt)) {
          imageFiles.push(fileHeader.name);
        }
      }

      if (imageFiles.length === 0) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        return { success: false, error: 'RAR 文件中没有找到支持的图片文件' };
      }

      if (onProgress) {
        onProgress({ percent: 2, current: `开始提取 ${imageFiles.length} 个图片...` });
      }

      const extractResult = extractor.extract({ files: imageFiles });
      let extractedCount = 0;

      for (const _ of extractResult.files) {
        extractedCount++;
        if (extractedCount % 100 === 0 || extractedCount === imageFiles.length) {
          const percent = Math.round(2 + (extractedCount / imageFiles.length) * 6);
          if (onProgress) {
            onProgress({ percent, current: `提取图片 ${extractedCount}/${imageFiles.length}` });
          }
        }
      }

      if (onProgress) {
        onProgress({ percent: 8, current: '整理文件结构...' });
      }

      this.reorganizeFiles(tempDir);

      if (onProgress) {
        onProgress({ percent: 10, current: '提取完成，准备处理...' });
      }

      writeLog('[ArchiveExtractor] RAR 提取完成，临时目录:', tempDir);
      writeLog('[ArchiveExtractor] 提取的图片文件数量:', imageFiles.length);

      return {
        success: true,
        extractedPath: tempDir,
        needsCleanup: true,
      };
    } catch (error) {
      writeLog('[ArchiveExtractor] RAR 提取失败:', error);
      return {
        success: false,
        error: `RAR 文件提取失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async extract7z(
    filePath: string,
    onProgress?: (progress: ExtractProgress) => void
  ): Promise<ExtractResult> {
    try {
      const sevenZip = require('7zip-min');
      const tempDir = getProcessTempDirectory('imageautoinserter_');

      if (onProgress) {
        onProgress({ percent: 1, current: '扫描 7Z 文件...' });
        onProgress({ percent: 2, current: '开始提取文件...' });
      }

      await new Promise<void>((resolve, reject) => {
        sevenZip.unpack(filePath, tempDir, (err: Error | null, output: string) => {
          if (err) {
            reject(err);
          } else {
            writeLog('[ArchiveExtractor] 7z unpack output:', output);
            resolve();
          }
        });
      });

      if (onProgress) {
        onProgress({ percent: 8, current: '整理文件结构...' });
      }

      this.reorganizeFiles(tempDir);

      if (onProgress) {
        onProgress({ percent: 10, current: '提取完成，准备处理...' });
      }

      writeLog('[ArchiveExtractor] 7Z 提取完成，临时目录:', tempDir);

      return {
        success: true,
        extractedPath: tempDir,
        needsCleanup: true,
      };
    } catch (error) {
      writeLog('[ArchiveExtractor] 7Z 提取失败:', error);
      return {
        success: false,
        error: `7Z 文件提取失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private reorganizeFiles(tempDir: string): void {
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

    for (const subDir of subDirs) {
      const subDirPath = path.join(tempDir, subDir);
      const remaining = fs.readdirSync(subDirPath) as string[];
      if (remaining.length === 0) {
        fs.rmdirSync(subDirPath);
      }
    }
  }
}

export async function extractArchiveIfNeeded(
  filePath: string,
  onProgress?: (progress: ExtractProgress) => void
): Promise<ExtractResult> {
  const extractor = new ArchiveExtractor();
  return extractor.extractIfNeeded(filePath, onProgress);
}