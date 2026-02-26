import fs from 'fs';
const content = fs.readFileSync('secrets.txt', 'utf16le');
console.log(content.replace(/\u0000/g, ''));
