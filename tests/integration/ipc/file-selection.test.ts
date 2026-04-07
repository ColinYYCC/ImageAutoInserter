/**
 * IPC 通信集成测试 - 文件选择和验证
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { FixtureBuilder } from '../helpers/fixture-builder';

describe('IPC: 文件选择和验证', () => {
  let fixtureBuilder: FixtureBuilder;
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integration-test-'));
    fixtureBuilder = new FixtureBuilder(tempDir);
  });
  
  afterEach(async () => {
    await fixtureBuilder.cleanup();
  });
  
  describe('正常流程', () => {
    test('创建有效的 Excel 文件应成功', async () => {
      const { excelPath } = await fixtureBuilder.createValidDataset({ rows: 10 });
      
      expect(await fs.pathExists(excelPath)).toBe(true);
      
      const stats = await fs.stat(excelPath);
      expect(stats.size).toBeGreaterThan(0);
    });
    
    test('创建有效的图片文件夹应成功', async () => {
      const { imageSource, originalImages } = await fixtureBuilder.createValidDataset({ rows: 5 });
      
      expect(await fs.pathExists(imageSource)).toBe(true);
      expect(originalImages.length).toBe(15); // 5 个商品,每个 3 张图片
      
      const files = await fs.readdir(imageSource);
      const imageFiles = files.filter(f => f.endsWith('.jpg'));
      expect(imageFiles.length).toBe(15);
    });
    
    test('创建压缩文件应成功', async () => {
      const rarPath = await fixtureBuilder.createRarArchive({
        images: [
          { code: 'P001', sequence: 1 },
          { code: 'P001', sequence: 2 },
          { code: 'P002', sequence: 1 },
        ],
      });
      
      expect(await fs.pathExists(rarPath)).toBe(true);
      
      const stats = await fs.stat(rarPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });
  
  describe('错误处理', () => {
    test('创建损坏的文件应成功', async () => {
      const corruptedRar = await fixtureBuilder.createCorruptedFile('rar');
      
      expect(await fs.pathExists(corruptedRar)).toBe(true);
      
      const buffer = await fs.readFile(corruptedRar);
      expect(buffer.length).toBe(1024);
    });
    
    test('部分匹配的数据集应正确计算统计信息', async () => {
      const { expectedStats } = await fixtureBuilder.createValidDataset({
        rows: 10,
        matchRate: 0.8,
      });
      
      expect(expectedStats.total).toBe(10);
      expect(expectedStats.success).toBe(8);
      expect(expectedStats.failed).toBe(2);
      expect(expectedStats.successRate).toBe(80);
    });
  });
  
  describe('数据完整性', () => {
    test('Excel 文件应包含正确的列和数据', async () => {
      const { excelPath } = await fixtureBuilder.createValidDataset({ rows: 5 });
      
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      
      const worksheet = workbook.getWorksheet(1);
      expect(worksheet.rowCount).toBe(6); // 1 header + 5 data rows
      
      const headerRow = worksheet.getRow(1);
      expect(headerRow.getCell(1).value).toBe('商品编码');
      expect(headerRow.getCell(2).value).toBe('商品名称');
      expect(headerRow.getCell(3).value).toBe('价格');
      
      const dataRow = worksheet.getRow(2);
      expect(dataRow.getCell(1).value).toBe('P001');
      expect(dataRow.getCell(2).value).toContain('测试商品');
      expect(typeof dataRow.getCell(3).value).toBe('number');
    });
    
    test('图片文件应包含正确的数据', async () => {
      const { imageSource } = await fixtureBuilder.createValidDataset({ rows: 2 });
      
      const imagePath = path.join(imageSource, 'P001-1.jpg');
      expect(await fs.pathExists(imagePath)).toBe(true);
      
      const buffer = await fs.readFile(imagePath);
      expect(buffer.length).toBeGreaterThan(0);
      
      // 验证是否为有效的 JPEG 文件
      expect(buffer[0]).toBe(0xFF);
      expect(buffer[1]).toBe(0xD8);
    });
  });
});
