/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        appbg: '#e7e1d3', // warm cream page
        panel: '#faf5ea', // soft off-white card
        panelalt: '#f0e8d6',
        edge: '#e2d7c1', // warm border
        ink: '#2f2c3d', // deep ink
        muted: '#8d8574', // warm gray
        accent: '#54689f', // dusty blue (woset)
        accent2: '#d99b3c', // mustard
        canvas: '#16130e', // warm espresso layout canvas
        // woset-ish accent family
        brick: '#b0473c',
        plum: '#6a4b60',
        forest: '#3f6b4f',
        mustard: '#d99b3c',
        dusty: '#54689f',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(70,55,25,0.05), 0 6px 18px rgba(70,55,25,0.09)',
        pop: '0 10px 34px rgba(70,55,25,0.18)',
      },
      borderRadius: {
        xl2: '16px',
      },
      fontFamily: {
        sans: [
          'ui-rounded',
          '"SF Pro Rounded"',
          '"Segoe UI"',
          'system-ui',
          '-apple-system',
          'Roboto',
          'sans-serif',
        ],
        display: ['ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
