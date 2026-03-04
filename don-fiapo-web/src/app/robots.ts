import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/private/', '/_next/'],
            },
            {
                userAgent: 'GPTBot',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            {
                userAgent: 'Google-Extended',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            {
                userAgent: 'ClaudeBot',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            {
                // Explicitly allow general WebMCP / AI Agents discovery 
                userAgent: 'WebMCP',
                allow: '/',
                disallow: ['/private/'],
            }
        ],
        sitemap: 'https://donfiapo.fun/sitemap.xml',
    };
}
