const fs = require('fs');
let svg = fs.readFileSync('/Users/lucas/Downloads/logos-cex/bing-x.svg', 'utf8');

// There's a problem: some paths in BingX logo are actually white inside the logo,
// But the large text paths (the letters) might be `<path d="..." />` with NO fill (defaulting to black).
// Our regex works by adding fill="#FFFFFF" to any path that doesn't have a fill attribute,
// or replacing any fill that isn't a blue hex with white.

svg = svg.replace(/<path\s+([^>]+)>/g, (match, attrs) => {
    // Se tiver fill de azul, mantemos
    if (attrs.match(/fill=\"#2[a-f0-9]{5}\"/i)) {
        return match;
    }
    
    // Se tiver fill, substituímos por #FFFFFF (exceto se for azul, que ja caiu no IF acima)
    if (attrs.includes('fill=')) {
        return `<path ${attrs.replace(/fill=\"[^\"]+\"/g, 'fill="#FFFFFF"')}>`;
    }
    
    // Se não tiver fill, adicionamos fill="#FFFFFF"
    return `<path fill="#FFFFFF" ${attrs}>`;
});

fs.writeFileSync('/Users/lucas/Documents/Projetos_DEV/DonFiapo/don-fiapo-web/public/exchanges/bingx.svg', svg);
console.log('BingX fully fixed');
