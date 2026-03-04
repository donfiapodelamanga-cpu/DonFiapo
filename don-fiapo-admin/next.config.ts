import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: false,
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
