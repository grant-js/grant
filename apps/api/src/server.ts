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
import { createAppContext } from '@/lib/app-context';
import { CacheFactory } from '@/lib/cache/cache.factory';
import { formatGraphQLError } from '@/lib/errors';
import { initializeJobs, shutdownJobs } from '@/lib/jobs/initialize';
import { logger } from '@/lib/logger';
import { authMiddleware } from '@/middleware/auth.middleware';
import { contextMiddleware } from '@/middleware/context.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { requestLoggingMiddleware } from '@/middleware/request-logging.middleware';
import { storageMiddleware } from '@/middleware/storage.middleware';
import { createRestRouter } from '@/rest';
import { generateOpenApiDocument } from '@/rest/openapi';
import { ContextRequest } from '@/types';

async function startServer() {
  validateConfig();
  await printConfigSummary();

  await initializeI18n();
  logger.info({
    msg: 'i18n initialized',
    locales: config.i18n.supportedLocales,
  });

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
  app.use(express.json({ limit: '10mb' }));
  app.use(i18nMiddleware);

  if (config.storage.provider === 'local') {
    app.use('/storage', storageMiddleware());
  }

  app.use(authMiddleware);
  app.use(contextMiddleware(db, scopeCache));
  app.use(requestLoggingMiddleware);

  const openApiDocument = generateOpenApiDocument();

  if (config.swagger.enabled) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, config.swaggerSetup));
  }

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiDocument);
  });

  app.use('/api', (req, res, next) => {
    const contextReq = req as ContextRequest;
    const restRouter = createRestRouter(contextReq.context);
    restRouter(req, res, next);
  });

  app.use(
    '/graphql',
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

  app.use(errorHandler);

  await new Promise<void>((resolve) => httpServer.listen({ port: config.app.port }, resolve));

  try {
    await initializeJobs(createAppContext(db));
  } catch (error) {
    logger.warn({ err: error }, 'Failed to initialize job scheduling, continuing without jobs');
  }

  logger.info({
    msg: 'Server started successfully',
    port: config.app.port,
    graphql: `http://localhost:${config.app.port}/graphql`,
    restApi: `http://localhost:${config.app.port}/api`,
    health: `http://localhost:${config.app.port}/health`,
    swagger: config.swagger.enabled ? `http://localhost:${config.app.port}/api-docs` : undefined,
  });

  const isDevelopment = config.app.isDevelopment;

  const gracefulShutdown = async (signal: string) => {
    if (isDevelopment) {
      logger.info('Shutting down...');
      httpServer.close(() => {
        process.exit(0);
      });
      return;
    }

    logger.info({
      msg: 'Starting graceful shutdown',
      signal,
    });

    httpServer.close(async () => {
      logger.info('HTTP server closed');

      try {
        await shutdownJobs();
        logger.info('Job scheduling shut down');
      } catch (error) {
        logger.error({
          msg: 'Error shutting down job scheduling',
          err: error,
        });
      }

      try {
        await CacheFactory.disconnect(scopeCache);
        logger.info('Cache disconnected');
      } catch (error) {
        logger.error({
          msg: 'Error disconnecting cache',
          err: error,
        });
      }

      try {
        await closeDatabase();
        logger.info('Database closed');
      } catch (error) {
        logger.error({
          msg: 'Error closing database',
          err: error,
        });
      }

      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((error) => {
  logger.fatal({
    msg: 'Failed to start server',
    err: error,
  });
  process.exit(1);
});
