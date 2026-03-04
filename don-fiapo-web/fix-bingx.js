const fs = require('fs');
let svg = fs.readFileSync('/Users/lucas/Downloads/logos-cex/bing-x.svg', 'utf8');

// Modifica todas as tags de path. Se for azul deixa, senao bota #FFFFFF
svg = svg.replace(/<path[^>]+>/g, (match) => {
    if (match.includes('fill="#2a54fe"') || 
        match.includes('fill="#2244ce"') || 
        match.includes('fill="#2346d4"') || 
        match.includes('fill="#2446d4"') || 
        match.includes('fill="#2448d9"') || 
        match.includes('fill="#254ae0"') || 
        match.includes('fill="#264ae0"') || 
        match.includes('fill="#264ce5"') || 
        match.includes('fill="#274eeb"') || 
        match.includes('fill="#2850f1"') || 
        match.includes('fill="#2952f7"')) {
        return match; // Keep blue gradients
    } else {
        // Change to white
        if (match.includes('fill=')) {
            return match.replace(/fill="[^"]+"/, 'fill="#FFFFFF"');
        } else {
            return match.replace('<path ', '<path fill="#FFFFFF" ');
        }
    }
});

fs.writeFileSync('/Users/lucas/Documents/Projetos_DEV/DonFiapo/don-fiapo-web/public/exchanges/bingx.svg', svg);
console.log('BingX SVG fixed');
