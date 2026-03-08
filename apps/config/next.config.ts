import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@grantjs/core', '@grantjs/schema'],
};

export default nextConfig;
