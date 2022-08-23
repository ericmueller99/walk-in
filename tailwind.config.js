/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [
    require('./node_modules/hollyburn-lib/tailwind.config')
  ],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/hollyburn-lib/src/components/*.js"
  ],
  theme: {
    extend: {
      backgroundImage: {
        'walkInBanner': 'url(/images/walkin-banner.jpg)'
      }
    },
  },
  plugins: [],
}
