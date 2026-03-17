import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Next.js compat (FlatCompat) removed: it triggered "Converting circular structure to JSON"
// in @eslint/eslintrc when loading next config. Base config + react-hooks + typescript
// cover lint for apps/web; add next-specific rules here if needed.

export default defineConfig(
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/out/**', // Next.js static export (e.g. example-nextjs)
      '**/.turbo/**',
      '**/build/**',
      '**/coverage/**',
      '**/generated/**',
      '**/next-env.d.ts',
    ],
  },

  // Base configs
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,

  // Global settings
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImports,
      import: importPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Unused imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // TypeScript unused vars
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Import order
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'next',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'next/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['react', 'builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },

  // Allow 'any' in generic utility files, base classes, and reusable components
  {
    files: [
      // API utilities and base classes
      'apps/api/src/lib/**/*.ts',
      'apps/api/src/repositories/common/**/*.ts',
      'apps/api/src/services/common/**/*.ts',
      'apps/api/src/rest/controllers/base.controller.ts',
      'apps/api/src/middleware/validation.middleware.ts',
      // Web generic/reusable utilities
      'apps/web/components/common/**/*.{ts,tsx}',
      'apps/web/components/ui/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Ignore Next.js generated files
  {
    files: ['apps/web/next-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },

  // Forbid direct process.env in API app source; allow in config/, scripts/, tests/
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[object.name="process"][property.name="env"]',
          message:
            'Use config from @/config or getEnv() from @grantjs/env instead of process.env. Allowed in config/, scripts/, and tests/.',
        },
      ],
    },
  },
  {
    files: ['apps/api/src/config/**/*.ts', 'apps/api/tests/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  }
);
