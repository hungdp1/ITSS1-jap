import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
      allowedOrigins: [
        "localhost:3000",
        // Vercel injects VERCEL_URL (deployment host) so server actions are
        // accepted on preview + production deployments. NEXT_PUBLIC_SITE_DOMAIN
        // lets you whitelist a custom domain (host only, e.g. "tomoio.app").
        process.env.VERCEL_URL,
        process.env.NEXT_PUBLIC_SITE_DOMAIN,
      ].filter((origin): origin is string => Boolean(origin)),
    },
    optimizePackageImports: ["socket.io-client"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    localPatterns: [
      {
        pathname: '/assets/**',
      }
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
