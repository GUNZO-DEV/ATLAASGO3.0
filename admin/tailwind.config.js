/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0E7C5A',
          50: '#E6F4EE',
          100: '#C2E6D7',
          200: '#8FD2B7',
          300: '#5CBE97',
          400: '#2FA679',
          500: '#0E7C5A',
          600: '#0B6349',
          700: '#094E3A',
          800: '#06392A',
          900: '#04241B'
        },
        ink: { DEFAULT: '#0E1A14', soft: '#1C2A22' },
        muted: '#6B7A72',
        cream: '#F4F8F5'
      }
    }
  },
  plugins: []
};
