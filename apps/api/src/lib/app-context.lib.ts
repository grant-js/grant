import { Grant, type ISyncRuntime } from '@grantjs/core';
import { PooledDatabase, signingKeyAuditLogs } from '@grantjs/database';
import { AwsSyncRuntime } from '@grantjs/jobs';

import { config } from '@/config';
import { SYSTEM_USER } from '@/constants/system.constants';
import { DrizzleAuditLogger } from '@/lib/audit';
import { DrizzleEventPublisher } from '@/lib/events';
import { loggerFactory } from '@/lib/logger';
import { JwtTokenProvider } from '@/lib/token';
import { createRepositories } from '@/repositories';
import { GrantRepository } from '@/repositories/grant.repository';
import { createServices } from '@/services';
import { GrantService } from '@/services/grant.service';
import { SigningKeyService } from '@/services/signing-keys.service';
import type { AppContext } from '@/types';

import { IEntityCacheAdapter } from './cache';

const tokenProvider = new JwtTokenProvider();

export function createAppContext(db: PooledDatabase, cache: IEntityCacheAdapter): AppContext {
  const repositories = createRepositories(db);
  const grantRepository = new GrantRepository(db);
  const signingKeyAudit = new DrizzleAuditLogger(
    signingKeyAuditLogs,
    'signingKeyId',
    SYSTEM_USER,
    db
  );
  const bootstrapEvents = new DrizzleEventPublisher(SYSTEM_USER, db);
  const globalSigningKeyService = new SigningKeyService(
    repositories.signingKeyRepository,
    signingKeyAudit,
    bootstrapEvents
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
    syncRuntime: createSyncRuntime(),
  };
}

/**
 * The runtime `project-sync` is handed to when it is not run here (ADR 0002).
 *
 * `undefined` unless configured, which is the default and every existing deployment.
 * Constructed in the composition root like every other adapter — the job receives the
 * port and never learns it is ECS.
 */
function createSyncRuntime(): ISyncRuntime | undefined {
  if (config.jobs.sync.runtime !== 'container') {
    return undefined;
  }

  return new AwsSyncRuntime(
    {
      region: config.jobs.aws.region,
      clusterArn: config.jobs.sync.task.clusterArn,
      taskDefinitionArn: config.jobs.sync.task.definitionArn,
      containerName: config.jobs.sync.task.containerName,
      subnetIds: config.jobs.sync.task.subnetIds,
      securityGroupIds: config.jobs.sync.task.securityGroupIds,
      endpoint: config.jobs.aws.endpoint,
    },
    loggerFactory.createLogger('AwsSyncRuntime')
  );
}
