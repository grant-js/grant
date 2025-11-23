import {
  OrganizationUserModel,
  organizationRoles,
  organizationUsers,
  organizations,
  roles,
  userRoles,
} from '@logusgraphics/grant-database';
import {
  AddOrganizationUserInput,
  OrganizationUser,
  RemoveOrganizationUserInput,
} from '@logusgraphics/grant-schema';
import { and, eq, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import {
  BasePivotAddArgs,
  BasePivotQueryArgs,
  BasePivotRemoveArgs,
  PivotRepository,
} from '@/repositories/common';

export class OrganizationUserRepository extends PivotRepository<
  OrganizationUserModel,
  OrganizationUser
> {
  protected table = organizationUsers;
  protected parentIdField: keyof OrganizationUserModel = 'organizationId';
  protected relatedIdField: keyof OrganizationUserModel = 'userId';

  protected toEntity(dbOrganizationUser: OrganizationUserModel): OrganizationUser {
    return {
      id: dbOrganizationUser.id,
      organizationId: dbOrganizationUser.organizationId,
      userId: dbOrganizationUser.userId,
      createdAt: dbOrganizationUser.createdAt,
      updatedAt: dbOrganizationUser.updatedAt,
      deletedAt: dbOrganizationUser.deletedAt,
    };
  }

  public async getOrganizationUsers(
    params: {
      organizationId?: string;
      userId?: string;
    },
    transaction?: Transaction
  ): Promise<OrganizationUser[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.organizationId,
      relatedId: params.userId,
    };

    return this.query(baseParams, transaction);
  }

  public async addOrganizationUser(
    params: AddOrganizationUserInput,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    const baseParams: BasePivotAddArgs = {
      parentId: params.organizationId,
      relatedId: params.userId,
    };

    const organizationUser = await this.add(baseParams, transaction);

    return organizationUser;
  }

  public async softDeleteOrganizationUser(
    params: RemoveOrganizationUserInput,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.organizationId,
      relatedId: params.userId,
    };

    const organizationUser = await this.softDelete(baseParams, transaction);

    return organizationUser;
  }

  public async hardDeleteOrganizationUser(
    params: RemoveOrganizationUserInput,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.organizationId,
      relatedId: params.userId,
    };

    const organizationUser = await this.hardDelete(baseParams, transaction);

    return organizationUser;
  }

  /**
   * Get user's organization memberships with roles
   * Returns organizations the user belongs to along with their role in each organization
   */
  public async getUserOrganizationMemberships(
    userId: string,
    transaction?: Transaction
  ): Promise<
    Array<{
      organizationId: string;
      organizationName: string;
      role: string;
      joinedAt: Date;
    }>
  > {
    const dbInstance = transaction || this.db;

    // Get organization details and user's role in each organization
    const membershipsData = await dbInstance
      .select({
        organizationId: organizations.id,
        organizationName: organizations.name,
        roleName: roles.name,
        joinedAt: organizationUsers.createdAt,
      })
      .from(organizationUsers)
      .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
      .leftJoin(userRoles, and(eq(userRoles.userId, userId), isNull(userRoles.deletedAt)))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(
        organizationRoles,
        and(
          eq(organizationRoles.organizationId, organizationUsers.organizationId),
          eq(organizationRoles.roleId, roles.id),
          isNull(organizationRoles.deletedAt)
        )
      )
      .where(
        and(
          eq(organizationUsers.userId, userId),
          isNull(organizationUsers.deletedAt),
          isNull(organizations.deletedAt)
        )
      );

    // Filter to only include memberships where user has a role in the organization
    // and group by organization (taking first role if multiple)
    const membershipMap = new Map<
      string,
      { organizationId: string; organizationName: string; role: string; joinedAt: Date }
    >();

    for (const membership of membershipsData) {
      const roleName = membership.roleName;
      if (roleName && !membershipMap.has(membership.organizationId)) {
        membershipMap.set(membership.organizationId, {
          organizationId: membership.organizationId,
          organizationName: membership.organizationName,
          role: roleName,
          joinedAt: membership.joinedAt,
        });
      }
    }

    return Array.from(membershipMap.values());
  }
}
