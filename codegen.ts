import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './graphql/schema/**/*.graphql',
  generates: {
    './graphql/generated/types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        contextType: '@/graphql/types#GraphqlContext',
        scalars: {
          Date: 'Date',
        },
      },
    },
  },
};

export default config;
