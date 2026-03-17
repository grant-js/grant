import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@grantjs/core', '@grantjs/schema'],
};

export default nextConfig;
