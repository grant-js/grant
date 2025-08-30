import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { verify } from 'jsonwebtoken';

import { providers } from '@/graphql/config/providers';
import { createServices } from '@/graphql/config/services';
import { schema } from '@/graphql/resolvers';
import { Context, AuthenticatedUser } from '@/graphql/types';

import { db } from './lib/providers/database/connection';
import { JWT_SECRET } from './resolvers/auth/constants';

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
        user = {
          id: decoded.sub as string,
          sub: decoded.sub as string,
        };
      } catch (error) {
        console.error(error);
      }
    }

    const services = createServices({ user, db });

    return {
      req,
      providers,
      services,
      user,
    };
  },
});
