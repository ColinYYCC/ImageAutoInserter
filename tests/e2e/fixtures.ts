import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';

export const TEST_FIXTURES = {
  imageZip: path.join(__dirname, 'fixtures', 'test-images.zip'),
  validExcel: path.join(__dirname, 'fixtures', 'test-data.xlsx'),
  corruptedZip: path.join(__dirname, 'fixtures', 'corrupted.zip'),
  emptyFolder: path.join(__dirname, 'fixtures', 'empty-folder'),
} as const;

export async function ensureTestFixtures(): Promise<void> {
  const fixturesDir = path.join(__dirname, 'fixtures');

  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const zipPath = TEST_FIXTURES.imageZip;
  if (!fs.existsSync(zipPath)) {
    await createTestZip(zipPath);
  }

  const excelPath = TEST_FIXTURES.validExcel;
  if (!fs.existsSync(excelPath)) {
    await createTestExcel(excelPath);
  }

  const corruptedPath = TEST_FIXTURES.corruptedZip;
  if (!fs.existsSync(corruptedPath)) {
    fs.writeFileSync(corruptedPath, 'This is not a valid ZIP file');
  }

  const emptyDir = TEST_FIXTURES.emptyFolder;
  if (!fs.existsSync(emptyDir)) {
    fs.mkdirSync(emptyDir, { recursive: true });
  }
}

async function createTestZip(zipPath: string): Promise<void> {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    const mockJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07,
      0xFF, 0xD9,
    ]);

    zip.addFile('SKU001.jpg', mockJpeg);
    zip.addFile('SKU002.png', mockJpeg);

    zip.writeZip(zipPath);
  } catch (error) {
    console.error('Failed to create test ZIP:', error);
  }
}

async function createTestExcel(excelPath: string): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    worksheet.columns = [
      { header: '商品编码', key: 'code', width: 15 },
      { header: '商品名称', key: 'name', width: 20 },
    ];

    worksheet.addRow({ code: 'SKU001', name: 'Test Product 1' });
    worksheet.addRow({ code: 'SKU002', name: 'Test Product 2' });

    await workbook.xlsx.writeFile(excelPath);
  } catch (error) {
    console.error('Failed to create test Excel:', error);
  }
}
