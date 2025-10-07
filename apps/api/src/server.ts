import http from 'http';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { db } from '@logusgraphics/grant-database';
import cors from 'cors';
import express from 'express';
import { GraphQLError } from 'graphql';
import helmet from 'helmet';

import { createControllers } from '@/graphql/controllers';
import { createRepositories } from '@/graphql/repositories';
import { schema } from '@/graphql/resolvers';
import { createServices } from '@/graphql/services';
import { AuthenticatedUser, GraphqlContext } from '@/graphql/types';
import { extractUserFromToken } from '@/lib/auth';

const PORT = process.env.PORT || 4000;

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer<GraphqlContext>({
    schema,
    introspection: process.env.NODE_ENV !== 'production',
    csrfPrevention: process.env.NODE_ENV === 'production',
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      ApolloServerPluginInlineTrace(),
    ],
  });

  await server.start();

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

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL
          : [
              'http://localhost:3000',
              'http://localhost:3001',
              'https://studio.apollographql.com',
              'https://apollo-studio-embed.vercel.app',
            ],
      credentials: true,
    }),
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const authHeader = req.headers.authorization;

        const user = extractUserFromToken(authHeader || null);

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
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`🚀 Apollo Server ready at http://localhost:${PORT}/graphql`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
