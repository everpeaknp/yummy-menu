/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yummy-321287803064.asia-south1.run.app',
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
      }
    ],
  },
};

export default nextConfig;
