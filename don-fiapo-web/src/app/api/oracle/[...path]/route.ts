import { NextRequest, NextResponse } from 'next/server';

const ORACLE_URL = process.env.ORACLE_SERVICE_URL || 'http://localhost:3001';
const ORACLE_KEY = process.env.ORACLE_API_KEY || '';

// Allowed path prefixes to prevent SSRF through the proxy
const ALLOWED_PATH_PREFIXES = [
    'health',
    'api/payment',
    'api/prices',
    'api/status',
    'api/spin',
];

function isPathAllowed(path: string): boolean {
    return ALLOWED_PATH_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/'));
}

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
    if (path.includes('..') || !isPathAllowed(path)) {
        return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
    }

    const url = `${ORACLE_URL}/${path}`;

    try {
        const body = req.method === 'POST' ? await req.json() : undefined;

        const res = await fetch(url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ORACLE_KEY,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Oracle Proxy Error:', error);
        return NextResponse.json({ error: 'Failed to communicate with Oracle' }, { status: 500 });
    }
}
