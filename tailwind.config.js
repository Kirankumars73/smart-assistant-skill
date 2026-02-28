/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      colors: {
        // Midnight Oil Palette - Rich Dark with Bioluminescent Accents
        midnight: {
          DEFAULT: '#0a0a0f',
          50: '#2a2a35',
          100: '#1a1a25',
          200: '#151520',
          300: '#121218',
          400: '#0f0f15',
          500: '#0a0a0f',
          600: '#08080c',
          700: '#060609',
          800: '#040406',
          900: '#020203',
        },
        // Bioluminescent glow colors
        glow: {
          cyan: {
            DEFAULT: '#06b6d4',
            light: '#22d3ee',
            dark: '#0891b2',
          },
          blue: {
            DEFAULT: '#3b82f6',
            light: '#60a5fa',
            dark: '#2563eb',
          },
          purple: {
            DEFAULT: '#a855f7',
            light: '#c084fc',
            dark: '#9333ea',
          },
          pink: {
            DEFAULT: '#ec4899',
            light: '#f472b6',
            dark: '#db2777',
          },
        },
      },
      backgroundImage: {
        'mesh-gradient': 'radial-gradient(at 27% 37%, rgba(6, 182, 212, 0.35) 0px, transparent 50%), radial-gradient(at 97% 21%, rgba(59, 130, 246, 0.35) 0px, transparent 50%), radial-gradient(at 52% 99%, rgba(168, 85, 247, 0.35) 0px, transparent 50%), radial-gradient(at 10% 85%, rgba(236, 72, 153, 0.25) 0px, transparent 50%)',
        'glow-gradient': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #a855f7 100%)',
        'glow-radial': 'radial-gradient(circle at center, rgba(6, 182, 212, 0.4) 0%, transparent 70%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'spotlight': 'spotlight 2s ease .75s 1 forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'meteor': 'meteor 5s linear infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'underline-grow': 'underlineGrow 0.3s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        spotlight: {
          '0%': {
            opacity: '0',
            transform: 'translate(-72%, -62%) scale(0.5)',
          },
          '100%': {
            opacity: '1',
            transform: 'translate(-50%, -40%) scale(1)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        meteor: {
          '0%': { transform: 'translateY(-100%) translateX(-100%)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(300%) translateX(300%)', opacity: '0' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(6, 182, 212, 0.6), 0 0 60px rgba(6, 182, 212, 0.4)' },
        },
        underlineGrow: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(6, 182, 212, 0.3)',
        'glow': '0 0 20px rgba(6, 182, 212, 0.4), 0 0 40px rgba(6, 182, 212, 0.2)',
        'glow-lg': '0 0 30px rgba(6, 182, 212, 0.5), 0 0 60px rgba(6, 182, 212, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
