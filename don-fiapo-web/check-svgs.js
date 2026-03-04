const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public/exchanges');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

files.forEach(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`\n--- ${file} ---`);
    const fills = [...content.matchAll(/fill[=:]\s*["']?([^"'\s>]+)["']?/gi)].map(m => m[1]);
    const styles = [...content.matchAll(/\.st\d+\{([^}]+)\}/gi)].map(m => m[1]);
    console.log('Fills:', [...new Set(fills)]);
    console.log('Styles:', styles);
});
