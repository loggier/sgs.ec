import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  serverActions: {
    bodySizeLimit: '10mb',
  },
  // Deshabilita completamente el prerenderizado automático de 404
  experimental: {
    disableOptimizedLoading: true,
  },
}

export default nextConfig
