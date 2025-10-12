import * as dotenv from 'dotenv';
import type { Config } from 'drizzle-kit';

dotenv.config();

export default {
  schema: './graphql/repositories/**/schema.ts',
  out: './graphql/generated/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Support both DATABASE_URL (legacy) and DB_URL (new standard)
    url: `${process.env.DB_URL || process.env.DATABASE_URL}`,
  },
  verbose: true,
  strict: true,
} satisfies Config;
