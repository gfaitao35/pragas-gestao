/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removido: output: 'standalone' (não é necessário na Vercel)
  // Removido: tudo relacionado ao Electron
  images: {
    remotePatterns: [],
  },
}

export default nextConfig
