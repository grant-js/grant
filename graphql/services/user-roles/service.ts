import { AddUserRoleInput, RemoveUserRoleInput, UserRole } from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { userRolesAuditLogs } from '@/graphql/repositories/user-roles/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  userRoleSchema,
  queryUserRolesArgsSchema,
  addUserRoleInputSchema,
  removeUserRoleInputSchema,
} from './schemas';

export class UserRoleService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(userRolesAuditLogs, 'userRoleId', user, db);
  }

  private async userExists(userId: string): Promise<void> {
    const users = await this.repositories.userRepository.getUsers({
      ids: [userId],
      limit: 1,
    });

    if (users.users.length === 0) {
      throw new Error('User not found');
    }
  }

  private async roleExists(roleId: string): Promise<void> {
    const roles = await this.repositories.roleRepository.getRoles({
      ids: [roleId],
      limit: 1,
    });

    if (roles.roles.length === 0) {
      throw new Error('Role not found');
    }
  }

  private async userHasRole(userId: string, roleId: string): Promise<boolean> {
    await this.userExists(userId);
    await this.roleExists(roleId);
    const existingUserRoles = await this.repositories.userRoleRepository.getUserRoles({
      userId,
    });

    return existingUserRoles.some((ur) => ur.roleId === roleId);
  }

  public async getUserRoles(params: { userId: string }): Promise<UserRole[]> {
    const context = 'UserRoleService.getUserRoles';
    const validatedParams = validateInput(queryUserRolesArgsSchema, params, context);
    const { userId } = validatedParams;

    await this.userExists(userId);

    const result = await this.repositories.userRoleRepository.getUserRoles({
      userId,
    });
    return validateOutput(createDynamicSingleSchema(userRoleSchema).array(), result, context);
  }

  public async addUserRole(params: AddUserRoleInput, transaction?: Transaction): Promise<UserRole> {
    const context = 'UserRoleService.addUserRole';
    const validatedParams = validateInput(addUserRoleInputSchema, params, context);
    const { userId, roleId } = validatedParams;

    const hasRole = await this.userHasRole(userId, roleId);

    if (hasRole) {
      throw new Error('User already has this role');
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

    const hasRole = await this.userHasRole(userId, roleId);

    if (!hasRole) {
      throw new Error('User does not have this role');
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
