const fs = require('fs');
let svg = fs.readFileSync('/Users/lucas/Downloads/logos-cex/bing-x.svg', 'utf8');

// I am noticing from my own logs that the original SVG from downloaded has two `<path>` elements.
// The first `<path d="...">` has `fill="#2a54fe"`. This is the blue logo shape.
// The second `<path d="...">` has no `fill` or some dark fill (which results in black letters). 
// I will simply force replace the second path to have `fill="#FFFFFF"`.

let count = 0;
svg = svg.replace(/<path\s+[^>]+>/g, (match) => {
    count++;
    if (count === 2) {
        // This is the second path (the text "BingX")
        if (match.includes('fill=')) {
            return match.replace(/fill=\"[^\"]+\"/, 'fill="#FFFFFF"');
        } else {
            return match.replace('<path ', '<path fill="#FFFFFF" ');
        }
    }
    return match;
});

// If there are other paths (like the dot on the 'i'), make them white too if they are > 1
count = 0;
svg = svg.replace(/<path([^>]+)>/g, (match, attrs) => {
    count++;
    if (count > 1) {
        if (attrs.includes('fill=')) {
            return `<path${attrs.replace(/fill=\"[^\"]+\"/, 'fill="#FFFFFF"')}>`;
        } else {
            return `<path fill="#FFFFFF"${attrs}>`;
        }
    }
    return match;
});

fs.writeFileSync('/Users/lucas/Documents/Projetos_DEV/DonFiapo/don-fiapo-web/public/exchanges/bingx.svg', svg);
console.log('BingX fully fixed');
