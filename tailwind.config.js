/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cosmos: {
          50: '#f0f4ff',
          100: '#dce6ff',
          200: '#baccff',
          300: '#84a9ff',
          400: '#4d7fff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1e3163',
          950: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
