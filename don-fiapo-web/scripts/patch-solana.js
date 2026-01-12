const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../node_modules');

console.log('=== PATCH SCRIPT START ===');
console.log('Target directory:', targetDir);

if (!fs.existsSync(targetDir)) {
    console.log('Target directory does not exist!');
    process.exit(0);
}

let filesScanned = 0;
let filesPatched = 0;

function search(dir) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Skip .bin and some heavy folders
                if (file !== '.bin' && file !== '.cache') {
                    search(filePath);
                }
            } else if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) {
                filesScanned++;
                let content = fs.readFileSync(filePath, 'utf8');
                let patched = false;

                // Pattern 1: padEnd with null char (double quotes) - various formats
                if (content.includes('"\\0"')) {
                    console.log('PATCHING \\0 (double quotes):', filePath);
                    // Replace padEnd patterns
                    content = content.replace(/\.padEnd\(([^,]+),\s*"\\0"\)/g, '.padEnd($1, String.fromCharCode(0))');
                    // Replace general "\0" with String.fromCharCode(0) in specific contexts
                    content = content.replace(/,\s*"\\0"\)/g, ', String.fromCharCode(0))');
                    patched = true;
                }

                // Pattern 2: padEnd with null char (single quotes)
                if (content.includes("'\\0'")) {
                    console.log('PATCHING \\0 (single quotes):', filePath);
                    content = content.replace(/\.padEnd\(([^,]+),\s*'\\0'\)/g, '.padEnd($1, String.fromCharCode(0))');
                    content = content.replace(/,\s*'\\0'\)/g, ', String.fromCharCode(0))');
                    patched = true;
                }

                // Pattern 3: proving\00 octal escape
                if (content.includes('proving\\00')) {
                    console.log('PATCHING proving\\00:', filePath);
                    content = content.replace(/proving\\00/g, 'proving\\x00');
                    patched = true;
                }

                // Pattern 4: Any \00 octal escape (broader search)
                if (content.includes('\\00')) {
                    console.log('PATCHING \\00:', filePath);
                    content = content.replace(/\\00/g, '\\x00');
                    patched = true;
                }

                // Pattern 5: Template literals with \0 followed by non-digit (octal escape)
                // This catches `...\0...` patterns in template strings
                const templateOctalRegex = /`[^`]*\\0[^0-9x][^`]*`/g;
                if (templateOctalRegex.test(content)) {
                    console.log('PATCHING template literal with \\0:', filePath);
                    // Replace \0 with \x00 when inside template literals
                    content = content.replace(/(`[^`]*)\\0([^0-9x][^`]*`)/g, '$1\\x00$2');
                    patched = true;
                }

                // Pattern 6: Any remaining \0 that could be octal
                // Be careful not to replace \x00 or valid escapes
                if (/[`"'].*\\0[^0-9x].*[`"']/.test(content)) {
                    console.log('PATCHING remaining \\0 patterns:', filePath);
                    // Replace \0 when followed by non-hex digit in strings
                    content = content.replace(/(["'`])([^"'`]*)\\0([^0-9x])([^"'`]*)\1/g, '$1$2\\x00$3$4$1');
                    patched = true;
                }

                if (patched) {
                    fs.writeFileSync(filePath, content);
                    filesPatched++;
                }
            }
        }
    } catch (e) {
        // Silently skip permission errors etc
    }
}

search(targetDir);
console.log('=== PATCH SCRIPT COMPLETE ===');
console.log('Files scanned:', filesScanned);
console.log('Files patched:', filesPatched);
