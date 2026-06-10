import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { resolveAllowedCorsOrigins, resolveCorsOrigin } from '@/lib/http/public-origin';
import { routing } from '@/lib/navigation';

const intlMiddleware = createMiddleware(routing);

const DEFAULT_ALLOWED_HEADERS = [
  "X-CSRF-Token",
  "X-Requested-With",
  "Accept",
  "Accept-Version",
  "Content-Length",
  "Content-MD5",
  "Content-Type",
  "Date",
  "X-Api-Version",
  "x-admin-key",
].join(", ");

function applyCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const allowedOrigins = resolveAllowedCorsOrigins({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    adminUrl: process.env.ADMIN_URL || process.env.NEXT_PUBLIC_ADMIN_URL,
    nodeEnv: process.env.NODE_ENV,
  });
  const origin = resolveCorsOrigin(request.headers.get("origin"), { allowedOrigins });

  response.headers.set("Vary", "Origin");
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET,DELETE,PATCH,POST,PUT,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") || DEFAULT_ALLOWED_HEADERS,
  );

  return response;
}

export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const response = request.method === "OPTIONS"
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();

    return applyCorsHeaders(request, response);
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for static files, API routes, and Next.js internals
  matcher: [
    '/api/:path*',
    // Match all pathnames except for
    // - ... if they start with `/api`, `/_next` or `/_vercel`
    // - ... the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
