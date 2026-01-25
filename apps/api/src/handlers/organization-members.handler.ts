import { DbSchema } from '@grantjs/database';
import {
  MutationRemoveOrganizationMemberArgs,
  MutationUpdateOrganizationMemberArgs,
  OrganizationMember,
  OrganizationMemberPage,
  QueryOrganizationMembersArgs,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';

import { CacheHandler } from './base/cache-handler';

export class OrganizationMembersHandler extends CacheHandler {
  constructor(
    readonly cache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(cache, services);
  }

  public async getOrganizationMembers(
    params: QueryOrganizationMembersArgs
  ): Promise<OrganizationMemberPage> {
    return await this.services.organizationMembers.getOrganizationMembers(params);
  }

  public async updateOrganizationMember(
    params: MutationUpdateOrganizationMemberArgs
  ): Promise<OrganizationMember> {
    const { userId, input } = params;

    const result = await TransactionManager.withTransaction(this.db, async (tx) => {
      return await this.services.organizationMembers.updateOrganizationMember(userId, input, tx);
    });

    await this.invalidateAuthorizationCacheForUser(userId);

    return result;
  }

  public async removeOrganizationMember(
    params: MutationRemoveOrganizationMemberArgs
  ): Promise<OrganizationMember> {
    const { userId, input } = params;

    const result = await TransactionManager.withTransaction(this.db, async (tx) => {
      return await this.services.organizationMembers.removeOrganizationMember(userId, input, tx);
    });

    await this.invalidateAuthorizationCacheForUser(userId);

    return result;
  }
}
