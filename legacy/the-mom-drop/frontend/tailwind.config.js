/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          coral: '#FF6F61',
          coralLight: '#FFE6E3',
          coralSoft: '#FFB7B2',
          charcoal: '#2B2D42',
          beauty: '#5C2030',
          beautyBg: '#FFEAEB', // Light powder pink for beauty backgrounds
          baby: '#2F3E46',
          babyBg: '#F0F4F1', // Safe light sage background
          home: '#9A7B56',
          homeBg: '#FDFBF7', // Light warm sand background
        }
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
