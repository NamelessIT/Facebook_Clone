/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Dòng này bắt Tailwind quét hết file React của bạn
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}