import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { schema } from '../schemas';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, {
  schema,
});

export type DbSchema = typeof db;

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
