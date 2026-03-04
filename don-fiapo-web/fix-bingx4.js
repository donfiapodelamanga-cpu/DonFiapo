const fs = require('fs');
let svg = fs.readFileSync('/Users/lucas/Downloads/logos-cex/bing-x.svg', 'utf8');

// The original file might have paths with NO fill at all.
// The default behavior in browsers for `<path>` without `fill` is to fill it with BLACK.
// This is exactly why the text "BingX" is black on the user's screen.
// We need to inject `fill="#FFFFFF"` into EVERY path that does NOT have a `fill` attribute.

// 1. Find paths without 'fill' and add fill="#FFFFFF"
svg = svg.replace(/<path\s+(?![^>]*?fill=)[^>]*>/g, (match) => {
    return match.replace('<path', '<path fill="#FFFFFF"');
});

// 2. Find paths WITH a fill attribute, and if it is NOT blue, make it white.
// Some blues might be written in other formats or the whites might already be there.
// We only want to target the dark colors (like #010101, #040404, etc)
svg = svg.replace(/fill=\"#([a-fA-F0-9]{6})\"/g, (match, hex) => {
    hex = hex.toLowerCase();
    // If it's one of the blue shades from BingX, keep it
    if (hex.startsWith('2') || hex === 'ffffff') {
        return match;
    }
    // Otherwise, replace with white
    return 'fill="#FFFFFF"';
});

// 3. For any fill="black" or similar
svg = svg.replace(/fill=\"black\"/gi, 'fill=\"#FFFFFF\"');

fs.writeFileSync('/Users/lucas/Documents/Projetos_DEV/DonFiapo/don-fiapo-web/public/exchanges/bingx.svg', svg);
console.log('BingX fully fixed');
