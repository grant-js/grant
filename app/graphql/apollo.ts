import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { typeDefs, resolvers } from './schema';

// Create the Apollo Server instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Export the handler for the API route
export const handler = startServerAndCreateNextHandler(server, {
  context: async (req) => ({ req }),
});
