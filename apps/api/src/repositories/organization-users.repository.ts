import type { IOrganizationUserRepository } from '@grantjs/core';
import { organizations, OrganizationUserModel, organizationUsers, roles } from '@grantjs/database';
import {
  AddOrganizationUserInput,
  OrganizationUser,
  QueryOrganizationUsersInput,
  RemoveOrganizationUserInput,
} from '@grantjs/schema';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class OrganizationUserRepository
  extends PivotRepository<OrganizationUserModel, OrganizationUser>
  implements IOrganizationUserRepository
{
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
    const db = transaction || this.db;
    const paramsRecord = params as Record<string, unknown>;
    const unique = this.whereUnique(paramsRecord);
    const softDeleted = unique ? and(unique, isNotNull(organizationUsers.deletedAt)) : undefined;
    if (softDeleted) {
      const existingSoftDeleted = await db
        .select()
        .from(organizationUsers)
        .where(softDeleted)
        .limit(1);
      if (existingSoftDeleted.length > 0) {
        const result = await db
          .update(organizationUsers)
          .set({
            deletedAt: null,
            updatedAt: new Date(),
            roleId: params.roleId,
          })
          .where(softDeleted)
          .returning();
        const reactivated = result[0];
        if (reactivated) return this.toEntity(reactivated as OrganizationUserModel);
      }
    }
    return this.add(paramsRecord, transaction);
  }

  public async updateOrganizationUser(
    params: { organizationId: string; userId: string; roleId: string },
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    const db = transaction || this.db;
    const result = await db
      .update(organizationUsers)
      .set({
        roleId: params.roleId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationUsers.organizationId, params.organizationId),
          eq(organizationUsers.userId, params.userId),
          isNull(organizationUsers.deletedAt)
        )
      )
      .returning();
    const updated = result[0];
    if (!updated) {
      throw new NotFoundError('OrganizationUser');
    }
    return this.toEntity(updated as OrganizationUserModel);
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

  /** User ids of org members whose assigned role name is in `roleNames`. */
  public async getUserIdsByOrganizationRoleNames(
    organizationId: string,
    roleNames: readonly string[],
    transaction?: Transaction
  ): Promise<string[]> {
    if (roleNames.length === 0) return [];
    const db = transaction ?? this.db;
    const rows = await db
      .select({ userId: organizationUsers.userId })
      .from(organizationUsers)
      .innerJoin(roles, eq(organizationUsers.roleId, roles.id))
      .where(
        and(
          eq(organizationUsers.organizationId, organizationId),
          inArray(roles.name, [...roleNames]),
          isNull(organizationUsers.deletedAt)
        )
      );
    return rows.map((r) => r.userId);
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
      .innerJoin(roles, eq(organizationUsers.roleId, roles.id))
      .where(
        and(
          eq(organizationUsers.userId, userId),
          isNull(organizationUsers.deletedAt),
          isNull(organizations.deletedAt)
        )
      );

    return membershipsData.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organizationName,
      role: m.roleName,
      joinedAt: m.joinedAt,
    }));
  }
}
