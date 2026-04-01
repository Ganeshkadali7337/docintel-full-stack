// Tailwind CSS configuration for Document Intelligence Platform
// Scans all JS/JSX files in app/, components/, hooks/, and lib/ for class names

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './hooks/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
