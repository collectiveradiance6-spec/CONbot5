/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pearl: '#fbfdff',
        ink: '#172033',
      },
      boxShadow: {
        glass:
          '0 24px 80px rgba(86, 112, 145, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.86)',
        'glass-soft':
          '0 12px 34px rgba(86, 112, 145, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.82)',
        'glass-inset':
          'inset 0 1px 0 rgba(255,255,255,.88), inset 0 -18px 32px rgba(198, 218, 236, .18)',
      },
    },
  },
  plugins: [],
}
