const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,md,mdx,tsx}'],
  darkMode: ['selector'],
  presets: [require('tailwind-antd-preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Atkinson', ...defaultTheme.fontFamily.sans],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'full',
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
  corePlugins: {
    preflight: true,
  },
}
