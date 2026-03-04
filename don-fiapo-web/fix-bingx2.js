const fs = require('fs');
let svg = fs.readFileSync('/Users/lucas/Downloads/logos-cex/bing-x.svg', 'utf8');

// There are paths that don't have a fill matching our regex exactly, e.g. blue shades that we missed.
// The easiest way is to look at the SVG content.
// The first path is the blue logo (m244.181 525.646...). The second is the text (m427.698 524.451...).
// We will simply regex out ALL paths, and if the path 'd' starts with 'm4' or 'M4', we color it white.
// Let's just blindly force everything to white EXCEPT things that start with a blue hex.

svg = svg.replace(/<path[^>]*>/g, (match) => {
    // If it has a blue fill, keep it
    if (match.match(/fill=\"#2[a-f0-9]{5}\"/i)) {
        return match;
    }
    // Otherwise, force it to #FFFFFF
    if (match.includes('fill=')) {
        return match.replace(/fill=\"[^\"]+\"/g, 'fill=\"#FFFFFF\"');
    } else {
        return match.replace('<path', '<path fill=\"#FFFFFF\"');
    }
});

// Also, the original bing-x.svg has multiple paths. Let's make sure.
fs.writeFileSync('/Users/lucas/Documents/Projetos_DEV/DonFiapo/don-fiapo-web/public/exchanges/bingx.svg', svg);
console.log('Done fixing bingx');
