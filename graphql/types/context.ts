import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { AuthenticatedUser } from '@/graphql/types';

export interface GraphQLContext {
  user: AuthenticatedUser | null;
  services: any; // Will be properly typed when services are created
  db: PostgresJsDatabase; // Single connection per request for reuse
}
