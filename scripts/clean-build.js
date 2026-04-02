const fs = require('fs');
const path = require('path');

function cleanDir(dir, patterns) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        cleanNodeModules(fullPath, patterns);
      } else if (!['test', 'tests', 'docs', 'doc', '.git'].includes(entry.name)) {
        cleanDir(fullPath, patterns);
        try {
          const remaining = fs.readdirSync(fullPath);
          if (remaining.length === 0) {
            fs.rmdirSync(fullPath);
          }
        } catch {}
      }
    } else {
      const shouldDelete = patterns.some(pattern => {
        if (pattern.startsWith('*.')) {
          const ext = pattern.slice(1);
          return entry.name.endsWith(ext);
        }
        return entry.name === pattern;
      });

      if (shouldDelete) {
        fs.unlinkSync(fullPath);
      }
    }
  }
}

function cleanNodeModules(dir, patterns) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (['test', 'tests', 'docs', 'doc'].includes(entry.name)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else if (entry.name === 'node_modules') {
        cleanNodeModules(fullPath, patterns);
      } else {
        cleanNodeModules(fullPath, patterns);
        try {
          const remaining = fs.readdirSync(fullPath);
          if (remaining.length === 0) {
            fs.rmdirSync(fullPath);
          }
        } catch {}
      }
    } else {
      const shouldDelete = patterns.some(pattern => {
        if (pattern.startsWith('*.')) {
          return entry.name.endsWith(pattern.slice(1));
        }
        return entry.name === pattern || entry.name.endsWith(pattern);
      });

      if (shouldDelete) {
        fs.unlinkSync(fullPath);
      }
    }
  }
}

const patterns = ['.md', 'README', 'LICENSE', 'CHANGELOG', '.test.', '.spec.'];

console.log('清理构建产物中的冗余文件...');

if (fs.existsSync('dist')) {
  cleanDir('dist', patterns);
  console.log('✓ dist 目录已清理');
}

if (fs.existsSync('dist/python/validate_source.py')) {
  fs.unlinkSync('dist/python/validate_source.py');
  console.log('✓ validate_source.py 已删除');
}

if (fs.existsSync('dist/main/node_modules/unrar-promise')) {
  cleanDir('dist/main/node_modules/unrar-promise', patterns);
  console.log('✓ unrar-promise 冗余文件已清理');
}

if (fs.existsSync('dist/main/node_modules/exceljs')) {
  cleanDir('dist/main/node_modules/exceljs', patterns);
  console.log('✓ exceljs 冗余文件已清理');
}

console.log('\n清理完成！重新运行 npm run dist 打包。');
