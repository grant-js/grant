import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { schema, Schema } from '@/graphql/repositories/schema';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://identity_user:identity_password@localhost:5432/identity_central';

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export type DbSchema = ReturnType<typeof drizzle<Schema>>;

export const db = drizzle(client, {
  schema,
});

process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await client.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await client.end();
  process.exit(0);
});
