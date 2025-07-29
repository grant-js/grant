import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';

import { graphqlConfig } from '@/graphql/config';
import { schema } from '@/graphql/schema';
import { Context } from '@/graphql/types';

// Create the Apollo Server instance
const server = new ApolloServer<Context>({
  schema,
});

// Export the handler for the API route
export const handler = startServerAndCreateNextHandler(server, {
  context: async (req) => ({
    req,
    providers: graphqlConfig.providers,
  }),
});
