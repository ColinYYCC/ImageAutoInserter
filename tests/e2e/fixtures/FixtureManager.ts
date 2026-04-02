import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';

export interface TestFixtures {
  imageZip: string;
  validExcel: string;
  corruptedZip: string;
  emptyFolder: string;
}

class FixtureManager {
  private fixturesDir: string;

  constructor() {
    this.fixturesDir = path.join(__dirname, 'fixtures');
  }

  getFixturesDir(): string {
    return this.fixturesDir;
  }

  getFixturePath(fixtureName: string): string {
    return path.join(this.fixturesDir, fixtureName);
  }

  async createMinimalFixtures(): Promise<void> {
    try {
      if (!fs.existsSync(this.fixturesDir)) {
        fs.mkdirSync(this.fixturesDir, { recursive: true });
      }

      const zipPath = this.getFixturePath('test-images.zip');
      if (!fs.existsSync(zipPath)) {
        await this.createMinimalZip(zipPath);
      }

      const excelPath = this.getFixturePath('test-data.xlsx');
      if (!fs.existsSync(excelPath)) {
        await this.createMinimalExcel(excelPath);
      }

      console.log('Fixtures created successfully');
    } catch (error) {
      console.error('Failed to create fixtures:', error);
    }
  }

  private async createMinimalZip(zipPath: string): Promise<void> {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    const jpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    ]);

    zip.addFile('SKU001.jpg', jpegBuffer);
    zip.addFile('SKU002.jpg', jpegBuffer);

    zip.writeZip(zipPath);
  }

  private async createMinimalExcel(excelPath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    worksheet.columns = [
      { header: '商品编码', key: 'code', width: 15 },
      { header: '商品名称', key: 'name', width: 20 },
    ];

    worksheet.addRow({ code: 'SKU001', name: 'Test Product 1' });
    worksheet.addRow({ code: 'SKU002', name: 'Test Product 2' });

    await workbook.xlsx.writeFile(excelPath);
  }
}

export const fixtureManager = new FixtureManager();
export default fixtureManager;
