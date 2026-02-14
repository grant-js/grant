import {
  AddUserRoleInput,
  QueryUserRolesInput,
  RemoveUserRoleInput,
  UserRole,
} from '@grantjs/schema';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addUserRoleInputSchema,
  queryUserRolesArgsSchema,
  removeUserRoleInputSchema,
  userRoleSchema,
} from './user-roles.schemas';

import type {
  IAuditLogger,
  IRoleRepository,
  IUserRepository,
  IUserRoleRepository,
  IUserRoleService,
} from '@grantjs/core';

export class UserRoleService implements IUserRoleService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.userRepository.getUsers({ ids: [userId], limit: 1 }, transaction);

    if (users.users.length === 0) {
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

    await this.audit.logCreate(userRole.id, newValues, metadata, transaction);

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

    return validateOutput(createDynamicSingleSchema(userRoleSchema), userRole, context);
  }
}
