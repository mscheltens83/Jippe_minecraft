// Lint-regels voor JippeCraft: `npm run lint`. Vangt tikfouten en vergeten variabelen.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['lib/**', 'node_modules/**', 'tests/out/**'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.browser },
  },
  {
    files: ['sw.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: globals.serviceworker },
  },
  {
    files: ['tests/**/*.mjs', 'tools/**/*.mjs', '*.mjs'],
    // Testcode draait deels ín de browser (page.evaluate), dus beide soorten globals
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
