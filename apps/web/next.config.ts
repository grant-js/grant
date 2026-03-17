import { NextConfig } from 'next';

import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  output: 'standalone',
  typedRoutes: true,
  transpilePackages: ['@grantjs/core', '@grantjs/schema'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
      };
    }
    return config;
  },
  async rewrites() {
    // API only; docs and example are not proxied in dev so they keep HMR/WebSockets.
    const api = 'http://localhost:4000';
    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
      { source: '/graphql', destination: `${api}/graphql` },
      { source: '/graphql/:path*', destination: `${api}/graphql/:path*` },
      { source: '/api-docs', destination: `${api}/api-docs/` },
      { source: '/api-docs/', destination: `${api}/api-docs/` },
      { source: '/api-docs/:path*', destination: `${api}/api-docs/:path*` },
      { source: '/api-docs.json', destination: `${api}/api-docs.json` },
      { source: '/swagger-ui.css', destination: `${api}/api-docs/swagger-ui.css` },
      { source: '/swagger-ui-bundle.js', destination: `${api}/api-docs/swagger-ui-bundle.js` },
      {
        source: '/swagger-ui-standalone-preset.js',
        destination: `${api}/api-docs/swagger-ui-standalone-preset.js`,
      },
      { source: '/swagger-ui-init.js', destination: `${api}/api-docs/swagger-ui-init.js` },
      { source: '/storage/:path*', destination: `${api}/storage/:path*` },
      { source: '/health', destination: `${api}/health` },
      { source: '/.well-known/:path*', destination: `${api}/.well-known/:path*` },
      {
        source: '/org/:orgId/prj/:projectId/.well-known/:path*',
        destination: `${api}/org/:orgId/prj/:projectId/.well-known/:path*`,
      },
      {
        source: '/acc/:accId/prj/:projectId/.well-known/:path*',
        destination: `${api}/acc/:accId/prj/:projectId/.well-known/:path*`,
      },
      { source: '/favicon.ico', destination: '/favicon.png' },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
export default withNextIntl(nextConfig);
