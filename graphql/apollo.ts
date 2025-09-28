import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';

import { createControllers } from '@/graphql/controllers';
import { db } from '@/graphql/lib/database/connection';
import { createRepositories } from '@/graphql/repositories';
import { createServices } from '@/graphql/services';

import { schema } from './resolvers';
import { AuthenticatedUser, GraphqlContext } from './types';

const server = new ApolloServer<GraphqlContext>({
  schema,
  introspection: process.env.NODE_ENV !== 'production',
});

export default startServerAndCreateNextHandler<NextRequest, GraphqlContext>(server, {
  context: async (req) => {
    // TODO: Add authentication logic here
    // For now, return null user
    const user: AuthenticatedUser | null = null;

    // Initialize the full stack: repositories -> services -> controllers
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

    return {
      user,
      controllers,
    };
  },
});
