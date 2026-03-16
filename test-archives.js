
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const _7z = require('7zip-min');
const unrar = require('unrar-promise');

console.log('Testing archive libraries...');

const testDir = path.join(__dirname, 'Sample/data/archives');
console.log('Test directory:', testDir);

if (fs.existsSync(testDir)) {
  const files = fs.readdirSync(testDir);
  console.log('\nFiles in archive directory:', files);
  
  for (const file of files) {
    const filePath = path.join(testDir, file);
    const ext = path.extname(file).toLowerCase();
    console.log(`\n=== Testing ${file} ===`);
    
    try {
      if (ext === '.zip') {
        console.log('Testing AdmZip...');
        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();
        console.log(`AdmZip found ${entries.length} entries`);
        entries.forEach(e =&gt; {
          if (!e.isDirectory) {
            console.log(`  - ${e.entryName}`);
          }
        });
      } else if (ext === '.rar') {
        console.log('Testing unrar-promise...');
        console.log('unrar object:', unrar);
        console.log('typeof unrar.unrar:', typeof unrar.unrar);
      } else if (ext === '.7z') {
        console.log('Testing 7zip-min...');
        console.log('_7z object:', _7z);
        console.log('typeof _7z.list:', typeof _7z.list);
        
        // Test list
        try {
          console.log('Trying to list 7z file...');
          _7z.list(filePath, (err, result) =&gt; {
            if (err) {
              console.error('7z list error:', err);
            } else {
              console.log('7z list result:', result);
            }
          });
        } catch (e) {
          console.error('7z test error:', e);
        }
      }
    } catch (e) {
      console.error('Error testing file:', e);
    }
  }
} else {
  console.log('Test directory does not exist');
}

