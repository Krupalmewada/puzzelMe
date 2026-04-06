/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Press Start 2P"', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      colors: {
        sky: {
          puzzle: '#EFF8FF',
          accent: '#38BDF8',
          hover:  '#0EA5E9',
          border: '#7DD3FC',
          text:   '#0C4A6E',
          muted:  '#7CB9D4',
        }
      },
      borderRadius: {
        card: '24px',
      }
    },
  },
  plugins: [],
}