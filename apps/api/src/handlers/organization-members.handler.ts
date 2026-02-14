import {
  MutationRemoveOrganizationMemberArgs,
  MutationUpdateOrganizationMemberArgs,
  OrganizationMember,
  OrganizationMemberPage,
  QueryOrganizationMembersArgs,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import type { Transaction } from '@/lib/transaction-manager.lib';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

import type { IOrganizationMemberService, ITransactionalConnection } from '@grantjs/core';

export class OrganizationMembersHandler extends CacheHandler {
  constructor(
    private readonly organizationMembers: IOrganizationMemberService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async getOrganizationMembers(
    params: QueryOrganizationMembersArgs
  ): Promise<OrganizationMemberPage> {
    return await this.organizationMembers.getOrganizationMembers(params);
  }

  public async updateOrganizationMember(
    params: MutationUpdateOrganizationMemberArgs
  ): Promise<OrganizationMember> {
    const { userId, input } = params;

    const result = await this.db.withTransaction(async (tx) => {
      return await this.organizationMembers.updateOrganizationMember(userId, input, tx);
    });

    await this.invalidateAuthorizationCacheForUser(userId);

    return result;
  }

  public async removeOrganizationMember(
    params: MutationRemoveOrganizationMemberArgs
  ): Promise<OrganizationMember> {
    const { userId, input } = params;

    const result = await this.db.withTransaction(async (tx) => {
      return await this.organizationMembers.removeOrganizationMember(userId, input, tx);
    });

    await this.invalidateAuthorizationCacheForUser(userId);

    return result;
  }
}
