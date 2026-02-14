import {
  PinoLoggerFactory,
  configureLogger,
  createContextLogger,
  createLogger,
  getLogger,
  getRawPinoLogger,
} from '@grantjs/logger';

import { config } from '@/config';

import type { ILogger } from '@grantjs/core';

// Configure the shared logger with API-specific settings at import time
configureLogger({
  level: config.logging.level,
  prettyPrint: config.app.isDevelopment && config.logging.prettyPrint,
  base: {
    env: config.app.nodeEnv,
    service: 'grant-api',
    version: config.app.version,
  },
  redactPaths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-api-key"]',
    '*.password',
    '*.token',
    '*.accessToken',
    '*.refreshToken',
    '*.secret',
    '*.apiKey',
    '*.creditCard',
    '*.ssn',
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
  ],
});

/** Root logger instance for the API */
export const logger = getLogger();

/**
 * Raw pino logger for API middleware that requires the concrete type
 * (e.g. pino-http, request logging middleware).
 */
export const rawPinoLogger = getRawPinoLogger();

/** Shared logger factory instance for injecting into adapter packages */
export const loggerFactory = new PinoLoggerFactory();

// Re-export shared utilities
export { createContextLogger, createLogger };
export type { ILogger as Logger };
