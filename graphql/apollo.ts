import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { verify } from 'jsonwebtoken';

import { providers } from '@/graphql/config/providers';
import { schema } from '@/graphql/resolvers';
import { Context, AuthenticatedUser } from '@/graphql/types';

import { createControllers } from './controllers';
import { db } from './lib/providers/database/connection';
import { createRepositories } from './repositories';
import { JWT_SECRET } from './resolvers/auth/constants';
import { createServices } from './services';

const server = new ApolloServer<Context>({
  schema,
});

export const handler = startServerAndCreateNextHandler(server, {
  context: async (req) => {
    let user: AuthenticatedUser | null = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = verify(token, JWT_SECRET);
        const sub = decoded.sub;
        if (typeof sub === 'string' && sub !== '') {
          user = {
            id: sub,
            sub: sub,
          };
        }
      } catch (error) {
        console.error(error);
      }
    }

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
      req,
      providers,
      controllers,
    };
  },
});
