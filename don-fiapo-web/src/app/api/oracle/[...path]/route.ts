import { NextRequest, NextResponse } from 'next/server';

const ORACLE_URL = process.env.ORACLE_SERVICE_URL || 'http://localhost:3001'; // Default to port 3001 or whatever oracle runs on
const ORACLE_KEY = process.env.ORACLE_API_KEY || '';

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
    // Construct URL: ORACLE_URL + / + path
    // Client calls: /api/oracle/health -> path=['health'] -> Proxy to: ORACLE_URL/health ??
    // No, Oracle service routes are mostly /api/... 
    // But oracle.ts appends /health directly to baseUrl.
    // If baseUrl is /api/oracle. 
    // healthCheck calls /api/oracle/health.
    // Path is ['health'].
    // Proxy builds ORACLE_URL + /health.
    // Service has /health. Correct.

    // createPayment calls /api/oracle/api/payment/create.
    // Path is ['api', 'payment', 'create'].
    // Proxy builds ORACLE_URL + /api/payment/create.
    // Service has /api/payment/create. Correct.

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
