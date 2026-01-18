const fs = require('fs');
const path = require('path');

function searchAndFix(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            searchAndFix(filePath);
        } else if (/\.(m?js|cjs)$/.test(file)) {
            try {
                let content = fs.readFileSync(filePath, 'utf8');
                let changed = false;

                // Pattern 1: \0 not followed by digit (Octal null)
                if (/\\0(?![0-9])/.test(content)) {
                    content = content.replace(/\\0(?![0-9])/g, '\\x00');
                    changed = true;
                }

                // Pattern 2: \0 digit (Legacy octal like \01)
                // This is risky if it's meant to be octal, but in template strings it causes error
                // We replace specific cases known to cause issues
                const octals = ['01', '02', '03', '04', '05', '06', '07'];
                for (const oct of octals) {
                    const regex = new RegExp(`\\\\${oct}`, 'g');
                    if (regex.test(content)) {
                        content = content.replace(regex, `\\x${oct}`);
                        changed = true;
                    }
                }

                // Pattern 3: .padEnd(..., "\0") type patterns
                if (content.includes('.padEnd') && content.includes('"\\0"')) {
                    content = content.replace(/["']\\0["']/g, 'String.fromCharCode(0)');
                    changed = true;
                }

                if (changed) {
                    console.log(`Fixed octals in: ${filePath}`);
                    fs.writeFileSync(filePath, content, 'utf8');
                }
            } catch (err) {
                console.error(`Error processing ${filePath}:`, err);
            }
        }
    }
}

console.log('Starting octal escape sequence fix in node_modules/@polkadot...');
const targetDir = path.join(__dirname, '..', 'node_modules', '@polkadot');
searchAndFix(targetDir);
console.log('Fix complete.');
