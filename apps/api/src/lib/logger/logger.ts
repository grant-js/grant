import pino from 'pino';

import { config } from '@/config';

export const logger = pino({
  level: config.logging.level,
  transport:
    config.app.isDevelopment && config.logging.prettyPrint
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{msg}',
            errorLikeObjectKeys: ['err', 'error'],
          },
        }
      : undefined,

  base: {
    env: config.app.nodeEnv,
    service: 'grant-api',
    version: config.app.version,
  },

  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
    }),
  },

  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },

  redact: {
    paths: [
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
    remove: true,
  },

  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createContextLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}

export function createModuleLogger(moduleName: string): pino.Logger {
  return logger.child({ module: moduleName });
}

export type Logger = pino.Logger;
export type LoggerOptions = pino.LoggerOptions;
