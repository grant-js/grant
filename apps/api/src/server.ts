import '@/lib/tracing'; // must run first so OTel patches http/express before they load

import { config } from '@/config';
import { createApp } from '@/create-app';
import { createAppContext } from '@/lib/app-context.lib';
import { closeHttpServer } from '@/lib/http-server.lib';
import { initializeJobs, shutdownJobs } from '@/lib/jobs/initialize';
import { logger } from '@/lib/logger';
import { shutdownTracing } from '@/lib/tracing';

async function startServer() {
  const { httpServer, db, cache, shutdown } = await createApp();

  await new Promise<void>((resolve) => httpServer.listen({ port: config.app.port }, resolve));

  try {
    await initializeJobs(createAppContext(db, cache));
  } catch (error) {
    logger.warn({
      msg: 'Failed to initialize job scheduling, continuing without jobs',
      err: error,
    });
  }

  // Derived from config so non-local deployments log reachable URLs, not localhost.
  const baseUrl = config.app.url.replace(/\/$/, '');

  logger.info({
    msg: 'Server started successfully',
    port: config.app.port,
    graphql: `${baseUrl}/graphql`,
    restApi: `${baseUrl}/api`,
    health: `${baseUrl}/health`,
    swagger: config.swagger.enabled ? `${baseUrl}/api-docs` : undefined,
  });

  const isDevelopment = config.app.isDevelopment;

  const gracefulShutdown = async (signal: string) => {
    const forceShutdown = setTimeout(() => {
      logger.error({ msg: 'Forced shutdown after timeout' });
      process.exit(1);
    }, config.app.gracefulShutdownTimeoutMs);

    const finish = () => {
      clearTimeout(forceShutdown);
    };

    try {
      if (isDevelopment) {
        logger.info({ msg: 'Shutting down...' });
        await shutdown.stopApollo().catch((err: unknown) => {
          logger.warn({ msg: 'Apollo stop during dev shutdown', err });
        });
        await closeHttpServer(httpServer);
        finish();
        process.exit(0);
        return;
      }

      logger.info({
        msg: 'Starting graceful shutdown',
        signal,
      });

      await shutdown.stopApollo().catch((error: unknown) => {
        logger.error({
          msg: 'Error stopping Apollo Server',
          err: error,
        });
      });

      await closeHttpServer(httpServer);

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
        await shutdown.disconnectCache();
        logger.info({ msg: 'Cache disconnected' });
      } catch (error) {
        logger.error({
          msg: 'Error disconnecting cache',
          err: error,
        });
      }

      try {
        await shutdown.closeDatabase();
        logger.info({ msg: 'Database closed' });
      } catch (error) {
        logger.error({
          msg: 'Error closing database',
          err: error,
        });
      }

      finish();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Graceful shutdown failed');
      finish();
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
}

startServer().catch((error) => {
  logger.fatal({
    msg: 'Failed to start server',
    err: error,
  });
  process.exit(1);
});
