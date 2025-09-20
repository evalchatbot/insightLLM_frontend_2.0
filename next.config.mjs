/** @type {import('next').NextConfig} */
const nextConfig = {
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
