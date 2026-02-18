import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        accent: {
          green: '#28F29C',
          blue: '#0CB8E0',
          purple: '#635DFF',
        },
      },
      backgroundImage: {
        gradient: 'linear-gradient(135deg, #28F29C 0%, #0CB8E0 50%, #635DFF 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
