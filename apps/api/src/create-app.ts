/**
 * Builds the configured Express application.
 *
 * Extracted from `server.ts` so a second entrypoint can reuse app construction
 * without inheriting the long-running server's behavior. `server.ts` remains the
 * default and is unchanged in what it does: it calls this, then listens, schedules
 * jobs, and installs signal handlers.
 *
 * What deliberately stays *out* of here, because a frozen Lambda container makes
 * each one wrong:
 *
 *   - `httpServer.listen()` — the caller owns its transport.
 *   - `initializeJobs()` — registers in-process cron schedules. A cold start that
 *     registered them would create timers that die with the container, and the
 *     schedule would silently stop running.
 *   - `process.on('SIGTERM' | 'SIGINT')` — shutdown is returned as handles the
 *     caller composes, not as listeners this module installs.
 *   - Tracing startup. `@/lib/tracing` is a side-effect import that must run before
 *     `http`/`express` load, which makes it the *entrypoint's* first import, not a
 *     dependency of this module.
 *
 * `bootstrapDatabase()` runs here rather than in the entrypoint, because an app
 * without a migrated database is not serve-ready and a second entrypoint that
 * skipped it would diverge from the server in a way nothing observes. It is gated on
 * `DB_BOOTSTRAP_ON_BOOT`, which defaults to true.
 */

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express5';
import {
  bootstrapDatabase,
  closeDatabase,
  initializeDBConnection,
  type PooledDatabase,
} from '@grantjs/database';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import swaggerUi from 'swagger-ui-express';

import { config, printConfigSummary, validateConfig } from '@/config';
import { schema } from '@/graphql/resolvers';
import { GraphqlContext } from '@/graphql/types';
import { i18nMiddleware, initializeI18n } from '@/i18n';
import { graphqlMinAalAtLoginMiddleware } from '@/lib/authorization/min-aal-at-login';
import { CacheFactory, type IEntityCacheAdapter } from '@/lib/cache';
import { formatGraphQLError } from '@/lib/errors';
import { logger, loggerFactory } from '@/lib/logger';
import { metricsHandler, metricsMiddleware } from '@/lib/metrics';
import { resolveDatabaseConnectionString, secretResolver } from '@/lib/secrets';
import { contextMiddleware } from '@/middleware/context.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { originVerifyMiddleware } from '@/middleware/origin-verify.middleware';
import { rateLimitMiddleware } from '@/middleware/rate-limit.middleware';
import { requestLoggingMiddleware } from '@/middleware/request-logging.middleware';
import { storageMiddleware } from '@/middleware/storage.middleware';
import { createRestRouter } from '@/rest';
import { getOpenApiDocument } from '@/rest/openapi';
import { createJwksRouter } from '@/rest/routes/jwks.routes';
import { ContextRequest } from '@/types';

/**
 * Teardown for the resources `createApp` opened. Exposed as separate calls rather
 * than one `shutdown()` so callers keep control of ordering — `server.ts`
 * interleaves these with closing its HTTP server and stopping its job schedules.
 */
interface AppShutdownHandles {
  stopApollo(): Promise<void>;
  disconnectCache(): Promise<void>;
  closeDatabase(): Promise<void>;
}

export interface CreatedApp {
  app: express.Express;
  /**
   * Created here because Apollo's drain plugin needs the server instance at
   * construction time. A caller with no listening transport can ignore it.
   */
  httpServer: http.Server;
  db: PooledDatabase;
  cache: IEntityCacheAdapter;
  shutdown: AppShutdownHandles;
}

export async function createApp(): Promise<CreatedApp> {
  validateConfig();
  await printConfigSummary();

  await initializeI18n();
  logger.info({
    msg: 'i18n initialized',
    locales: config.i18n.supportedLocales,
  });

  const db = initializeDBConnection({
    connectionString: await resolveDatabaseConnectionString(),
    max: config.db.poolMax,
    idleTimeout: config.db.idleTimeout,
    connectTimeout: config.db.connectionTimeout,
    logger: loggerFactory.createLogger('DatabaseConnection'),
  });

  // Default true, preserving the long-running server's historical behavior: this is
  // the sole migrate/seed path for Kubernetes, and the advisory lock inside makes it
  // safe across replicas. Serverless targets set DB_BOOTSTRAP_ON_BOOT=false and run
  // `node dist/migrate.js` as a separate step — see
  // decisions/0001-configuration-gated-database-bootstrap.md.
  if (config.db.bootstrapOnBoot) {
    await bootstrapDatabase(db, config.system.systemUserId);
  } else {
    logger.info({
      msg: 'Skipping database bootstrap at boot (DB_BOOTSTRAP_ON_BOOT=false)',
    });
  }

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
              db: config.redis.database,
            }
          : undefined,
      dynamodb: config.cache.strategy === 'dynamodb' ? config.cache.dynamodb : undefined,
    },
    loggerFactory
  );

  // First, ahead of every other middleware. A request that did not come through the
  // CDN should be refused before it can consume a database connection, a cache slot or
  // a rate-limit bucket. No-op unless a secret is configured, which is every target
  // except AWS.
  app.use(originVerifyMiddleware(secretResolver));

  app.use(cors<cors.CorsRequest>(config.cors));
  app.use(helmet(config.helmet));
  app.use(express.json({ limit: config.app.jsonBodyLimitBytes }));
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

  // Both routes resolve the document on first request rather than at boot. See
  // getOpenApiDocument: generating it walks 87 endpoints and measured 260 ms in the
  // shipped container, which a Lambda cold start pays for a document most requests
  // never read.
  if (config.swagger.enabled) {
    // The UI middleware is built on first use and then reused, so the document is
    // generated once and the HTML template once — not per request.
    let swaggerUiHandler: express.RequestHandler | undefined;
    const lazySwaggerUi: express.RequestHandler = (req, res, next) => {
      swaggerUiHandler ??= swaggerUi.setup(getOpenApiDocument(), config.swaggerSetup);
      swaggerUiHandler(req, res, next);
    };
    app.use('/api-docs', swaggerUi.serve, lazySwaggerUi);
  }

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(getOpenApiDocument());
  });

  app.use('/api', (req, res, next) => {
    const contextReq = req as ContextRequest;
    const restRouter = createRestRouter(contextReq.context);
    restRouter(req, res, next);
  });

  app.use(
    '/graphql',
    graphqlMinAalAtLoginMiddleware,
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

  return {
    app,
    httpServer,
    db,
    cache,
    shutdown: {
      stopApollo: () => apolloServer.stop(),
      disconnectCache: () => CacheFactory.disconnect(cache),
      closeDatabase: () => closeDatabase(),
    },
  };
}
