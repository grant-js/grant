/**
 * Port for logging. Core defines the contract; implementations (e.g. pino-based)
 * live in infrastructure packages (@grantjs/logger).
 *
 * Adapters and domain code depend only on this interface — never on a
 * concrete logging library.
 */
export interface ILogger {
  trace(msg: string): void;
  trace(obj: Record<string, unknown>, msg?: string): void;
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

const noop = () => {};

/**
 * Silent {@link ILogger} for adapters constructed without a logger factory.
 *
 * `AGENTS.md` § Logging already describes this fallback as the intended
 * pattern; exporting it here makes the described pattern the actual one.
 * Every adapter depends on core already, so this adds no edge to the DAG.
 *
 * Use as the right-hand side of the injection default:
 *
 * ```ts
 * loggerFactory?.createLogger('MyAdapter') ?? noopLogger
 * ```
 */
export const noopLogger: ILogger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => noopLogger,
};
