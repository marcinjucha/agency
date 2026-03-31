import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@agency/ui', '@agency/database'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'legal-mind-bucket.s3.eu-central-1.amazonaws.com',
      },
    ],
  },
}

export default nextConfig
