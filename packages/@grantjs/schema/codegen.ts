import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/schema/**/*.graphql',
  documents: './src/operations/**/*.graphql',
  hooks: {
    afterAllFileWrite: ['npm run format'],
  },
  generates: {
    // Client-side types and operations (typed document nodes for Apollo)
    './src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        useIndexSignature: true,
        enumsAsTypes: false,
        scalars: {
          Date: 'Date',
          JSON: 'Record<string, unknown>',
        },
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
