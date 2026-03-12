/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F3F4F6',
        card: '#FAFAFB',
        primary: '#5B5CF6',
        textMain: '#0E2A47',
        textMuted: '#8C97AD',
        line: '#E2E5EB',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(27, 39, 94, 0.12)',
      },
      borderRadius: {
        xl2: '22px',
      },
    },
  },
  plugins: [],
}
