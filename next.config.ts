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
  // Deshabilita completamente el prerenderizado automático de 404
  experimental: {
    disableOptimizedLoading: true,
    missingSuspenseWithCSRBailout: false, // Desactiva warnings de CSR
  },
}

export default nextConfig