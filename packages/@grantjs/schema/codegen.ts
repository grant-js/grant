import type { CodegenConfig } from '@graphql-codegen/cli';

const schemaTypesConfig = {
  useIndexSignature: true,
  enumsAsTypes: false,
  scalars: {
    Date: 'Date',
    JSON: 'Record<string, unknown>',
  },
} as const;

const config: CodegenConfig = {
  schema: './src/schema/**/*.graphql',
  documents: './src/operations/**/*.graphql',
  hooks: {
    afterAllFileWrite: ['pnpm run format'],
  },
  generates: {
    // Base schema types (shared by operations output below)
    './src/generated/schema-types.ts': {
      plugins: ['typescript'],
      config: schemaTypesConfig,
    },
    // Client operations + typed document nodes (imports schema types; do not combine with `typescript` here — v6 operations re-emits schema types and duplicates identifiers)
    './src/generated/graphql.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        ...schemaTypesConfig,
        importSchemaTypesFrom: './src/generated/schema-types',
      },
    },
    // Server-side resolver types (generic, no specific context). Like the operations
    // output above, this imports the schema types instead of re-emitting them —
    // running `typescript` here too produced a second copy of all 464 type names and
    // forced src/index.ts to re-export resolvers through a hand-curated allowlist to
    // dodge the collision. `typescript-resolvers` has no `importSchemaTypesFrom` (that
    // option belongs to the documents visitor), so the equivalent is
    // `namespacedImportName` plus an `add` plugin supplying the import line.
    './src/generated/resolvers.ts': {
      plugins: [
        { add: { content: "import type * as Types from './schema-types';" } },
        'typescript-resolvers',
      ],
      config: {
        ...schemaTypesConfig,
        namespacedImportName: 'Types',
      },
    },
  },
};

export default config;
