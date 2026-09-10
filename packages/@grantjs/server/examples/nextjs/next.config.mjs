/** @type {import('next').NextConfig} */
const nextConfig = {
  // See decisions/0006 — typescript is the 6.x API wrapper, not native tsc.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
