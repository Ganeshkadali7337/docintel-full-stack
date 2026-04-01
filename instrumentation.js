// instrumentation.js — runs once before any API routes load on the server
// Polyfills browser globals that pdfjs-dist (used by pdf-parse) requires in Node.js

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (typeof globalThis.DOMMatrix === 'undefined') {
      globalThis.DOMMatrix = class DOMMatrix {}
    }
    if (typeof globalThis.Path2D === 'undefined') {
      globalThis.Path2D = class Path2D {}
    }
    if (typeof globalThis.ImageData === 'undefined') {
      globalThis.ImageData = class ImageData {}
    }
  }
}
