/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.YUMMY_BUILD_DIR || '.next',
  images: {
    remotePatterns: [
      ...[process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001', process.env.NEXT_PUBLIC_MEDIA_URL].filter(Boolean).map(value => {
        const url = new URL(value);
        return { protocol: url.protocol.replace(':', ''), hostname: url.hostname, port: url.port };
      }),
      // {
      //   protocol: 'https',
      //   hostname: 'yummy-321287803064.asia-south1.run.app',
      // },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com'
      },
      {
          protocol: 'https',
          hostname: 'nrrfumuslekbdjvgklqp.supabase.co'
      },
      {
          protocol: 'https',
          hostname: 'res.cloudinary.com'
      }
    ],
  },
};

export default nextConfig;
