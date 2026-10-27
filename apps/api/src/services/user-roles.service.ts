import type {
  IAuditLogger,
  IEventPublisher,
  IRoleRepository,
  IUserRepository,
  IUserRoleRepository,
  IUserRoleService,
} from '@grantjs/core';
import {
  AddUserRoleInput,
  QueryUserRolesInput,
  RemoveUserRoleInput,
  UserRole,
} from '@grantjs/schema';

import { NotFoundError } from '@/lib/errors';
import { unboundedList } from '@/lib/pagination.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addUserRoleInputSchema,
  addUserRolesForCdmImportParamsSchema,
  queryUserRolesArgsSchema,
  removeUserRoleInputSchema,
  userRoleSchema,
} from './user-roles.schemas';

export class UserRoleService implements IUserRoleService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher
  ) {}

  private async getRoleName(
    roleId: string,
    transaction?: Transaction
  ): Promise<string | undefined> {
    const { roles } = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);
    return roles[0]?.name;
  }

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    if (!(await this.userRepository.existsById(userId, transaction))) {
      throw new NotFoundError('User');
    }
  }

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);

    if (roles.roles.length === 0) {
      throw new NotFoundError('Role');
    }
  }

  private async userHasRole(
    userId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.userExists(userId, transaction);
    await this.roleExists(roleId, transaction);
    const existingUserRoles = await this.userRoleRepository.getUserRoles({ userId }, transaction);

    return existingUserRoles.some((ur) => ur.roleId === roleId);
  }

  public async getUserRoles(
    params: QueryUserRolesInput,
    transaction?: Transaction
  ): Promise<UserRole[]> {
    const context = 'UserRoleService.getUserRoles';
    const validatedParams = validateInput(queryUserRolesArgsSchema, params, context);
    const { userId, roleId } = validatedParams;

    if (userId) {
      await this.userExists(userId, transaction);
    }
    if (roleId) {
      await this.roleExists(roleId, transaction);
    }

    const result = await this.userRoleRepository.getUserRoles(validatedParams, transaction);
    return validateOutput(createDynamicSingleSchema(userRoleSchema).array(), result, context);
  }

  public async getUserRolesByUserIds(
    userIds: string[],
    transaction?: Transaction
  ): Promise<UserRole[]> {
    const context = 'UserRoleService.getUserRolesByUserIds';
    const result = await this.userRoleRepository.getUserRolesByUserIds(userIds, transaction);
    return validateOutput(createDynamicSingleSchema(userRoleSchema).array(), result, context);
  }

  public async countUserRoles(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.userRoleRepository.countUserRoles(params, transaction);
  }

  public async countUserRolesByUserIds(
    userIds: string[],
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return this.userRoleRepository.countUserRolesByUserIds(userIds, transaction);
  }

  public async addUserRole(params: AddUserRoleInput, transaction?: Transaction): Promise<UserRole> {
    const context = 'UserRoleService.addUserRole';
    const validatedParams = validateInput(addUserRoleInputSchema, params, context);
    const { userId, roleId } = validatedParams;

    const hasRole = await this.userHasRole(userId, roleId, transaction);

    // Idempotent: if the user already has this global role assignment, return it.
    // Role scoping to organizations is handled at query time via organization_roles joins,
    // so a single global user_roles entry is valid for multiple org memberships.
    if (hasRole) {
      const existingRoles = await this.userRoleRepository.getUserRoles(
        { userId, roleId },
        transaction
      );
      return validateOutput(createDynamicSingleSchema(userRoleSchema), existingRoles[0], context);
    }

    const userRole = await this.userRoleRepository.addUserRole(validatedParams, transaction);

    const roleName = await this.getRoleName(roleId, transaction);

    const newValues = {
      id: userRole.id,
      userId: userRole.userId,
      roleId: userRole.roleId,
      roleName,
      createdAt: userRole.createdAt,
      updatedAt: userRole.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(userRole.id, newValues, metadata, transaction);

    await this.events.publish(
      {
        type: 'user.role_assigned',
        aggregate: { kind: 'userRole', id: userRole.id },
        subjectUserId: userRole.userId,
        data: { after: newValues },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(userRoleSchema), userRole, context);
  }

  public async addUserRolesForCdmImport(
    params: { assignments: readonly { userId: string; roleId: string }[] },
    transaction?: Transaction
  ): Promise<UserRole[]> {
    const context = 'UserRoleService.addUserRolesForCdmImport';
    const validatedParams = validateInput(addUserRolesForCdmImportParamsSchema, params, context);
    const unique = uniquePairs(
      validatedParams.assignments,
      (row) => row.userId,
      (row) => row.roleId
    );
    if (unique.length === 0) {
      return [];
    }

    const userIds = [...new Set(unique.map((row) => row.userId))];
    const roleIds = [...new Set(unique.map((row) => row.roleId))];
    const [users, roles, existing] = await Promise.all([
      this.userRepository.getUsers(unboundedList({ ids: userIds, limit: -1 }), transaction),
      this.roleRepository.getRoles(unboundedList({ ids: roleIds, limit: -1 }), transaction),
      this.userRoleRepository.getUserRolesByUserIds(userIds, transaction),
    ]);
    if (users.users.length !== userIds.length) {
      throw new NotFoundError('User');
    }
    if (roles.roles.length !== roleIds.length) {
      throw new NotFoundError('Role');
    }

    const existingKeys = new Set(existing.map((row) => `${row.userId}\0${row.roleId}`));
    const missing = unique.filter((row) => !existingKeys.has(`${row.userId}\0${row.roleId}`));
    if (missing.length === 0) {
      return existing.filter((row) =>
        unique.some((wanted) => wanted.userId === row.userId && wanted.roleId === row.roleId)
      );
    }

    const created = await this.userRoleRepository.addUserRoles(missing, transaction);
    const roleNameById = new Map(roles.roles.map((role) => [role.id, role.name]));
    for (const userRole of created) {
      const newValues = {
        id: userRole.id,
        userId: userRole.userId,
        roleId: userRole.roleId,
        roleName: roleNameById.get(userRole.roleId),
        createdAt: userRole.createdAt,
        updatedAt: userRole.updatedAt,
      };
      await this.audit.logCreate(userRole.id, newValues, { context }, transaction);
      await this.events.publish(
        {
          type: 'user.role_assigned',
          aggregate: { kind: 'userRole', id: userRole.id },
          subjectUserId: userRole.userId,
          data: { after: newValues },
        },
        transaction
      );
    }

    return validateOutput(createDynamicSingleSchema(userRoleSchema).array(), created, context);
  }

  public async removeUserRole(
    params: RemoveUserRoleInput & DeleteParams,
    transaction?: Transaction
  ): Promise<UserRole> {
    const context = 'UserRoleService.removeUserRole';
    const validatedParams = validateInput(removeUserRoleInputSchema, params, context);
    const { userId, roleId, hardDelete } = validatedParams;

    const hasRole = await this.userHasRole(userId, roleId, transaction);

    if (!hasRole) {
      throw new NotFoundError('UserRole');
    }

    const isHardDelete = hardDelete === true;

    const userRole = isHardDelete
      ? await this.userRoleRepository.hardDeleteUserRole(validatedParams, transaction)
      : await this.userRoleRepository.softDeleteUserRole(validatedParams, transaction);

    const oldValues = {
      id: userRole.id,
      userId: userRole.userId,
      roleId: userRole.roleId,
      roleName: await this.getRoleName(roleId, transaction),
      createdAt: userRole.createdAt,
      updatedAt: userRole.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: userRole.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(userRole.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(userRole.id, oldValues, newValues, metadata, transaction);
    }

    await this.events.publish(
      {
        type: 'user.role_revoked',
        aggregate: { kind: 'userRole', id: userRole.id },
        subjectUserId: userRole.userId,
        data: { before: oldValues },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(userRoleSchema), userRole, context);
  }
}

function uniquePairs<T>(
  rows: readonly T[],
  left: (row: T) => string,
  right: (row: T) => string
): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const row of rows) {
    const key = `${left(row)}\0${right(row)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}
