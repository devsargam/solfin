/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./global.css', './app/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
