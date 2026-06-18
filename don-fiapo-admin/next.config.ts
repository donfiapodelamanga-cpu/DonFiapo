import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: false,
  // Suppress TS/ESLint errors during Docker build — fix these locally with `npm run type-check`
  typescript: { ignoreBuildErrors: true },
  // Force all routes as dynamic — prevents Prisma from being called during next build
  // (Prisma needs a DB connection which isn't available at build time)
  async headers() {
    // Auditoria #12: security headers ausentes no admin (painel sensível).
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' https: wss: ws:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ];
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  serverExternalPackages: [
    "@polkadot/api",
    "@polkadot/api-contract",
    "@polkadot/types",
    "@polkadot/util",
    "@polkadot/util-crypto",
    "@polkadot/keyring",
    "@polkadot/wasm-crypto",
    "@solana/web3.js",
    "@solana/spl-token",
  ],
};

export default nextConfig;
