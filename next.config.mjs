/** @type {import('next').NextConfig} */
const nextConfig = {
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
