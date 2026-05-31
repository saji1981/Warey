const fs = require('fs');
const path = require('path');

function findFiles(dir, filesToFind) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(findFiles(file, filesToFind));
      }
    } else {
      const base = path.basename(file).toLowerCase();
      if (filesToFind.includes(base)) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = ['home.png', 'search.png', 'blog.png', 'profie.png', 'profile.png'];
const found = findFiles('C:/Users/DELL/.gemini/antigravity/scratch/warey-monorepo', files);
console.log('Found files:', found);
