import pino from 'pino';

import type { ILogger, ILoggerFactory } from '@grantjs/core';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface LoggerConfig {
  level?: string;
  prettyPrint?: boolean;
  base?: Record<string, unknown>;
  redactPaths?: string[];
}

let rootPino: pino.Logger = pino({ level: 'info' });

/**
 * Configure the shared root logger instance.
 * Must be called once at application startup before any `createLogger()` calls.
 */
export function configureLogger(config: LoggerConfig): void {
  rootPino = pino({
    level: config.level ?? 'info',
    transport: config.prettyPrint
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

    base: config.base ?? {},

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

    redact: config.redactPaths ? { paths: config.redactPaths, remove: true } : undefined,

    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

// ---------------------------------------------------------------------------
// PinoLoggerAdapter — implements ILogger by wrapping a pino.Logger
// ---------------------------------------------------------------------------

export class PinoLoggerAdapter implements ILogger {
  constructor(private readonly pino: pino.Logger) {}

  debug(msgOrObj: string | Record<string, unknown>, msg?: string): void {
    if (typeof msgOrObj === 'string') {
      this.pino.debug(msgOrObj);
    } else if (msg !== undefined) {
      this.pino.debug(msgOrObj, msg);
    } else {
      this.pino.debug(msgOrObj);
    }
  }

  info(msgOrObj: string | Record<string, unknown>, msg?: string): void {
    if (typeof msgOrObj === 'string') {
      this.pino.info(msgOrObj);
    } else if (msg !== undefined) {
      this.pino.info(msgOrObj, msg);
    } else {
      this.pino.info(msgOrObj);
    }
  }

  warn(msgOrObj: string | Record<string, unknown>, msg?: string): void {
    if (typeof msgOrObj === 'string') {
      this.pino.warn(msgOrObj);
    } else if (msg !== undefined) {
      this.pino.warn(msgOrObj, msg);
    } else {
      this.pino.warn(msgOrObj);
    }
  }

  error(msgOrObj: string | Record<string, unknown>, msg?: string): void {
    if (typeof msgOrObj === 'string') {
      this.pino.error(msgOrObj);
    } else if (msg !== undefined) {
      this.pino.error(msgOrObj, msg);
    } else {
      this.pino.error(msgOrObj);
    }
  }

  fatal(msgOrObj: string | Record<string, unknown>, msg?: string): void {
    if (typeof msgOrObj === 'string') {
      this.pino.fatal(msgOrObj);
    } else if (msg !== undefined) {
      this.pino.fatal(msgOrObj, msg);
    } else {
      this.pino.fatal(msgOrObj);
    }
  }

  child(bindings: Record<string, unknown>): ILogger {
    return new PinoLoggerAdapter(this.pino.child(bindings));
  }
}

// ---------------------------------------------------------------------------
// PinoLoggerFactory — implements ILoggerFactory
// ---------------------------------------------------------------------------

export class PinoLoggerFactory implements ILoggerFactory {
  createLogger(name: string): ILogger {
    return new PinoLoggerAdapter(rootPino.child({ module: name }));
  }
}

// ---------------------------------------------------------------------------
// Convenience functions (module-level singleton pattern)
// ---------------------------------------------------------------------------

/**
 * Get the root logger as an ILogger.
 */
export function getLogger(): ILogger {
  return new PinoLoggerAdapter(rootPino);
}

/**
 * Get the raw pino logger instance (for API-level use, e.g. pino-http).
 * Adapter packages should NOT use this — use `getLogger()` or `createLogger()` instead.
 */
export function getRawPinoLogger(): pino.Logger {
  return rootPino;
}

/**
 * Create a child logger scoped to a module name.
 */
export function createLogger(name: string): ILogger {
  return new PinoLoggerAdapter(rootPino.child({ module: name }));
}

/**
 * Create a child logger with arbitrary context.
 */
export function createContextLogger(context: Record<string, unknown>): ILogger {
  return new PinoLoggerAdapter(rootPino.child(context));
}
