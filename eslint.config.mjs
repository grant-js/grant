import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
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
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
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

      // Import order — use simple-import-sort (eslint-plugin-import `import/order` crashes on ESLint 10; see import-js/eslint-plugin-import#3227)
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:'],
            ['^react$', '^react-dom$', '^react/', '^next', '^@?\\w'],
            ['^@/'],
            ['^'],
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
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

  // Standalone Node scripts inside a workspace (tooling, not app code). Without
  // this they trip no-undef on console/process, which the TS configs supply via
  // @types/node but a bare .mjs does not.
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
      },
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
  },

  // ---------------------------------------------------------------------------
  // Grant guardrails — encode the rules in AGENTS.md so they cannot silently regress.
  // See docs/contributing/code-quality/README.md § Enforcement.
  // ---------------------------------------------------------------------------

  // Un-awaited promises. A floating cache write inside a transaction let the
  // transaction commit before the write landed, and turned a rejection into an
  // unhandled rejection (audit Tier 0.1, plus 12 more of the same shape).
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },

  // Import discipline — the symbol/source table in AGENTS.md.
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@grantjs/logger',
              message: 'Import createLogger/Logger from @/lib/logger instead.',
            },
            {
              name: '@grantjs/errors',
              message: 'Import HttpException/mapDomainToHttp from @/lib/errors instead.',
            },
            {
              name: '@grantjs/core',
              importNames: [
                'AuthenticationError',
                'AuthorizationError',
                'BadRequestError',
                'ConfigurationError',
                'ConflictError',
                'GrantException',
                'InvalidOrUsedVerificationTokenError',
                'NoSessionSigningKeyError',
                'NotFoundError',
                'TokenExpiredError',
                'TokenInvalidError',
                'TokenValidationError',
                'ValidationError',
              ],
              message: 'Import domain errors from @/lib/errors, which re-exports them.',
            },
            {
              name: '@/services/common',
              importNames: ['DeleteParams', 'SelectedFields', 'Otp'],
              message: 'Import these from @/types instead.',
            },
          ],
          patterns: [
            {
              group: ['**/common/PivotRepository', '**/common/EntityRepository'],
              message: 'Import repository base classes from @/repositories/common.',
            },
          ],
        },
      ],
    },
  },

  // The re-export layers are the one place allowed to reach the underlying packages.
  {
    files: ['apps/api/src/lib/logger/**/*.ts', 'apps/api/src/lib/errors/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // Layer boundaries: Transport -> Handlers -> Services -> Repositories -> Database.
  // Currently 100% clean; these rules lock that in.
  {
    files: ['apps/api/src/handlers/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/repositories', '@/repositories/*'],
              message: 'Handlers must not import repositories — go through a service.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/rest/**/*.ts', 'apps/api/src/graphql/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/repositories', '@/repositories/*', '@/services', '@/services/*'],
              message: 'Transport must call handlers only (context.handlers).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/repositories/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services', '@/services/*', '@/handlers', '@/handlers/*'],
              message: 'Repositories are database access only.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/services/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/handlers', '@/handlers/*'],
              message: 'Services must not import handlers.',
            },
          ],
        },
      ],
    },
  }
);
