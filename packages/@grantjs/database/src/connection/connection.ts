import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';

import { schema } from '../schemas';

import type { ILogger } from '@grantjs/core';

export type DbSchema = PostgresJsDatabase<typeof schema>;

interface DatabaseConnection {
  db: DbSchema;
  client: Sql;
}

let connection: DatabaseConnection | null = null;
let moduleLogger: ILogger | undefined;

export interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeout?: number;
  connectTimeout?: number;
  /** Optional structured logger. When omitted, logging is silently skipped. */
  logger?: ILogger;
}

export function initializeDBConnection(config: DatabaseConfig): DbSchema {
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

export function getDatabase(): DbSchema {
  if (!connection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return connection.db;
}

export function isDatabaseInitialized(): boolean {
  return connection !== null;
}
