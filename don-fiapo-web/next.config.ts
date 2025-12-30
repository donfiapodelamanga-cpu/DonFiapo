import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    domains: ['ipfs.io', 'gateway.pinata.cloud'],
  },
};

export default withNextIntl(nextConfig);
