/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vibrant theme custom for glassmorphism
        darkBg: '#090d16',
        darkCard: '#131b2e',
        accentGlow: '#00f2fe',
        successGlow: '#00ff87',
        warningGlow: '#ffd000',
        dangerGlow: '#ff007f',
      },
    },
  },
  plugins: [],
}
