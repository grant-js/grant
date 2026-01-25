import { Grant, GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
import { Tenant, TokenType } from '@grantjs/schema';

import { config } from '@/config';
import { createRepositories } from '@/repositories';
import { GrantRepository } from '@/repositories/grant.repository';
import { Services, createServices } from '@/services';
import { GrantService } from '@/services/grant.service';

import { IEntityCacheAdapter } from './cache';

export interface AppContext {
  services: Services;
  db: DbSchema;
}

const SYSTEM_USER: GrantAuth = {
  userId: config.system.systemUserId,
  expiresAt: Infinity,
  type: TokenType.System,
  tokenId: 'system-token', // TODO: Generate a random token ID for the system user
  scope: {
    tenant: Tenant.System,
    id: config.system.systemUserId,
  },
};

export function createAppContext(db: DbSchema, cache: IEntityCacheAdapter): AppContext {
  const repositories = createRepositories(db);
  const grantRepository = new GrantRepository(db);
  const grantService = new GrantService(grantRepository);
  const grant = new Grant({ jwtSecret: config.jwt.secret, grantService });
  const services = createServices(repositories, SYSTEM_USER, db, cache, grant);
  return {
    services,
    db,
  };
}
