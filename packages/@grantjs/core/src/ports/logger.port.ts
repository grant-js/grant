/**
 * Port for logging. Core defines the contract; implementations (e.g. pino-based)
 * live in infrastructure packages (@grantjs/logger).
 *
 * Adapters and domain code depend only on this interface — never on a
 * concrete logging library.
 */
export interface ILogger {
  debug(msg: string): void;
  debug(obj: Record<string, unknown>, msg?: string): void;
  info(msg: string): void;
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(msg: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(msg: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
  fatal(msg: string): void;
  fatal(obj: Record<string, unknown>, msg?: string): void;
  child(bindings: Record<string, unknown>): ILogger;
}

/**
 * Factory port for creating named loggers.
 * The application configures a concrete factory at startup
 * and passes it (or its `createLogger` method) to adapters.
 */
export interface ILoggerFactory {
  createLogger(name: string): ILogger;
}
