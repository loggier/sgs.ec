import type { NextConfig } from 'next';

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
  // Opciones clave para resolver el problema del 404:
  skipTrailingSlashRedirect: true,
  experimental: {
    // ► Remueve 'missingSuspenseWithCSRBailout' (ya no existe)
    // ► En su lugar, usa estas opciones compatibles:
    serverActions: true,  // Necesario si usas Server Actions
    optimizePackageImports: [  // Mejora el manejo de imports
      '@radix-ui/react-slot'  // Especialmente útil para ShadCN/ui
    ]
  },
  // ► Opción recomendada para builds estáticos:
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

export default nextConfig;