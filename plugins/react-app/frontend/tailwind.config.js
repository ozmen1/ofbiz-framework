/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // ─── Oracle Redwood Design System Paleti ───
        oracle: {
          red: '#c74634',
          'red-hover': '#b03828',
          'red-active': '#942b1d',
          'red-subtle': '#fdf3f2',
          'red-dark': '#3e130e',
          canvas: '#161513',
          surface: '#262421',
          'surface-hover': '#2f2c28',
          border: '#3c3834',
          light: '#f7f6f3',
          'light-surface': '#ffffff',
          'light-border': '#e8e5df',
          teal: '#267261',
          amber: '#d97706',
          plum: '#7e3878',
        },
        // Indigo sınıflarını doğrudan Oracle Redwood Kırmızısı tonlarına eşleme (Tüm buton, link, badge ve tablar için)
        indigo: {
          50: '#fdf3f2',
          100: '#fbe6e3',
          200: '#f8cfca',
          300: '#eea59b',
          400: '#e27263',
          500: '#d45341',
          600: '#c74634', // İkonik Oracle Redwood Kırmızı (#c74634)
          700: '#aa3627',
          800: '#8c2e22',
          900: '#742a20',
          950: '#3e130e',
        },
        // Slate sınıflarını Oracle Redwood Sıcak Bazalt / Kömür ve Kum tonlarına eşleme (Arka plan, kart ve kenarlıklar için)
        slate: {
          50: '#faf9f7',
          100: '#f5f3ef',
          200: '#e8e5df',
          300: '#d6d1c7',
          400: '#a8a296',
          500: '#787266',
          600: '#575249',
          700: '#3c3834', // Oracle Redwood dark divider/border
          800: '#262421', // Oracle Redwood dark card/surface
          900: '#1d1b18', // Oracle Redwood dark elevated surface & sidebar
          950: '#161513', // Oracle Redwood dark page canvas (Neutral 100)
        },
        // Emerald sınıflarını Oracle Redwood Orman Yeşili / Teal tonuna eşleme
        emerald: {
          50: '#f0f9f6',
          100: '#ddf1eb',
          200: '#bee3d8',
          300: '#91cdbf',
          400: '#5fb1a0',
          500: '#267261', // Redwood Teal Forest
          600: '#1f5d4f',
          700: '#1a4b41',
          800: '#173d35',
          900: '#15332d',
          950: '#091c19',
        },
        // Purple sınıflarını Oracle Redwood Erik / Mürdüm (Plum) tonuna eşleme
        purple: {
          50: '#faf4fa',
          100: '#f5e8f4',
          200: '#edd3eb',
          300: '#dfb1db',
          400: '#c984c3',
          500: '#a85da2',
          600: '#7e3878', // Redwood Plum
          700: '#692d64',
          800: '#562752',
          900: '#482444',
          950: '#2c0f29',
        },
        // Amber sınıflarını Oracle Redwood Sıcak Toprak / Hardal tonuna eşleme
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d97706', // Redwood Ochre
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
          950: '#2b0f02',
        },
      },
    },
  },
  plugins: [],
}
