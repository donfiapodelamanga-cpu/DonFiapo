const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'public/exchanges');

const darkColors = [
    '#000000', '#000', '#111111', '#111', '#1a1a1a', '#1C1E1D', 
    '#1b1b1b', '#232323', '#141414', '#1E1E1E', '#181A20', '#1C1C1C'
];

fs.readdir(directoryPath, (err, files) => {
    if (err) return console.log('Unable to scan directory: ' + err); 

    files.forEach(file => {
        if (path.extname(file) === '.svg') {
            const filePath = path.join(directoryPath, file);
            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;

            darkColors.forEach(color => {
                // Regex para encontrar as cores, case insensitive, garantindo que não estamos pegando parte de outra string
                const regex = new RegExp(color + '(?![0-9a-fA-F])', 'gi');
                if (regex.test(content)) {
                    content = content.replace(regex, '#FFFFFF');
                    modified = true;
                }
            });

            // Also check for inline styles like fill:black
            if (content.includes('fill="black"')) {
                content = content.replace(/fill="black"/g, 'fill="#FFFFFF"');
                modified = true;
            }
            if (content.includes('fill:black')) {
                content = content.replace(/fill:black/g, 'fill:#FFFFFF');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated colors in: ${file}`);
            }
        }
    });
});
