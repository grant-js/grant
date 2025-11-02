import { DbSchema } from '@logusgraphics/grant-database';
import {
  MutationRemoveOrganizationMemberArgs,
  MutationUpdateOrganizationMemberArgs,
  OrganizationMember,
  OrganizationMemberPage,
  QueryOrganizationMembersArgs,
} from '@logusgraphics/grant-schema';

import { createModuleLogger } from '@/lib/logger';
import { TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';

export class OrganizationMembersHandler {
  private readonly logger = createModuleLogger('OrganizationMembersHandler');

  constructor(
    readonly services: Services,
    readonly db: DbSchema
  ) {}

  /**
   * Get organization members (unified users and invitations)
   */
  public async getOrganizationMembers(
    params: QueryOrganizationMembersArgs
  ): Promise<OrganizationMemberPage> {
    return await this.services.organizationMembers.getOrganizationMembers(params);
  }

  /**
   * Update an organization member's role
   */
  public async updateOrganizationMember(
    params: MutationUpdateOrganizationMemberArgs
  ): Promise<OrganizationMember> {
    return await TransactionManager.withTransaction(this.db, async (tx) => {
      const { userId, organizationId, input } = params;
      return await this.services.organizationMembers.updateOrganizationMember(
        userId,
        organizationId,
        input,
        tx
      );
    });
  }

  /**
   * Remove an organization member
   */
  public async removeOrganizationMember(
    params: MutationRemoveOrganizationMemberArgs
  ): Promise<OrganizationMember> {
    return await TransactionManager.withTransaction(this.db, async (tx) => {
      const { input } = params;
      return await this.services.organizationMembers.removeOrganizationMember(input, tx);
    });
  }
}
