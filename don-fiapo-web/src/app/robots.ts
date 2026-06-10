import { MetadataRoute } from 'next';
import { buildPublicUrl } from '@/lib/http/public-origin';

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
        sitemap: buildPublicUrl('/sitemap.xml', { configuredOrigin: process.env.NEXT_PUBLIC_APP_URL }),
    };
}
