/**
 * 集成测试数据构建器
 * 用于创建测试所需的 Excel 文件、图片文件和压缩文件
 */

import fs from 'fs-extra';
import path from 'path';
import ExcelJS from 'exceljs';
import sharp from 'sharp';

export interface ImageInfo {
  code: string;
  sequence: number;
  size: number;
}

export interface ProcessStats {
  total: number;
  success: number;
  failed: number;
  successRate: number;
}

export interface DatasetOptions {
  rows?: number;
  matchRate?: number;
  basePath?: string;
}

export interface ArchiveOptions {
  images?: Array<{ code: string; sequence: number }>;
  files?: string[];
  structure?: Record<string, Array<{ code: string; sequence: number }>>;
}

/**
 * 创建测试图片
 */
async function createTestImage(code: string, sequence: number): Promise<Buffer> {
  const width = 100;
  const height = 100;
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#4A90E2"/>
      <text x="50%" y="50%" font-family="Arial" font-size="12" fill="white" text-anchor="middle" dy=".3em">
        ${code}-${sequence}
      </text>
    </svg>
  `;
  
  return await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * 创建测试 Excel 文件
 */
async function createTestExcel(excelPath: string, productCodes: string[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  
  worksheet.columns = [
    { header: '商品编码', key: 'code', width: 15 },
    { header: '商品名称', key: 'name', width: 30 },
    { header: '价格', key: 'price', width: 10 },
  ];
  
  productCodes.forEach((code, index) => {
    worksheet.addRow({
      code,
      name: `测试商品 ${index + 1}`,
      price: Math.floor(Math.random() * 1000) + 1,
    });
  });
  
  await workbook.xlsx.writeFile(excelPath);
}

/**
 * 创建 RAR 压缩文件
 */
async function createRar(sourceDir: string, rarPath: string): Promise<void> {
  const { default: Seven } = await import('7zip-min');
  
  return new Promise((resolve, reject) => {
    Seven.pack(sourceDir, rarPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * 测试数据构建器类
 */
export class FixtureBuilder {
  private tempDir: string;
  
  constructor(tempDir: string) {
    this.tempDir = tempDir;
  }
  
  /**
   * 创建有效的测试数据集
   */
  async createValidDataset(options: DatasetOptions = {}): Promise<{
    excelPath: string;
    imageSource: string;
    expectedStats: ProcessStats;
    originalImages: ImageInfo[];
  }> {
    const { rows = 10, matchRate = 1.0, basePath = '' } = options;
    
    const workDir = basePath 
      ? path.join(this.tempDir, basePath)
      : this.tempDir;
    
    await fs.ensureDir(workDir);
    
    const imageDir = path.join(workDir, 'images');
    await fs.ensureDir(imageDir);
    
    const productCodes = Array.from({ length: rows }, (_, i) => 
      `P${String(i + 1).padStart(3, '0')}`
    );
    
    const matchedCount = Math.floor(rows * matchRate);
    const originalImages: ImageInfo[] = [];
    
    for (let i = 0; i < matchedCount; i++) {
      const code = productCodes[i];
      for (let seq = 1; seq <= 3; seq++) {
        const imagePath = path.join(imageDir, `${code}-${seq}.jpg`);
        const imageData = await createTestImage(code, seq);
        await fs.writeFile(imagePath, imageData);
        originalImages.push({ code, sequence: seq, size: imageData.length });
      }
    }
    
    const excelPath = path.join(workDir, 'test.xlsx');
    await createTestExcel(excelPath, productCodes);
    
    return {
      excelPath,
      imageSource: imageDir,
      expectedStats: {
        total: rows,
        success: matchedCount,
        failed: rows - matchedCount,
        successRate: matchRate * 100,
      },
      originalImages,
    };
  }
  
  /**
   * 创建压缩文件
   */
  async createRarArchive(options: ArchiveOptions): Promise<string> {
    const workDir = path.join(this.tempDir, 'archive-work');
    const rarPath = path.join(this.tempDir, 'test.rar');
    
    await fs.ensureDir(workDir);
    
    if (options.images) {
      for (const img of options.images) {
        const imagePath = path.join(workDir, `${img.code}-${img.sequence}.jpg`);
        const imageData = await createTestImage(img.code, img.sequence);
        await fs.writeFile(imagePath, imageData);
      }
    }
    
    if (options.files) {
      for (const file of options.files) {
        await fs.writeFile(path.join(workDir, file), 'test content');
      }
    }
    
    if (options.structure) {
      for (const [subfolder, images] of Object.entries(options.structure)) {
        const subfolderPath = path.join(workDir, subfolder);
        await fs.ensureDir(subfolderPath);
        for (const img of images) {
          const imagePath = path.join(subfolderPath, `${img.code}-${img.sequence}.jpg`);
          const imageData = await createTestImage(img.code, img.sequence);
          await fs.writeFile(imagePath, imageData);
        }
      }
    }
    
    await createRar(workDir, rarPath);
    
    return rarPath;
  }
  
  /**
   * 创建损坏的文件
   */
  async createCorruptedFile(type: 'rar' | '7z' | 'xlsx'): Promise<string> {
    const filePath = path.join(this.tempDir, `corrupted.${type}`);
    
    const randomBytes = Buffer.alloc(1024);
    for (let i = 0; i < 1024; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
    await fs.writeFile(filePath, randomBytes);
    
    return filePath;
  }
  
  /**
   * 清理临时文件
   */
  async cleanup(): Promise<void> {
    await fs.remove(this.tempDir);
  }
}
