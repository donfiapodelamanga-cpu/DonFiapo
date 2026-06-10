import { NextRequest, NextResponse } from 'next/server';
import {
    buildOracleProxyUrl,
    isOracleProxyPathAllowed,
    resolveOracleProxyConfig,
} from '@/lib/api/oracle-proxy-config';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return handleRequest(req, resolvedParams);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return handleRequest(req, resolvedParams);
}

async function handleRequest(req: NextRequest, params: { path: string[] }) {
    const path = params.path.join('/');

    // Prevent path traversal and SSRF
    if (!isOracleProxyPathAllowed(path)) {
        return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
    }

    const config = resolveOracleProxyConfig();
    if (!config.valid) {
        return NextResponse.json(
            { error: 'Oracle proxy is not configured', details: config.errors },
            { status: 503 },
        );
    }

    const url = buildOracleProxyUrl(config.url, path);

    try {
        const body = req.method === 'POST' ? await req.json() : undefined;

        const res = await fetch(url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        const contentType = res.headers.get('content-type') ?? '';
        const data = contentType.includes('application/json')
            ? await res.json()
            : { body: await res.text() };

        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Oracle Proxy Error:', error);
        return NextResponse.json({ error: 'Failed to communicate with Oracle' }, { status: 500 });
    }
}
