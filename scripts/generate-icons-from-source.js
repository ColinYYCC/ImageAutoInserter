#!/usr/bin/env node
/**
 * 从用户提供的图标生成各种尺寸
 * 
 * 使用方法:
 * node scripts/generate-icons-from-source.js
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

const SOURCE_PATH = path.join(__dirname, '../build/icons/icon-source.png');
const OUTPUT_DIR = path.join(__dirname, '../build/icons');

// 需要生成的尺寸
const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

async function generateIcons() {
  console.log('🎨 从用户提供的图标生成各种尺寸...\n');

  // 检查源文件是否存在
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error('❌ 源文件不存在:', SOURCE_PATH);
    process.exit(1);
  }

  // 读取源文件
  const sourceBuffer = fs.readFileSync(SOURCE_PATH);

  // 生成各种尺寸的 PNG
  console.log('📐 生成 PNG 图标:');
  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon_${size}x${size}.png`);
    await sharp(sourceBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`  ✅ ${size}x${size}`);
  }

  // 生成主 icon.png (512x512)
  const mainPngPath = path.join(OUTPUT_DIR, 'icon.png');
  await sharp(sourceBuffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
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
