import { locales } from '@/config/i18n';
import { MetadataRoute } from 'next';

const routes: { path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }[] = [
    { path: '', changeFrequency: 'daily', priority: 1.0 },
    { path: '/ico', changeFrequency: 'daily', priority: 0.9 },
    { path: '/ico/mint', changeFrequency: 'daily', priority: 0.8 },
    { path: '/ico/leaderboard', changeFrequency: 'daily', priority: 0.7 },
    { path: '/ico/my-nfts', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/ico/evolution-history', changeFrequency: 'weekly', priority: 0.5 },
    { path: '/ico/mining', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/staking', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/airdrop', changeFrequency: 'daily', priority: 0.9 },
    { path: '/tokenomics', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/games', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/games/spin', changeFrequency: 'daily', priority: 0.8 },
    { path: '/marketplace', changeFrequency: 'daily', priority: 0.7 },
    { path: '/ranking', changeFrequency: 'daily', priority: 0.6 },
    { path: '/governance', changeFrequency: 'weekly', priority: 0.5 },
    { path: '/affiliate', changeFrequency: 'weekly', priority: 0.5 },
    { path: '/noble', changeFrequency: 'weekly', priority: 0.5 },
    { path: '/migration', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/simulations', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/docs', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/docs/whitepaper', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/docs/faq', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/docs/getting-started', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/docs/wallet-setup', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/docs/contracts', changeFrequency: 'monthly', priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://donfiapo.fun';
    const now = new Date();

    const entries: MetadataRoute.Sitemap = [];

    // Root URL
    entries.push({
        url: baseUrl,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 1,
    });

    // All locale + route combinations
    for (const locale of locales) {
        for (const route of routes) {
            entries.push({
                url: `${baseUrl}/${locale}${route.path}`,
                lastModified: now,
                changeFrequency: route.changeFrequency,
                priority: route.priority,
            });
        }
    }

    return entries;
}
