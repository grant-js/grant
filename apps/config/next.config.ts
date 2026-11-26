import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@grantjs/core', '@grantjs/schema'],
  // Next 16 defaults useTypeScriptCli to true and looks for typescript/bin/tsc.
  // The package named `typescript` is the 6.x API wrapper (tsc6 only); native
  // tsc lives on `@typescript/native`. See decisions/0006.
  experimental: {
    useTypeScriptCli: false,
  },
  // Schema (and other TS sources) use ESM `.js` specifiers that map to `.ts`
  // files. Webpack needs this alias; `next dev` and `next build` here use webpack
  // (see package.json) so Turbopack does not have to implement extensionAlias.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
