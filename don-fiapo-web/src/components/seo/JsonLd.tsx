export default function JsonLd() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': 'https://donfiapo.com/#organization',
                name: 'Don Fiapo',
                url: 'https://donfiapo.com',
                logo: {
                    '@type': 'ImageObject',
                    url: 'https://donfiapo.com/hero-bg.png',
                },
                sameAs: ['https://twitter.com/donfiapocoin'],
            },
            {
                '@type': 'WebSite',
                '@id': 'https://donfiapo.com/#website',
                url: 'https://donfiapo.com',
                name: 'Don Fiapo - The Alpha of Memecoins',
                description:
                    "He doesn't bark — he decrees. The blockchain now has a monarchy. Join the reign.",
                publisher: {
                    '@id': 'https://donfiapo.com/#organization',
                },
            },
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
