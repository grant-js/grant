import type { IOrganizationMemberService, ITransactionalConnection } from '@grantjs/core';
import {
  MutationRemoveOrganizationMemberArgs,
  MutationUpdateOrganizationMemberArgs,
  OrganizationMember,
  OrganizationMemberPage,
  OrganizationOwnershipTransfer,
  QueryOrganizationMembersArgs,
  TransferOrganizationOwnershipInput,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import type { Transaction } from '@/lib/transaction-manager.lib';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

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

    await this.invalidateAuthorizationResultsForUser(userId);

    return result;
  }

  public async removeOrganizationMember(
    params: MutationRemoveOrganizationMemberArgs
  ): Promise<OrganizationMember> {
    const { userId, input } = params;

    const result = await this.db.withTransaction(async (tx) => {
      return await this.organizationMembers.removeOrganizationMember(userId, input, tx);
    });

    await this.invalidateAuthorizationResultsForUser(userId);

    return result;
  }

  /**
   * Transfers organization ownership in one transaction, then drops the cached authorization
   * results of both users: their roles changed, and a user who left loses the organization.
   */
  public async transferOwnership(
    input: TransferOrganizationOwnershipInput,
    previousOwnerId: string
  ): Promise<OrganizationOwnershipTransfer> {
    const result = await this.db.withTransaction(async (tx) => {
      return await this.organizationMembers.transferOwnership(input, tx);
    });

    await this.invalidateAuthorizationResultsForUser(previousOwnerId);
    await this.invalidateAuthorizationResultsForUser(input.newOwnerId);

    return result;
  }
}
