import { Scope, SigningKey, Tenant } from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import type { Transaction } from '@/lib/transaction-manager.lib';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

import type { ISigningKeyService, ITransactionalConnection } from '@grantjs/core';

const ALLOWED_TENANTS: readonly string[] = [Tenant.AccountProject, Tenant.OrganizationProject];

function assertProjectScope(scope: Scope): void {
  if (!ALLOWED_TENANTS.includes(scope.tenant)) {
    throw new BadRequestError(
      `Signing keys are only available for project scopes (accountProject, organizationProject), got: ${scope.tenant}`
    );
  }
}

export class SigningKeysHandler extends CacheHandler {
  constructor(
    private readonly signingKeys: ISigningKeyService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  async getSigningKeys(scope: Scope, options?: { limit?: number }): Promise<SigningKey[]> {
    assertProjectScope(scope);
    const limit = options?.limit ?? 20;
    const cacheKey = `${scope.tenant}:${scope.id}:${limit}`;

    const cached = await this.cache.signingKeys.get<SigningKey[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.signingKeys.listByScope(scope, { limit });
    await this.cache.signingKeys.set(cacheKey, result);
    return result;
  }

  async rotateSigningKey(scope: Scope): Promise<SigningKey> {
    assertProjectScope(scope);
    const newKey = await this.db.withTransaction((tx) =>
      this.signingKeys.rotateForScope(scope, tx)
    );
    await this.invalidateSigningKeysCacheForScope(scope);
    return newKey;
  }
}
