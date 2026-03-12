import '@/lib/tracing'; // must run first so OTel patches http/express before they load
import http from 'http';

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express5';
import { closeDatabase, initializeDBConnection } from '@grantjs/database';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { config, printConfigSummary, validateConfig } from '@/config';
import { schema } from '@/graphql/resolvers';
import { GraphqlContext } from '@/graphql/types';
import { i18nMiddleware, initializeI18n } from '@/i18n';
import { createAppContext } from '@/lib/app-context.lib';
import { CacheFactory } from '@/lib/cache';
import { formatGraphQLError } from '@/lib/errors';
import { initializeJobs, shutdownJobs } from '@/lib/jobs/initialize';
import { logger, loggerFactory } from '@/lib/logger';
import { metricsHandler, metricsMiddleware } from '@/lib/metrics';
import { shutdownTracing } from '@/lib/tracing';
import { contextMiddleware } from '@/middleware/context.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { rateLimitMiddleware } from '@/middleware/rate-limit.middleware';
import { requestLoggingMiddleware } from '@/middleware/request-logging.middleware';
import { storageMiddleware } from '@/middleware/storage.middleware';
import { createRestRouter } from '@/rest';
import { generateOpenApiDocument } from '@/rest/openapi';
import { createJwksRouter } from '@/rest/routes/jwks.routes';
import { ContextRequest } from '@/types';

async function startServer() {
  validateConfig();
  await printConfigSummary();

  await initializeI18n();
  logger.info({
    msg: 'i18n initialized',
    locales: config.i18n.supportedLocales,
  });

  const db = initializeDBConnection({
    connectionString: config.db.url,
    max: config.db.poolMax,
    idleTimeout: config.db.idleTimeout,
    connectTimeout: config.db.connectionTimeout,
    logger: loggerFactory.createLogger('DatabaseConnection'),
  });

  const app = express();
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer<GraphqlContext>({
    schema,
    introspection: config.apollo.introspection,
    formatError: formatGraphQLError,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ...(config.apollo.playground
        ? [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
        : []),
      ApolloServerPluginInlineTrace(),
    ],
  });

  await apolloServer.start();

  const cache = CacheFactory.createEntityCache(
    {
      strategy: config.cache.strategy,
      redis:
        config.cache.strategy === 'redis'
          ? {
              host: config.redis.host,
              port: config.redis.port,
              password: config.redis.password,
            }
          : undefined,
    },
    loggerFactory
  );

  app.use(cors<cors.CorsRequest>(config.cors));
  app.use(helmet(config.helmet));
  app.use(express.json({ limit: '10mb' }));
  app.use(i18nMiddleware);
  if (config.storage.provider === 'local') {
    app.use('/storage', storageMiddleware());
  }

  app.use(requestLoggingMiddleware);
  app.use(contextMiddleware(db, cache));
  app.use(rateLimitMiddleware(cache.rateLimit));
  if (config.metrics.enabled) {
    app.use(metricsMiddleware);
  }

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
      context: async ({ req, res }: { req: express.Request; res: express.Response }) => {
        const contextReq = req as ContextRequest;
        return { ...contextReq.context, req, res };
      },
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  if (config.metrics.enabled) {
    app.get(config.metrics.endpoint, metricsHandler);
  }

  app.use(createJwksRouter());

  app.use(errorHandler);

  await new Promise<void>((resolve) => httpServer.listen({ port: config.app.port }, resolve));

  try {
    await initializeJobs(createAppContext(db, cache));
  } catch (error) {
    logger.warn({
      msg: 'Failed to initialize job scheduling, continuing without jobs',
      err: error,
    });
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
      logger.info({ msg: 'Shutting down...' });
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
      logger.info({ msg: 'HTTP server closed' });

      try {
        await shutdownTracing();
      } catch (error) {
        logger.error({
          msg: 'Error shutting down tracing',
          err: error,
        });
      }

      try {
        await shutdownJobs();
        logger.info({ msg: 'Job scheduling shut down' });
      } catch (error) {
        logger.error({
          msg: 'Error shutting down job scheduling',
          err: error,
        });
      }

      try {
        await CacheFactory.disconnect(cache);
        logger.info({ msg: 'Cache disconnected' });
      } catch (error) {
        logger.error({
          msg: 'Error disconnecting cache',
          err: error,
        });
      }

      try {
        await closeDatabase();
        logger.info({ msg: 'Database closed' });
      } catch (error) {
        logger.error({
          msg: 'Error closing database',
          err: error,
        });
      }

      process.exit(0);
    });

    setTimeout(() => {
      logger.error({ msg: 'Forced shutdown after timeout' });
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
