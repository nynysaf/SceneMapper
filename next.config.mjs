/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
    // Route Handler body limit (when applicable); helps large xlsx import PUTs
    proxyClientMaxBodySize: '8mb',
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Serve logo as favicon so /favicon.ico doesn't 404
        { source: '/favicon.ico', destination: '/logo.png' },
      ],
    };
  },
};

export default nextConfig;
