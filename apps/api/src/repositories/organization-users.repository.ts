import {
  OrganizationUserModel,
  organizationRoles,
  organizationUsers,
  organizations,
  roles,
  userRoles,
} from '@grantjs/database';
import {
  AddOrganizationUserInput,
  OrganizationUser,
  QueryOrganizationUsersInput,
  RemoveOrganizationUserInput,
} from '@grantjs/schema';
import { and, eq, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class OrganizationUserRepository extends PivotRepository<
  OrganizationUserModel,
  OrganizationUser
> {
  protected table = organizationUsers;
  protected uniqueIndexFields: Array<keyof OrganizationUserModel> = ['organizationId', 'userId'];

  protected toEntity(dbOrganizationUser: OrganizationUserModel): OrganizationUser {
    return dbOrganizationUser;
  }

  public async getOrganizationUsers(
    params: QueryOrganizationUsersInput,
    transaction?: Transaction
  ): Promise<OrganizationUser[]> {
    return this.query(params, transaction);
  }

  public async addOrganizationUser(
    params: AddOrganizationUserInput,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    return this.add(params, transaction);
  }

  public async softDeleteOrganizationUser(
    params: RemoveOrganizationUserInput,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteOrganizationUser(
    params: RemoveOrganizationUserInput,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    return this.hardDelete(params, transaction);
  }

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
    const db = transaction || this.db;

    const membershipsData = await db
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
