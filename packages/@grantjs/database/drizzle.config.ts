import { getEnv, resolveDatabaseUrl } from '@grantjs/env';

import type { Config } from 'drizzle-kit';

export default {
  // Table definitions only. drizzle-kit `require()`s every file this matches, and a vitest
  // file cannot be required (`credentials.schema.test.ts` made `db:generate` fail), so test
  // files next to the schemas are left out of the glob. drizzle-kit has no negated globs;
  // the extglob does it.
  schema: './src/schemas/**/!(*.test|*.spec).ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveDatabaseUrl(getEnv()),
  },
  entities: {
    roles: true,
  },
  verbose: true,
  strict: true,
} satisfies Config;
