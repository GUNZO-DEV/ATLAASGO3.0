/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF5722',
          50: '#FFF1EB',
          100: '#FFD9C7',
          200: '#FFB99A',
          300: '#FF9A6D',
          400: '#FF7849',
          500: '#FF5722',
          600: '#E64A1A',
          700: '#BF3E15',
          800: '#992F0D',
          900: '#6B1E08',
        },
        coral: '#FF8A65',
        amber: '#FFB74D',
        sand: '#F5E6D3',
        cream: '#FBF7F2',
        ink: {
          DEFAULT: '#1A1410',
          soft: '#2A211C',
        },
        muted: '#7A6F66',
      },
      fontFamily: {
        display: ['Montserrat_800ExtraBold', 'System'],
        sans: ['Inter_500Medium', 'System'],
        mono: ['JetBrainsMono_500Medium', 'monospace'],
      },
      borderRadius: {
        xl: '20px',
        '2xl': '28px',
        '3xl': '36px',
      },
      boxShadow: {
        glow: '0 18px 40px rgba(255, 87, 34, 0.35)',
      },
    },
  },
  plugins: [],
};
