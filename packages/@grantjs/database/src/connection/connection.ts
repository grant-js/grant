import type { ILogger } from '@grantjs/core';
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
  /** Optional structured logger. When omitted, logging is silently skipped. */
  logger?: ILogger;
}

export function initializeDBConnection(config: DatabaseConfig): PooledDatabase {
  moduleLogger = config.logger;

  if (connection) {
    moduleLogger?.warn('Database connection already initialized. Returning existing connection.');
    return connection.db;
  }

  if (!config.connectionString) {
    throw new Error('Database connection string is required');
  }

  const connectionString = config.connectionString;

  const client = postgres(connectionString, {
    max: config?.max ?? 10,
    idle_timeout: config?.idleTimeout ?? 20,
    connect_timeout: config?.connectTimeout ?? 10,
    max_lifetime: config?.maxLifetime ?? 60 * 30,
  });

  const db = drizzle(client, { schema });

  connection = { db, client };

  moduleLogger?.info('Database connection initialized');

  return db;
}

export async function closeDatabase(): Promise<void> {
  if (!connection) {
    moduleLogger?.warn('No database connection to close');
    return;
  }

  try {
    await connection.client.end();
    connection = null;
    moduleLogger?.info('Database connection closed');
  } catch (error) {
    moduleLogger?.error({ err: error }, 'Error closing database connection');
    throw error;
  }
}

export function getDatabase(): PooledDatabase {
  if (!connection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return connection.db;
}

export function isDatabaseInitialized(): boolean {
  return connection !== null;
}
