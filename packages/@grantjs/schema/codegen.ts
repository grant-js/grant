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
    // Server-side resolver types (generic, no specific context)
    './src/generated/resolvers.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        enumsAsTypes: false,
        scalars: {
          Date: 'Date',
          JSON: 'Record<string, unknown>',
        },
      },
    },
  },
};

export default config;
