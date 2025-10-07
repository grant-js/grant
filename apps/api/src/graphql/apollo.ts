import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { db } from '@logusgraphics/grant-database';
import { GraphQLError } from 'graphql';
import { NextRequest } from 'next/server';

import { createControllers } from '@/graphql/controllers';
import { createRepositories } from '@/graphql/repositories';
import { createServices } from '@/graphql/services';
import { extractUserFromToken } from '@/lib/auth';

import { schema } from './resolvers';
import { AuthenticatedUser, GraphqlContext } from './types';

const server = new ApolloServer<GraphqlContext>({
  schema,
  introspection: process.env.NODE_ENV !== 'production',
});

function createContext(user: AuthenticatedUser | null) {
  const scopeCache = {
    roles: new Map(),
    users: new Map(),
    groups: new Map(),
    permissions: new Map(),
    tags: new Map(),
    projects: new Map(),
  };

  const repositories = createRepositories(db);
  const services = createServices(repositories, user, db);
  const controllers = createControllers(scopeCache, services, db);

  return { user, controllers };
}

export default startServerAndCreateNextHandler<NextRequest, GraphqlContext>(server, {
  context: async (req) => {
    const authHeader = req.headers.get('authorization');

    const user = extractUserFromToken(authHeader);

    if (authHeader && authHeader.startsWith('Bearer ') && !user) {
      throw new GraphQLError('Invalid or expired authentication token', {
        extensions: {
          code: 'UNAUTHENTICATED',
          http: { status: 401 },
        },
      });
    }

    return createContext(user);
  },
});
