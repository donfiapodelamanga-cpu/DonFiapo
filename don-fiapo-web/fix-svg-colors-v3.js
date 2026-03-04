const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'public/exchanges');

fs.readdirSync(directoryPath).forEach(file => {
    if (path.extname(file) === '.svg') {
        const filePath = path.join(directoryPath, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Find all fill="#..." and replace dark ones with white
        content = content.replace(/fill="#([0-9a-fA-F]{3,6})"/g, (match, hex) => {
            let r, g, b;
            if (hex.length === 3) {
                r = parseInt(hex[0]+hex[0], 16);
                g = parseInt(hex[1]+hex[1], 16);
                b = parseInt(hex[2]+hex[2], 16);
            } else if (hex.length === 6) {
                r = parseInt(hex.substring(0,2), 16);
                g = parseInt(hex.substring(2,4), 16);
                b = parseInt(hex.substring(4,6), 16);
            }
            
            // If it's a dark color (luminance is low)
            if (r < 80 && g < 80 && b < 80) {
                modified = true;
                return 'fill="#FFFFFF"';
            }
            return match;
        });

        // Also replace fill: #... in styles
        content = content.replace(/fill:\s*#([0-9a-fA-F]{3,6})/g, (match, hex) => {
            let r, g, b;
            if (hex.length === 3) {
                r = parseInt(hex[0]+hex[0], 16);
                g = parseInt(hex[1]+hex[1], 16);
                b = parseInt(hex[2]+hex[2], 16);
            } else if (hex.length === 6) {
                r = parseInt(hex.substring(0,2), 16);
                g = parseInt(hex.substring(2,4), 16);
                b = parseInt(hex.substring(4,6), 16);
            }
            if (r < 80 && g < 80 && b < 80) {
                modified = true;
                return 'fill:#FFFFFF';
            }
            return match;
        });

        // Handle fill="black" or fill:black
        if (/fill="black"/.test(content)) {
            content = content.replace(/fill="black"/g, 'fill="#FFFFFF"');
            modified = true;
        }
        if (/fill:\s*black/.test(content)) {
            content = content.replace(/fill:\s*black/g, 'fill:#FFFFFF');
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Brightened dark colors in: ${file}`);
        }
    }
});
