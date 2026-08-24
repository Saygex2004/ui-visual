// Flat ESLint config for the pvp-dashboard monorepo.
// The i18n discipline (FRONTEND.md §6) is enforced by `react/jsx-no-literals`
// on apps/web JSX: no literal user-facing strings in components.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      // Built SPA copied here by `deploy.sh hosting`; git-ignored but present
      // on disk after any deploy, and minified bundles produce thousands of
      // meaningless lint errors if walked.
      'firebase/hosting-dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.gen.ts',
      '**/routeTree.gen.ts',
      'docs/**',
      '.agents/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Web: React + the no-literal-JSX-strings i18n gate.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser },
    },
    settings: { react: { version: '19.2' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/jsx-no-literals': 'error',
    },
  },
  // Node contexts.
  {
    files: ['apps/server/**/*.ts', 'packages/**/*.ts', '*.js', 'seed/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
