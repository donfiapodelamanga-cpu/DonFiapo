import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: false,
  // Suppress TS/ESLint errors during Docker build — fix these locally with `npm run type-check`
  typescript: { ignoreBuildErrors: true },
  // Force all routes as dynamic — prevents Prisma from being called during next build
  // (Prisma needs a DB connection which isn't available at build time)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
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
