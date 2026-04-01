// Next.js configuration for Document Intelligence Platform

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep strict mode on — helps catch bugs early in development
  reactStrictMode: true,
  experimental: {
    // Prevent webpack from bundling pdf-parse — it uses pdfjs-dist which
    // breaks under Next.js 14 webpack's module analysis (Object.defineProperty error)
    serverComponentsExternalPackages: ['pdf-parse'],
  },
}

export default nextConfig
