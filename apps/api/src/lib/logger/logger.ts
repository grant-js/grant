import { configureLogger, createLogger, getLogger, PinoLoggerFactory } from '@grantjs/logger';

import { config } from '@/config';

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

/** Shared logger factory instance for injecting into adapter packages */
export const loggerFactory = new PinoLoggerFactory();

// Re-export shared utilities (createModuleLogger is already exported above as const)
export { createLogger };
