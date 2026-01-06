import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#135bec',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#135bec',
          600: '#1048c9',
          700: '#0d3aa6',
          800: '#0a2c83',
          900: '#071e60',
        },
        background: {
          light: '#f6f6f8',
          dark: '#101622',
        },
        surface: {
          light: '#ffffff',
          dark: '#1c2536',
        },
        border: {
          light: '#e5e7eb',
          dark: '#324467',
        },
        'text-secondary': '#92a4c9',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
export default config
