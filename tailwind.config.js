/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        raycast: {
          orange: '#FF6363',
          pink: '#FF5C8D',
          purple: '#B794F6',
          indigo: '#667EEA',
        },
      },
      backgroundImage: {
        'gradient-raycast': 'linear-gradient(135deg, #FF6363 0%, #FF5C8D 50%, #B794F6 100%)',
        'gradient-raycast-alt': 'linear-gradient(135deg, #667EEA 0%, #B794F6 50%, #FF5C8D 100%)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(255, 99, 99, 0.5)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(255, 99, 99, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
