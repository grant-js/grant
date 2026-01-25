import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';

import { schema } from '../schemas';

export type DbSchema = PostgresJsDatabase<typeof schema>;

interface DatabaseConnection {
  db: DbSchema;
  client: Sql;
}

let connection: DatabaseConnection | null = null;

export interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeout?: number;
  connectTimeout?: number;
}

export function initializeDBConnection(config: DatabaseConfig): DbSchema {
  if (connection) {
    console.warn('Database connection already initialized. Returning existing connection.');
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

  console.log('✅ Database connection initialized');

  return db;
}

export async function closeDatabase(): Promise<void> {
  if (!connection) {
    console.warn('No database connection to close');
    return;
  }

  try {
    await connection.client.end();
    connection = null;
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
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
