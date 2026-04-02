#!/usr/bin/env node
/**
 * 诊断脚本：检查打包后的文件结构
 *
 * 用法：node scripts/diagnose-packaged.js <path-to-app-contents>
 *
 * macOS 示例：node scripts/diagnose-packaged.js "/Applications/ImageAutoInserter.app/Contents"
 * Windows 示例：node scripts/diagnose-packaged.js "release/win-unpacked"
 */

const fs = require('fs');
const path = require('path');

function checkDir(dirPath, indent = '') {
  if (!fs.existsSync(dirPath)) {
    console.log(`${indent}❌ 目录不存在: ${dirPath}`);
    return;
  }

  console.log(`${indent}📂 ${path.basename(dirPath)}/`);

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries.slice(0, 20)) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        console.log(`${indent}  📁 node_modules/ (省略内容)`);
      } else if (entry.name === 'app.asar' || entry.name === 'app') {
        console.log(`${indent}  📁 ${entry.name}/`);
        checkDir(path.join(dirPath, entry.name), indent + '    ');
      } else {
        checkDir(fullPath, indent + '  ');
      }
    } else {
      const size = fs.statSync(fullPath).size;
      const sizeStr = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${(size / 1024).toFixed(1)}KB`;
      console.log(`${indent}  📄 ${entry.name} (${sizeStr})`);
    }
  }

  if (entries.length > 20) {
    console.log(`${indent}  ... 还有 ${entries.length - 20} 个项目`);
  }
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${description}: ${filePath}`);
  return exists;
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('用法: node scripts/diagnose-packaged.js <path-to-app-contents>');
  console.log('');
  console.log('示例 (macOS):');
  console.log('  node scripts/diagnose-packaged.js "/Applications/ImageAutoInserter.app/Contents"');
  console.log('');
  console.log('示例 (Windows):');
  console.log('  node scripts/diagnose-packaged.js "release/win-unpacked"');
  process.exit(1);
}

const contentsPath = args[0];

console.log('='.repeat(60));
console.log('🔍 Electron 打包诊断');
console.log('='.repeat(60));
console.log('');

console.log('📁 Contents 目录结构:');
console.log('');
checkDir(contentsPath);

console.log('');
console.log('='.repeat(60));
console.log('🔑 关键文件检查:');
console.log('');

const resourcesPath = path.join(contentsPath, 'Resources');
const appPath = path.join(resourcesPath, 'app');

checkFile(path.join(resourcesPath, 'python', 'cli.py'), 'Python CLI');
checkFile(path.join(appPath, 'dist', 'main', 'main.js'), '主进程入口');
checkFile(path.join(appPath, 'dist', 'main', 'preload.js'), '预加载脚本');
checkFile(path.join(appPath, 'dist', 'renderer', 'index.html'), '渲染进程HTML');
checkFile(path.join(appPath, 'dist', 'renderer', 'assets'), '渲染进程assets目录');

const rendererAssetsPath = path.join(appPath, 'dist', 'renderer', 'assets');
if (fs.existsSync(rendererAssetsPath)) {
  console.log('');
  console.log('📁 渲染进程 assets 内容:');
  checkDir(rendererAssetsPath, '  ');
}

console.log('');
console.log('='.repeat(60));
