const { defineConfig } = require('@minko-fe/eslint-config')
const eslintPluginAstro = require('eslint-plugin-astro')

module.exports = defineConfig(
  [
    ...eslintPluginAstro.configs['flat/recommended'],
    {
      rules: {
        'astro/no-set-text-directive': 'error',
      },
    },
  ],
  {
    react: true,
  },
)
