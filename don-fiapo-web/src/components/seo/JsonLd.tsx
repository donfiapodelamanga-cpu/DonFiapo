export default function JsonLd() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': 'https://donfiapo.fun/#organization',
                name: 'Don Fiapo',
                url: 'https://donfiapo.fun',
                logo: {
                    '@type': 'ImageObject',
                    url: 'https://donfiapo.fun/hero-bg.png',
                    width: 1200,
                    height: 630,
                },
                sameAs: [
                    'https://twitter.com/donfiapocoin',
                    'https://t.me/donfiapo',
                ],
            },
            {
                '@type': 'WebSite',
                '@id': 'https://donfiapo.fun/#website',
                url: 'https://donfiapo.fun',
                name: 'Don Fiapo De la Manga - The Alpha of Memecoins',
                description:
                    "He doesn't bark — he decrees. The blockchain now has a monarchy. Join the reign.",
                publisher: {
                    '@id': 'https://donfiapo.fun/#organization',
                },
                inLanguage: ['en', 'pt', 'es', 'fr', 'ru', 'zh'],
            },
            {
                '@type': 'SoftwareApplication',
                name: 'Don Fiapo DApp',
                applicationCategory: 'FinanceApplication',
                operatingSystem: 'Web',
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                },
                description: 'Decentralized memecoin platform on Lunes blockchain with ICO, NFT marketplace, staking, governance and play-to-earn games.',
            },
            {
                '@type': 'Event',
                '@id': 'https://donfiapo.fun/#airdrop-event',
                name: 'Don Fiapo Royal Airdrop 2026 — Free $FIAPO Token Distribution',
                description: 'By Royal Decree of Don Fiapo, millions of dollars in $FIAPO tokens are being distributed for free. Complete missions, earn points, and claim your share of 30.5 billion $FIAPO in the Crypto Airdrop 2026.',
                startDate: '2026-03-01',
                endDate: '2026-12-31',
                eventStatus: 'https://schema.org/EventScheduled',
                eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
                location: {
                    '@type': 'VirtualLocation',
                    url: 'https://donfiapo.fun/airdrop',
                },
                organizer: {
                    '@id': 'https://donfiapo.fun/#organization',
                },
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                    availability: 'https://schema.org/InStock',
                    url: 'https://donfiapo.fun/airdrop',
                    validFrom: '2026-03-01',
                },
                keywords: 'Crypto Airdrop 2026, Free Token Distribution, Don Fiapo Rewards, Web3 Kingdom, $FIAPO Airdrop, Memecoin Airdrop',
                image: 'https://donfiapo.fun/og.jpg',
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
