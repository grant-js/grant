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

// Adapter packages implement @grantjs/core's ports. Nothing at or below core in the
// package DAG may import them, or the DAG acquires a cycle at runtime even though
// each package type-checks alone. Shared by the per-package boundary rules below;
// each package's own code-quality pass adds its scope.
const ADAPTER_PACKAGES = [
  '@grantjs/cache',
  '@grantjs/storage',
  '@grantjs/email',
  '@grantjs/jobs',
  '@grantjs/logger',
  '@grantjs/errors',
];

const noAdapterImports = (pkg) =>
  ADAPTER_PACKAGES.map((name) => ({
    name,
    message: `${pkg} must not import adapter packages — see AGENTS.md § Package dependency graph.`,
  }));

// Every internal package below core in the DAG, mapped to the workspace packages it
// actually declares in its own package.json. The map IS the DAG for these packages —
// derive it from `dependencies`, never by copying a sibling's rule. Pass 4 copied
// core's rule into database and broke the build, because database legitimately
// depends on env and constants; the allowed set differs per package and always has.
//
// The published packages (client, server, cli) are deliberately absent: they are an
// npm contract surface with a different review bar, audited in pass 7.
const INTERNAL_PACKAGE_DEPS = {
  analytics: ['@grantjs/core'],
  cache: ['@grantjs/core'],
  constants: ['@grantjs/core'],
  email: ['@grantjs/core'],
  env: [],
  errors: ['@grantjs/core'],
  i18n: [],
  jobs: ['@grantjs/core', '@grantjs/schema'],
  logger: ['@grantjs/core'],
  storage: ['@grantjs/core'],
  telemetry: ['@grantjs/core'],
  webhooks: ['@grantjs/core'],
};

// Expressed as a negated pattern rather than a `paths` list of everything forbidden,
// for the reason schema's rule already records: a pattern covers a new workspace
// package on the day it is created, whereas a path list silently does not.
const onlyDeclaredWorkspaceDeps = ([pkg, allowed]) => ({
  files: [`packages/@grantjs/${pkg}/src/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@grantjs/*', ...allowed.map((name) => `!${name}`)],
            message: allowed.length
              ? `@grantjs/${pkg} may import only ${allowed.join(' and ')} — see AGENTS.md § Package dependency graph.`
              : `@grantjs/${pkg} must not import any workspace package — see AGENTS.md § Package dependency graph.`,
          },
        ],
      },
    ],
  },
});

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
  },

  // apps/web layer boundary: hooks/** is the only place Apollo operations and
  // *Document imports from @grantjs/schema get wired — see AGENTS.md § Web app
  // layer boundaries. Scoped to app/** and components/**; hooks/**, lib/**, and
  // stores/** fall outside these globs and are unaffected. @grantjs/core is
  // deliberately not restricted here — apps/web may reach it directly for zod
  // schemas that aren't GraphQL-codegen'd (see AGENTS.md).
  {
    files: ['apps/web/app/**/*.{ts,tsx}', 'apps/web/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@apollo/client',
              importNames: ['useQuery', 'useMutation', 'useLazyQuery', 'useSubscription'],
              message:
                'Apollo operations must be wired in hooks/** — see AGENTS.md § Web app layer boundaries.',
            },
            {
              name: '@apollo/client/react',
              importNames: ['useQuery', 'useMutation', 'useLazyQuery', 'useSubscription'],
              message:
                'Apollo operations must be wired in hooks/** — see AGENTS.md § Web app layer boundaries.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ImportDeclaration[source.value='@grantjs/schema'] > ImportSpecifier[imported.name=/Document$/]",
          message:
            '*Document imports must be wired in hooks/** — see AGENTS.md § Web app layer boundaries.',
        },
      ],
    },
  },

  // Named, justified exceptions to the boundary above — see AGENTS.md § Web app
  // layer boundaries for the rationale on each. This list is the record of the
  // decision, not a silent eslint-disable.
  {
    files: [
      'apps/web/components/features/auth/mfa-step-up-dialog.tsx',
      'apps/web/components/features/notifications/notification-bell.tsx',
    ],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  // @grantjs/core sits at the bottom of the package DAG — it must never import
  // adapter packages or @grantjs/database. Currently 100% clean; this locks it in.
  // Scoped to core only; each later package pass widens the guardrail to itself.
  {
    files: ['packages/@grantjs/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...noAdapterImports('@grantjs/core'),
            {
              name: '@grantjs/database',
              message:
                '@grantjs/core must not import @grantjs/database — see AGENTS.md § Package dependency graph.',
            },
          ],
        },
      ],
    },
  },

  // @grantjs/database sits beside the adapter packages, not above them: it may reach
  // down to @grantjs/core, @grantjs/env, and @grantjs/constants (all three are real
  // dependencies) but never sideways into a sibling adapter. Note the allowed set is
  // wider than core's — copying core's rule verbatim here would break the build.
  {
    files: ['packages/@grantjs/database/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: noAdapterImports('@grantjs/database') }],
    },
  },

  // @grantjs/schema sits at the very bottom of the DAG, below core: it is codegen
  // output plus hand-written contract types and depends on nothing in the workspace
  // (its only runtime dependency is @graphql-typed-document-node/core). So the rule
  // here is not "no adapters" like core's and database's — it is "no @grantjs/* at
  // all", expressed as a pattern so a new workspace package is covered on the day it
  // is created. Verified clean when written; this locks it in. Generated output is
  // already excluded by the global `**/generated/**` ignore.
  {
    files: ['packages/@grantjs/schema/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@grantjs/*'],
              message:
                '@grantjs/schema must not import any workspace package — it sits below core in the DAG. See AGENTS.md § Package dependency graph.',
            },
          ],
        },
      ],
    },
  },

  // The remaining 12 internal packages — the adapters plus constants, env and i18n.
  // Pass 6 widens the guardrail to every internal package, so a clean lens 1 stops
  // being clean by review and starts being clean by rule. Each package's allowed set
  // comes from INTERNAL_PACKAGE_DEPS above, which is derived from its own
  // package.json. Every one of these rules was proven to fire by planting a real
  // import and confirming the error before this landed.
  ...Object.entries(INTERNAL_PACKAGE_DEPS).map(onlyDeclaredWorkspaceDeps)
);
