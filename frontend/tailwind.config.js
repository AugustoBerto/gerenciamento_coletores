/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dass: {
          blue: '#002B49',
          gold: '#C5A059',
          light: '#F4F6F9',
        }
      }
    },
  },
  plugins: [],
}
