import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/schema/**/*.graphql',
  documents: './src/operations/**/*.graphql',
  generates: {
    // Client-side types
    './src/generated/': {
      preset: 'client',
      config: {
        useIndexSignature: true,
        enumsAsTypes: false,
        scalars: {
          DateTime: 'string',
          JSON: 'Record<string, any>',
        },
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
          DateTime: 'string',
          JSON: 'Record<string, any>',
        },
        // No contextType - let consumers specify their own context
      },
    },
  },
};

export default config;
