#!/usr/bin/env node
/**
 * 图标生成脚本
 * 
 * 使用方法:
 * node scripts/generate-icons.js
 * 
 * 需要安装依赖:
 * npm install -D sharp
 */

const fs = require('fs');
const path = require('path');

// 检查是否安装了 sharp
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  需要安装 sharp 模块');
  console.log('请运行: npm install -D sharp');
  process.exit(1);
}

const SVG_PATH = path.join(__dirname, '../build/icons/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../build/icons');

// 需要生成的尺寸
const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

async function generateIcons() {
  console.log('🎨 生成应用图标...\n');

  // 读取 SVG 文件
  const svgBuffer = fs.readFileSync(SVG_PATH);

  // 生成各种尺寸的 PNG
  console.log('📐 生成 PNG 图标:');
  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon_${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✅ ${size}x${size}`);
  }

  // 生成主 icon.png (512x512)
  const mainPngPath = path.join(OUTPUT_DIR, 'icon.png');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(mainPngPath);
  console.log(`  ✅ icon.png (512x512)`);

  console.log('\n📦 生成完成!');
  console.log(`\n输出目录: ${OUTPUT_DIR}`);
  console.log('\n注意: .icns (macOS) 和 .ico (Windows) 文件需要手动生成');
  console.log('或者使用在线工具: https://appicon.co/');
}

generateIcons().catch(err => {
  console.error('❌ 生成失败:', err);
  process.exit(1);
});
