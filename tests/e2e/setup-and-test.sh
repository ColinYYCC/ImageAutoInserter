#!/bin/bash

# E2E 测试设置脚本

set -e

echo "📦 安装 Playwright 浏览器..."

# 安装 Playwright 浏览器
npx playwright install chromium --with-deps

echo "✅ Playwright 浏览器安装完成"

echo "📁 创建测试 fixtures..."
node -e "
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const fixturesDir = path.join(__dirname, 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// 创建测试 ZIP
const zipPath = path.join(fixturesDir, 'test-images.zip');
if (!fs.existsSync(zipPath)) {
  const zip = new AdmZip();
  const mockJpeg = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
  ]);
  zip.addFile('SKU001.jpg', mockJpeg);
  zip.addFile('SKU002.png', mockJpeg);
  zip.writeZip(zipPath);
  console.log('Created test-images.zip');
}

// 创建测试 Excel
const excelPath = path.join(fixturesDir, 'test-data.xlsx');
if (!fs.existsSync(excelPath)) {
  const XLSX = require('xlsx');
  const data = [
    { '商品编码': 'SKU001', '商品名称': 'Test Product 1' },
    { '商品编码': 'SKU002', '商品名称': 'Test Product 2' },
  ];
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, excelPath);
  console.log('Created test-data.xlsx');
}

// 创建损坏的 ZIP
const corruptedPath = path.join(fixturesDir, 'corrupted.zip');
if (!fs.existsSync(corruptedPath)) {
  fs.writeFileSync(corruptedPath, 'This is not a valid ZIP file');
  console.log('Created corrupted.zip');
}

// 创建空文件夹
const emptyDir = path.join(fixturesDir, 'empty-folder');
if (!fs.existsSync(emptyDir)) {
  fs.mkdirSync(emptyDir, { recursive: true });
  console.log('Created empty-folder');
}

console.log('✅ Test fixtures created successfully');
"

echo ""
echo "🎯 运行 E2E 测试..."
echo ""

# 运行测试
npm run test:e2e
