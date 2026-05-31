const fs = require('fs');
const path = require('path');

const src = 'C:/Users/DELL/.gemini/antigravity/scratch/warey-monorepo/img';
const dst = 'C:/Users/DELL/.gemini/antigravity/scratch/warey-monorepo/apps/mobile/assets/img';

const files = ['v1.png','v2.png','v3.png','v4.png','v5.png','v6.png','v7.png','v8.png','s1.png','s2.png','s3.png'];
files.forEach(f => {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
  console.log('Copied', f);
});
console.log('Done!');
