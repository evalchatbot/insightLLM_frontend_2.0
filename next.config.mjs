/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint failures from blocking `next build`. This allows builds to succeed
  // even if lint warnings/errors remain. Use with caution and prefer fixing lint issues.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        port: '',
      },
    ],
  },
};

export default nextConfig;
