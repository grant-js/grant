import type { IProjectOAuthConnectionService, ITransactionalConnection } from '@grantjs/core';
import {
  type ClearProjectOAuthConnectionInput,
  type ProjectOAuthConnection,
  type Scope,
  Tenant,
  type UpsertProjectOAuthConnectionInput,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import { tryProjectIdFromScope } from '@/lib/scope.lib';
import type { Transaction } from '@/lib/transaction-manager.lib';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

const ALLOWED_TENANTS: readonly string[] = [Tenant.AccountProject, Tenant.OrganizationProject];

export class ProjectOAuthConnectionsHandler extends CacheHandler {
  constructor(
    private readonly connections: IProjectOAuthConnectionService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  private resolveProjectId(scope: Scope): string {
    if (!ALLOWED_TENANTS.includes(scope.tenant)) {
      throw new BadRequestError(
        'project OAuth connections require scope tenant accountProject or organizationProject'
      );
    }
    const projectId = tryProjectIdFromScope(scope);
    if (!projectId) {
      throw new BadRequestError('Could not resolve project from scope');
    }
    return projectId;
  }

  async getProjectOAuthConnections(scope: Scope): Promise<ProjectOAuthConnection[]> {
    const projectId = this.resolveProjectId(scope);
    return this.connections.listByProject(projectId);
  }

  async upsertProjectOAuthConnection(
    input: UpsertProjectOAuthConnectionInput
  ): Promise<ProjectOAuthConnection> {
    const projectId = this.resolveProjectId(input.scope);
    return this.db.withTransaction((tx) =>
      this.connections.upsert(
        {
          projectId,
          provider: input.provider,
          clientId: input.clientId,
          clientSecret: input.clientSecret,
        },
        tx
      )
    );
  }

  async clearProjectOAuthConnection(input: ClearProjectOAuthConnectionInput): Promise<boolean> {
    const projectId = this.resolveProjectId(input.scope);
    return this.db.withTransaction((tx) =>
      this.connections.clear({ projectId, provider: input.provider }, tx)
    );
  }
}
