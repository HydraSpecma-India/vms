/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#FFCC00',
          light: '#B3B3B3',
          dark: '#575757',
          navy: '#1E2530',
          charcoal: '#111827',
        },
      },
    },
  },
  plugins: [],
};
