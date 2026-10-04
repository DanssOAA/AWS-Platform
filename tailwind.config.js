/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cloud: {
          bg: '#F8FAFC',
          sidebar: '#0F172A',
          primary: '#2563EB',
          security: '#16A34A',
          costs: '#F59E0B',
          alerts: '#DC2626',
          textMain: '#1E293B',
          textSec: '#64748B',
          borders: '#E2E8F0',
          cards: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '14px',
      }
    },
  },
  plugins: [],
}
