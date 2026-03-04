const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'public/exchanges');

const replaceInFile = (file, find, replace) => {
    const filePath = path.join(directoryPath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(find)) {
        content = content.replace(new RegExp(find, 'g'), replace);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${find} in ${file}`);
    }
};

// Fix Coinex (has #4A4A4A for text)
replaceInFile('coinex.svg', '#4A4A4A', '#FFFFFF');

// Fix LBank (has #F8E19A but might need other fixes)
// We already saw lbank is colored #F8E19A which is a gold-ish color, that should be fine.

// Fix Bitmart (had #1C1E1D, we ran sed but let's make sure it's white)
replaceInFile('bitmart.svg', '#1C1E1D', '#FFFFFF');

// Let's check dextrade
replaceInFile('dextrade.svg', '#000000', '#FFFFFF');

// Bybit has #F7A600 which is fine.

