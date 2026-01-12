import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Note: Build with --no-turbopack flag to use webpack for proper transpilePackages support
  // reactCompiler: true, // Disabled temporarily to isolate issues
  transpilePackages: [
    '@polkadot/api',
    '@polkadot/util',
    '@polkadot/util-crypto',
    '@polkadot/keyring',
    '@polkadot/rpc-core',
    '@polkadot/types',
    '@polkadot/types-codec',
    '@polkadot/rpc-provider',
    '@polkadot/api-contract',
    '@polkadot/extension-dapp',
    '@solana-mobile/mobile-wallet-adapter-protocol',
    '@solana/codecs-strings',
    '@solana/codecs-core',
    '@solana/codecs-numbers',
    '@solana/kit',
    '@solana/transaction-confirmation',
    '@solana/web3.js',
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false,
      },
    });
    // Fix octal escape sequences in node_modules that cause runtime errors
    config.module.rules.push({
      test: /\.m?js$/,
      include: /node_modules/,
      use: {
        loader: 'string-replace-loader',
        options: {
          multiple: [
            // Replace \00 (octal) with \x00 (hex) - fixes VRF proving string
            { search: '\\\\00', replace: '\\\\x00', flags: 'g' },
            // Replace padEnd with null char - various patterns from @solana/kit and @stellar packages
            { search: '\\.padEnd\\(([^,]+),\\s*"\\\\0"\\)', replace: '.padEnd($1, String.fromCharCode(0))', flags: 'g' },
            { search: "\\.padEnd\\(([^,]+),\\s*'\\\\0'\\)", replace: '.padEnd($1, String.fromCharCode(0))', flags: 'g' },
            // Catch any remaining "\0" or '\0' patterns as function arguments
            { search: ',\\s*"\\\\0"\\)', replace: ', String.fromCharCode(0))', flags: 'g' },
            { search: ",\\s*'\\\\0'\\)", replace: ', String.fromCharCode(0))', flags: 'g' },
          ],
        },
      },
    });
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
    ],
  },
};

export default withNextIntl(nextConfig);
