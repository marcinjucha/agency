import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  transpilePackages: ['@agency/ui', '@agency/database', '@agency/validators', '@agency/calendar'],

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
