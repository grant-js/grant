import { GrantAuth } from '@grantjs/core';
import { DbSchema, userRolesAuditLogs } from '@grantjs/database';
import {
  AddUserRoleInput,
  QueryUserRolesInput,
  RemoveUserRoleInput,
  UserRole,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  DeleteParams,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  addUserRoleInputSchema,
  queryUserRolesArgsSchema,
  removeUserRoleInputSchema,
  userRoleSchema,
} from './user-roles.schemas';

export class UserRoleService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: GrantAuth | null,
    db: DbSchema
  ) {
    super(userRolesAuditLogs, 'userRoleId', user, db);
  }

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.repositories.userRepository.getUsers(
      { ids: [userId], limit: 1 },
      transaction
    );

    if (users.users.length === 0) {
      throw new NotFoundError('User not found', 'errors:notFound.user');
    }
  }

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.repositories.roleRepository.getRoles(
      { ids: [roleId], limit: 1 },
      transaction
    );

    if (roles.roles.length === 0) {
      throw new NotFoundError('Role not found', 'errors:notFound.role');
    }
  }

  private async userHasRole(
    userId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.userExists(userId, transaction);
    await this.roleExists(roleId, transaction);
    const existingUserRoles = await this.repositories.userRoleRepository.getUserRoles(
      { userId },
      transaction
    );

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

    const result = await this.repositories.userRoleRepository.getUserRoles(
      validatedParams,
      transaction
    );
    return validateOutput(createDynamicSingleSchema(userRoleSchema).array(), result, context);
  }

  public async addUserRole(params: AddUserRoleInput, transaction?: Transaction): Promise<UserRole> {
    const context = 'UserRoleService.addUserRole';
    const validatedParams = validateInput(addUserRoleInputSchema, params, context);
    const { userId, roleId } = validatedParams;

    const hasRole = await this.userHasRole(userId, roleId, transaction);

    if (hasRole) {
      throw new ConflictError('User already has this role', 'errors:conflict.duplicateEntry', {
        resource: 'UserRole',
        field: 'roleId',
      });
    }

    const userRole = await this.repositories.userRoleRepository.addUserRole(
      validatedParams,
      transaction
    );

    const newValues = {
      id: userRole.id,
      userId: userRole.userId,
      roleId: userRole.roleId,
      createdAt: userRole.createdAt,
      updatedAt: userRole.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(userRole.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(userRoleSchema), userRole, context);
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
      throw new NotFoundError('User does not have this role', 'errors:notFound.role');
    }

    const isHardDelete = hardDelete === true;

    const userRole = isHardDelete
      ? await this.repositories.userRoleRepository.hardDeleteUserRole(validatedParams, transaction)
      : await this.repositories.userRoleRepository.softDeleteUserRole(validatedParams, transaction);

    const oldValues = {
      id: userRole.id,
      userId: userRole.userId,
      roleId: userRole.roleId,
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
      await this.logHardDelete(userRole.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(userRole.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(userRoleSchema), userRole, context);
  }
}
