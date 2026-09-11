import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@grantjs/core', '@grantjs/schema'],
  // Next 16 defaults useTypeScriptCli to true and looks for typescript/bin/tsc.
  // The package named `typescript` is the 6.x API wrapper (tsc6 only); native
  // tsc lives on `@typescript/native`. See decisions/0006.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
