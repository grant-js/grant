import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { NextConfig } from 'next';

import createNextIntlPlugin from 'next-intl/plugin';

// App version: from env override or package.json (single source of truth at build time)
const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as {
  version?: string;
};
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || pkg.version || 'dev';

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typedRoutes: true,
  transpilePackages: ['@grantjs/core', '@grantjs/schema'],
  webpack: (config, { isServer }) => {
    // @grantjs/core uses Node crypto (JWKS); not used in client. Stub for browser bundle.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
      };
    }
    return config;
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/storage/:path*',
        destination: `${apiUrl}/storage/:path*`,
      },
      // Legacy path: browsers and caches often request /favicon.ico; serve the same icon so cache refreshes get the new asset.
      { source: '/favicon.ico', destination: '/favicon.png' },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
export default withNextIntl(nextConfig);
