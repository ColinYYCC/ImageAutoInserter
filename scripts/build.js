const fs = require('fs');
const path = require('path');

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
    const modules = ['node-unrar-js', 'unrar-promise', 'exceljs', '7zip-min', '7zip-bin'];
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
