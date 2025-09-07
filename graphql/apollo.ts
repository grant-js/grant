import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { verify } from 'jsonwebtoken';
import { NextRequest } from 'next/server';

import { providers } from '@/graphql/config/providers';
import { db } from '@/graphql/lib/database/connection';
import { schema } from '@/graphql/resolvers';
import { GraphqlContext, AuthenticatedUser } from '@/graphql/types';
import { AUTH_HEADER_KEY, AUTH_TOKEN_KEY } from '@/lib/constants';

import { createControllers } from './controllers';
import { createRepositories } from './repositories';
import { JWT_SECRET } from './resolvers/auth/constants';
import { createServices } from './services';

const server = new ApolloServer<GraphqlContext>({
  schema,
});

export const handler = startServerAndCreateNextHandler<NextRequest, GraphqlContext>(server, {
  context: async (req) => {
    let user: AuthenticatedUser | null = null;
    const { cookies, headers } = req;
    const cookieToken = cookies.get(AUTH_TOKEN_KEY)?.value;
    const authorization = headers.get(AUTH_HEADER_KEY);
    const headerToken = authorization?.split(' ')[1];
    const token = headerToken || cookieToken;
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
      providers,
      controllers,
    };
  },
});
