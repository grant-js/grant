import http from 'http';

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express5';
import { closeDatabase, initializeDatabase } from '@logusgraphics/grant-database';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { config, printConfigSummary, validateConfig } from '@/config';
import { schema } from '@/graphql/resolvers';
import { GraphqlContext } from '@/graphql/types';
import { i18nMiddleware, initializeI18n } from '@/i18n';
import { CacheFactory } from '@/lib/cache/cache.factory';
import { formatGraphQLError } from '@/lib/errors';
import { authMiddleware } from '@/middleware/auth.middleware';
import { contextMiddleware } from '@/middleware/context.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { createRestRouter } from '@/rest';
import { generateOpenApiDocument } from '@/rest/openapi';
import { ContextRequest } from '@/types';

async function startServer() {
  validateConfig();
  printConfigSummary();

  // Initialize i18n
  await initializeI18n();
  console.log('✅ i18n initialized with locales:', config.i18n.supportedLocales.join(', '));

  const db = initializeDatabase({
    connectionString: config.db.url,
    max: config.db.poolMax,
    idleTimeout: config.db.idleTimeout,
    connectTimeout: config.db.connectionTimeout,
  });

  const app = express();
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer<GraphqlContext>({
    schema,
    introspection: config.apollo.introspection,
    csrfPrevention: config.apollo.csrfPrevention,
    formatError: formatGraphQLError,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      ApolloServerPluginInlineTrace(),
    ],
  });

  await apolloServer.start();

  const scopeCache = CacheFactory.createEntityCache({
    strategy: config.cache.strategy,
    redis:
      config.cache.strategy === 'redis'
        ? {
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
          }
        : undefined,
  });

  app.use(cors<cors.CorsRequest>(config.cors));
  app.use(helmet(config.helmet));
  app.use(express.json());
  app.use(i18nMiddleware);

  const openApiDocument = generateOpenApiDocument();

  if (config.swagger.enabled) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, config.swaggerSetup));
  }

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiDocument);
  });

  app.use('/api', authMiddleware, contextMiddleware(db, scopeCache), (req, res, next) => {
    const contextReq = req as ContextRequest;
    const restRouter = createRestRouter(contextReq.context);
    restRouter(req, res, next);
  });

  app.use(
    '/graphql',
    authMiddleware,
    contextMiddleware(db, scopeCache),
    expressMiddleware(apolloServer, {
      context: async ({ req }: { req: express.Request }) => {
        const contextReq = req as ContextRequest;
        return contextReq.context;
      },
    })
  );

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global error handler - MUST be last!
  app.use(errorHandler);

  await new Promise<void>((resolve) => httpServer.listen({ port: config.app.port }, resolve));

  console.log(`🚀 Apollo Server ready at http://localhost:${config.app.port}/graphql`);
  console.log(`🌐 REST API ready at http://localhost:${config.app.port}/api`);
  if (config.swagger.enabled) {
    console.log(`📚 API Documentation at http://localhost:${config.app.port}/api-docs`);
    console.log(`📄 OpenAPI Spec at http://localhost:${config.app.port}/api-docs.json`);
  }
  console.log(`📊 Health check available at http://localhost:${config.app.port}/health`);

  const isDevelopment = config.app.isDevelopment;

  const gracefulShutdown = async (signal: string) => {
    // In development, exit quickly without verbose logging
    if (isDevelopment) {
      console.log(`\n👋 Shutting down...`);
      httpServer.close(() => {
        process.exit(0);
      });
      return;
    }

    // Production/Staging: Full graceful shutdown with detailed logging
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    httpServer.close(async () => {
      console.log('HTTP server closed');

      try {
        await CacheFactory.disconnect(scopeCache);
        console.log('Cache disconnected');
      } catch (error) {
        console.error('Error disconnecting cache:', error);
      }

      try {
        await closeDatabase();
      } catch (error) {
        console.error('Error closing database:', error);
      }

      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
