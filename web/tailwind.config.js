/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}", // If you use a src directory
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#67e8f9', // cyan-300
          DEFAULT: '#06b6d4', // cyan-500
          dark: '#0e7490', // cyan-700
        },
        secondary: {
          light: '#fde047', // yellow-300
          DEFAULT: '#facc15', // yellow-500
          dark: '#ca8a04', // yellow-700
        },
        danger: {
          light: '#fca5a5', // red-300
          DEFAULT: '#ef4444', // red-500
          dark: '#b91c1c', // red-700
        },
        neutral: {
          light: '#f3f4f6', // gray-100
          DEFAULT: '#6b7280', // gray-500
          dark: '#1f2937', // gray-800
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
