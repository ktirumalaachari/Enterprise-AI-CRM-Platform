/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'rgb(var(--color-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
          success: 'rgb(var(--color-success) / <alpha-value>)',
          textPrimary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          textSecondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          surface: 'rgb(var(--color-surface) / <alpha-value>)',
          bg: 'rgb(var(--color-bg) / <alpha-value>)',
          darkBg: '#09090B',
          darkSurface: '#121212',
          darkCard: '#18181B',
          darkBorder: '#27272A',
          darkTextPrimary: '#FFFFFF',
          darkTextSecondary: '#A1A1AA',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
