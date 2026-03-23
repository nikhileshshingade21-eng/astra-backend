const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory && f !== 'node_modules' && f !== '.git') {
            walk(dirPath, callback);
        } else if (f.endsWith('.js') && f !== 'db.js' && f !== 'refactor_await.js') {
            callback(dirPath);
        }
    });
}

const rootDir = process.argv[2] || '.';

walk(rootDir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    // regex: find queryAll( but not if preceded by await
    let updated = content.replace(/(?<!await\s+)(\bqueryAll\()/g, 'await $1');
    updated = updated.replace(/(?<!await\s+)(require\(['"]\.\.\/db['"]\)\.queryAll\()/g, 'await $1');
    updated = updated.replace(/(?<!await\s+)(require\(['"]\.\/db['"]\)\.queryAll\()/g, 'await $1');
    fs.writeFileSync(filePath, updated, 'utf8');
});

console.log('Refactoring complete.');
