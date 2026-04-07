const fs = require('fs');
const path = require('path');

function getVersionFromPackageJson() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  return packageData.version;
}

function syncVersion() {
  const version = getVersionFromPackageJson();
  const parts = version.split('.');
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const patch = parseInt(parts[2], 10);

  const versionPyPath = path.join(__dirname, '..', 'src', 'version.py');
  const content = `"""
中央版本定义模块

所有模块从这里导入版本信息，确保版本一致性
"""

__version__ = "${version}"
__release_date__ = "${new Date().toISOString().split('T')[0]}"
__author__ = "ImageAutoInserter Team"

VERSION_INFO = {
    "major": ${major},
    "minor": ${minor},
    "patch": ${patch},
    "string": __version__,
    "release_date": __release_date__,
    "author": __author__,
}
`;
  fs.writeFileSync(versionPyPath, content, 'utf-8');
  console.log(`✓ Version synced to ${version}`);
}

function copyDir(src, dest, extensions) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, extensions);
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

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'sync-version':
    syncVersion();
    break;

  case 'copy-python':
    ensureDir('dist/python');
    copyFile('src/cli.py', 'dist/python/cli.py');
    copyDir('src/python', 'dist/python', ['.py']);
    copyDir('src/core', 'dist/python/core', ['.py']);
    copyDir('src/utils', 'dist/python/utils', ['.py']);
    console.log('✓ Python files copied');
    break;

  case 'copy-fonts':
    ensureDir('dist/renderer/assets/fonts');
    copyDir('public/assets/fonts', 'dist/renderer/assets/fonts');
    console.log('✓ Fonts copied');
    break;

  case 'copy-node-modules':
    ensureDir('dist/main/node_modules');
    const modules = ['node-unrar-js', 'exceljs', '7zip-min', '7zip-bin'];
    for (const mod of modules) {
      const srcPath = `node_modules/${mod}`;
      const destPath = `dist/main/node_modules/${mod}`;
      if (fs.existsSync(srcPath)) {
        copyDir(srcPath, destPath);
        console.log(`✓ ${mod} copied`);
      }
    }
    break;

  case 'clean-dist':
    cleanDir('dist');
    console.log('✓ dist cleaned');
    break;

  default:
    console.log('Usage: node scripts/build.js <command>');
    console.log('Commands: copy-python, copy-fonts, copy-node-modules, clean-dist');
}
