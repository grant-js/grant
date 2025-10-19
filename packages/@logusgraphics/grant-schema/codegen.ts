import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/schema/**/*.graphql',
  documents: './src/operations/**/*.graphql',
  generates: {
    // Client-side types and operations (optimized - no unused utilities)
    './src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        useIndexSignature: true,
        enumsAsTypes: false,
        scalars: {
          Date: 'Date',
          JSON: 'Record<string, unknown>',
        },
        // Optimization: Skip unused hooks/components
        withHooks: false,
        withComponent: false,
        withHOC: false,
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
