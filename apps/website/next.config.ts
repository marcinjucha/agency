import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@agency/ui', '@agency/database', '@agency/validators', '@agency/calendar'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'legal-mind-bucket.s3.eu-central-1.amazonaws.com',
      },
    ],
  },

  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

export default nextConfig
