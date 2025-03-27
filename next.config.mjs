/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Desactivar ESLint durante la compilación
    ignoreDuringBuilds: true,
  },
  // Ignorar errores de TypeScript durante la compilación
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignorar advertencias durante la compilación
  output: 'standalone',
  env: {
    // Asegurarse de que Prisma pueda usar la URL de Prisma Accelerate
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  // Configuración para imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/api/**',
      },
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true, // Permite usar imágenes sin optimización
  },
  // Configuración avanzada para cookies y seguridad
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig; 