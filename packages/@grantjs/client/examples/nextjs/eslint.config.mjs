/**
 * Minimal ESLint config for the Next.js example (Next 16 removed `next lint`).
 * Uses basic TS/React rules without type-aware linting so this example is self-contained.
 */
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['node_modules/**', '.next/**', '*.config.*'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Allow sync setState in effect for one-off init (hash params, theme from localStorage)
      'react-hooks/set-state-in-effect': 'off',
    },
  }
);
