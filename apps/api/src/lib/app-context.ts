import { DbSchema } from '@logusgraphics/grant-database';

import { config } from '@/config';
import { createRepositories } from '@/repositories';
import { Services, createServices } from '@/services';
import { AuthenticatedUser } from '@/types';

export interface AppContext {
  services: Services;
  db: DbSchema;
}

const SYSTEM_USER: AuthenticatedUser = {
  id: config.system.systemUserId,
  aud: 'system', // System audience for internal operations
};

export function createAppContext(db: DbSchema): AppContext {
  const repositories = createRepositories(db);
  const services = createServices(repositories, SYSTEM_USER, db);
  return {
    services,
    db,
  };
}
