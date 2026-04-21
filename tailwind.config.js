/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E1B4B',
          dark: '#0F172A',
        },
        secondary: {
          DEFAULT: '#FDFCFB',
        },
        accent: {
          DEFAULT: '#EAB308',
          gold: '#C5A059',
        },
        beauty: {
          pink: '#DB2777',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
