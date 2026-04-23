const fs = require('fs');
const path = require('path');

function copyDir(src, dest, options) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  const extensions = options?.extensions;
  const excludeDirs = options?.excludeDirs || [];

  for (const entry of entries) {
    if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, options);
    } else {
      if (extensions && !extensions.some(ext => entry.name.endsWith(ext))) {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isMac() {
  return process.platform === 'darwin';
}

function isWindows() {
  return process.platform === 'win32';
}

// 清理 7zip-bin 中非当前平台的二进制文件
function prune7zipBinPlatforms() {
  const binDir = 'dist/main/node_modules/7zip-bin';
  if (!fs.existsSync(binDir)) return;

  const platformDirs = fs.readdirSync(binDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'index.js');

  const keepPlatform = isMac() ? 'mac' : 'win';
  let freedBytes = 0;

  for (const dir of platformDirs) {
    if (dir.name !== keepPlatform) {
      const dirPath = path.join(binDir, dir.name);
      const size = getDirSize(dirPath);
      freedBytes += size;
      cleanDir(dirPath);
      console.log(`  ✓ 7zip-bin: 移除非必要平台 ${dir.name}/ (${formatBytes(size)})`);
    }
  }

  if (freedBytes > 0) {
    console.log(`  ✓ 7zip-bin 平台清理完成，节省 ${formatBytes(freedBytes)}`);
  }
}

// 清理 node_modules 中的冗余文件
function pruneNodeModulesExtras() {
  const nodeDir = 'dist/main/node_modules';
  if (!fs.existsSync(nodeDir)) return;

  const patterns = [
    'LICENSE*', 'README*', 'CHANGELOG*', 'HISTORY*',
    '.eslintrc*', '.prettierrc*', '.editorconfig',
    'tsconfig.json', '.npmignore', '.gitignore',
    'package-lock.json', 'yarn.lock',
  ];

  let freedBytes = 0;

  const moduleDirs = fs.readdirSync(nodeDir, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const mod of moduleDirs) {
    const modPath = path.join(nodeDir, mod.name);
    const entries = fs.readdirSync(modPath);

    for (const entry of entries) {
      const fullPath = path.join(modPath, entry);
      const stat = fs.statSync(fullPath, { throwIfNoEntry: false });
      if (!stat) continue;

      const shouldRemove = patterns.some(pattern => {
        if (pattern.endsWith('*')) {
          return entry.startsWith(pattern.slice(0, -1));
        }
        return entry === pattern;
      });

      const isRedundantDir = ['test', 'tests', '__tests__', 'docs', '.github', 'src', '.cache'].includes(entry)
        && stat.isDirectory();

      if (shouldRemove || isRedundantDir) {
        const size = stat.isDirectory() ? getDirSize(fullPath) : stat.size;
        freedBytes += size;
        if (stat.isDirectory()) {
          cleanDir(fullPath);
        } else {
          fs.unlinkSync(fullPath);
        }
      }
    }
  }

  if (freedBytes > 0) {
    console.log(`  ✓ node_modules 冗余文件清理完成，节省 ${formatBytes(freedBytes)}`);
  }
}

function getDirSize(dir) {
  let size = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      try {
        size += fs.statSync(fullPath).size;
      } catch {}
    }
  }
  return size;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// 清理 release 目录中的中间产物
function cleanupRelease() {
  const version = JSON.parse(fs.readFileSync('package.json', 'utf-8')).version;
  const releaseDir = path.join('release', version);

  if (!fs.existsSync(releaseDir)) {
    console.log('⚠️ Release 目录不存在，跳过清理');
    return;
  }

  let freedBytes = 0;

  // 删除未打包的 Mac .app 目录
  const macDir = path.join(releaseDir, 'mac-arm64');
  if (fs.existsSync(macDir)) {
    const size = getDirSize(macDir);
    freedBytes += size;
    cleanDir(macDir);
    console.log(`  ✓ 删除 mac-arm64/ 中间产物 (${formatBytes(size)})`);
  }

  // 删除未打包的 Mac .app 目录（通用名称）
  const macDir2 = path.join(releaseDir, 'mac');
  if (fs.existsSync(macDir2)) {
    const size = getDirSize(macDir2);
    freedBytes += size;
    cleanDir(macDir2);
    console.log(`  ✓ 删除 mac/ 中间产物 (${formatBytes(size)})`);
  }

  // 删除未打包的 Windows 目录
  const winDir = path.join(releaseDir, 'win-unpacked');
  if (fs.existsSync(winDir)) {
    const size = getDirSize(winDir);
    freedBytes += size;
    cleanDir(winDir);
    console.log(`  ✓ 删除 win-unpacked/ 中间产物 (${formatBytes(size)})`);
  }

  // 删除构建调试文件
  const debugFiles = ['builder-debug.yml', 'builder-effective-config.yaml'];
  for (const file of debugFiles) {
    const filePath = path.join(releaseDir, file);
    if (fs.existsSync(filePath)) {
      const size = fs.statSync(filePath).size;
      freedBytes += size;
      fs.unlinkSync(filePath);
      console.log(`  ✓ 删除 ${file} (${formatBytes(size)})`);
    }
  }

  if (freedBytes > 0) {
    console.log(`✅ Release 清理完成，共节省 ${formatBytes(freedBytes)}`);
  } else {
    console.log('✅ Release 目录无需清理');
  }
}

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'copy-python':
    ensureDir('dist/python');
    copyFile('src/cli.py', 'dist/python/cli.py');
    copyDir('src/python', 'dist/python', { extensions: ['.py'] });
    copyDir('src/core', 'dist/python/core', { extensions: ['.py'] });
    copyDir('src/utils', 'dist/python/utils', { extensions: ['.py'] });
    console.log('✓ Python files copied');
    break;

  case 'copy-fonts':
    ensureDir('dist/renderer/assets/fonts');
    copyDir('public/assets/fonts', 'dist/renderer/assets/fonts');
    console.log('✓ Fonts copied');
    break;

  case 'copy-node-modules':
    ensureDir('dist/main/node_modules');
    const modules = ['node-unrar-js', 'unrar-promise', 'exceljs', '7zip-min', '7zip-bin'];
    for (const mod of modules) {
      const srcPath = `node_modules/${mod}`;
      const destPath = `dist/main/node_modules/${mod}`;
      if (fs.existsSync(srcPath)) {
        // 7zip-bin 只复制当前平台的二进制
        if (mod === '7zip-bin') {
          const platformName = isMac() ? 'mac' : 'win';
          copyDir(srcPath, destPath, { excludeDirs: ['linux', isMac() ? 'win' : 'mac'] });
        } else {
          copyDir(srcPath, destPath);
        }
        console.log(`✓ ${mod} copied`);
      }
    }
    prune7zipBinPlatforms();
    pruneNodeModulesExtras();
    break;

  case 'clean-dist':
    cleanDir('dist');
    console.log('✓ dist cleaned');
    break;

  case 'cleanup-release':
    cleanupRelease();
    break;

  default:
    console.log('Usage: node scripts/build.js <command>');
    console.log('Commands: copy-python, copy-fonts, copy-node-modules, clean-dist, cleanup-release');
}
