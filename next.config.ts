/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignora erros de tipagem estrita apenas no build de produção da Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora avisos do linter na hora do build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;