import { ConfigurationError, type ILogger } from '@grantjs/core';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';

import { schema } from '../schemas';

export type DbSchema = PostgresJsDatabase<typeof schema>;

/**
 * The pooled database, with its postgres.js client attached.
 *
 * A transaction satisfies `DbSchema` but is never a `PooledDatabase` — it has no
 * `$client`. Anything that needs a dedicated backend session (advisory locks)
 * must ask for this type, or the requirement is unenforced and fails at runtime
 * with `Cannot read properties of undefined (reading 'reserve')`.
 */
export type PooledDatabase = DbSchema & { $client: Sql };

interface DatabaseConnection {
  db: PooledDatabase;
  client: Sql;
  connectionString: string;
}

let connection: DatabaseConnection | null = null;
let moduleLogger: ILogger | undefined;

export interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeout?: number;
  connectTimeout?: number;
  /** Max seconds a connection can live before being recycled (0 = unlimited). */
  maxLifetime?: number;
  /**
   * Password, when it is not already in `connectionString`.
   *
   * **A function is the point, not a convenience.** An RDS IAM auth token is valid for
   * about 15 minutes while a pooled connection's `max_lifetime` defaults to 30, and a
   * long-running process outlives both — so a password captured once is a process that
   * authenticates until its first token expires and then cannot open another connection.
   *
   * `postgres.js` resolves this per connection, not per pool: `Pass()` in
   * `postgres/src/connection.js` is called from the authentication handlers
   * (`AuthenticationCleartextPassword`, `AuthenticationMD5Password`, `SASL`), which run
   * during each backend's handshake. Verified against the vendored source at 3.4.9 rather
   * than inferred from the type, because the whole option depends on it.
   *
   * Note what this does *not* need to solve: a token only has to be valid when a
   * connection is established. Connections already authenticated survive its expiry, so
   * `maxLifetime` need not be shortened to match the token.
   *
   * Omit for password auth, which is every existing caller.
   */
  password?: string | (() => Promise<string>);

  /** Optional structured logger. When omitted, logging is silently skipped. */
  logger?: ILogger;
}

export function initializeDBConnection(config: DatabaseConfig): PooledDatabase {
  if (connection) {
    if (config.connectionString !== connection.connectionString) {
      throw new ConfigurationError(
        'Database connection already initialized with a different connection string. Call closeDatabase() first.'
      );
    }
    moduleLogger?.warn('Database connection already initialized. Returning existing connection.');
    return connection.db;
  }

  if (!config.connectionString) {
    throw new ConfigurationError('Database connection string is required');
  }

  moduleLogger = config.logger;

  const connectionString = config.connectionString;

  const client = postgres(connectionString, {
    max: config?.max ?? 10,
    idle_timeout: config?.idleTimeout ?? 20,
    connect_timeout: config?.connectTimeout ?? 10,
    max_lifetime: config?.maxLifetime ?? 60 * 30,
    // Spread rather than set unconditionally: `postgres.js` reads `pass || password ||
    // url.password || env.PGPASSWORD`, so passing `password: undefined` is harmless today
    // but writing the key at all makes this function part of that precedence chain. Every
    // existing caller keeps the password in `connectionString` and must stay unaffected.
    ...(config.password === undefined ? {} : { password: config.password }),
  });

  const db = drizzle(client, { schema });

  connection = { db, client, connectionString };

  moduleLogger?.info('Database connection initialized');

  return db;
}

export async function closeDatabase(): Promise<void> {
  if (!connection) {
    moduleLogger?.warn('No database connection to close');
    return;
  }

  const current = connection;
  connection = null;

  try {
    await current.client.end();
    moduleLogger?.info('Database connection closed');
  } catch (error) {
    moduleLogger?.error({ err: error }, 'Error closing database connection');
    throw error;
  }
}

export function getDatabase(): PooledDatabase {
  if (!connection) {
    throw new ConfigurationError('Database not initialized. Call initializeDBConnection() first.');
  }
  return connection.db;
}

export function isDatabaseInitialized(): boolean {
  return connection !== null;
}
