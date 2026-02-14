import { Grant } from '@grantjs/core';
import { DbSchema, signingKeyAuditLogs } from '@grantjs/database';

import { config } from '@/config';
import { SYSTEM_USER } from '@/constants/system.constants';
import { DrizzleAuditLogger } from '@/lib/audit';
import { JwtTokenProvider } from '@/lib/token';
import { createRepositories } from '@/repositories';
import { GrantRepository } from '@/repositories/grant.repository';
import { createServices } from '@/services';
import { GrantService } from '@/services/grant.service';
import { SigningKeyService } from '@/services/signing-keys.service';
import type { AppContext } from '@/types';

import { IEntityCacheAdapter } from './cache';

const tokenProvider = new JwtTokenProvider();

export function createAppContext(db: DbSchema, cache: IEntityCacheAdapter): AppContext {
  const repositories = createRepositories(db);
  const grantRepository = new GrantRepository(db);
  const signingKeyAudit = new DrizzleAuditLogger(
    signingKeyAuditLogs,
    'signingKeyId',
    SYSTEM_USER,
    db
  );
  const globalSigningKeyService = new SigningKeyService(
    repositories.signingKeyRepository,
    signingKeyAudit
  );
  const grantService = new GrantService(cache, grantRepository, globalSigningKeyService, {
    cacheTtlSeconds: config.jwt.systemSigningKeyCacheTtlSeconds,
  });
  const grant = new Grant(grantService, tokenProvider);
  const services = createServices(repositories, SYSTEM_USER, db, cache, grant);
  return {
    services,
    db,
    grant,
  };
}
