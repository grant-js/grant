/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/example',
  images: {
    unoptimized: true, // Required for static export
  },
  // See decisions/0006 — typescript is the 6.x API wrapper, not native tsc.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
