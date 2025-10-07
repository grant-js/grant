import * as dotenv from 'dotenv';
import type { Config } from 'drizzle-kit';

dotenv.config();

export default {
  schema: './graphql/repositories/**/schema.ts',
  out: './graphql/generated/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: `${process.env.DATABASE_URL}`,
  },
  verbose: true,
  strict: true,
} satisfies Config;
