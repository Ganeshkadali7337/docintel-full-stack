// Next.js configuration for Document Intelligence Platform

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep strict mode on — helps catch bugs early in development
  reactStrictMode: true,
  experimental: {
    // Exclude these packages from webpack bundling:
    // - pdf-parse: uses pdfjs-dist which needs browser APIs not available in Node.js
    // - tiktoken: uses WASM binary that webpack strips out during bundling
    serverComponentsExternalPackages: ['pdf-parse', 'tiktoken', 'pdfjs-dist'],
    // Enable instrumentation hook so instrumentation.js runs before any routes load
    // This is required to polyfill browser globals (DOMMatrix etc) for pdfjs-dist
    instrumentationHook: true,
  },
}

export default nextConfig
