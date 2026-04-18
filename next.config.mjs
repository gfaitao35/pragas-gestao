/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  // Necessário para puppeteer-core + chromium funcionarem no Vercel
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
}

export default nextConfig
