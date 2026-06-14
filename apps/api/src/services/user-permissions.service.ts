import type {
  IAuditLogger,
  IPermissionRepository,
  IUserPermissionRepository,
  IUserPermissionService,
  IUserRepository,
} from '@grantjs/core';
import {
  AssignUserPermissionInput,
  QueryUserPermissionsInput,
  RevokeUserPermissionInput,
  UserPermission,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  assignUserPermissionInputSchema,
  queryUserPermissionsArgsSchema,
  revokeUserPermissionInputSchema,
  userPermissionSchema,
} from './user-permissions.schemas';

export class UserPermissionService implements IUserPermissionService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly userPermissionRepository: IUserPermissionRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.userRepository.getUsers({ ids: [userId], limit: 1 }, transaction);

    if (users.users.length === 0) {
      throw new NotFoundError('User');
    }
  }

  private async permissionExists(permissionId: string, transaction?: Transaction): Promise<void> {
    const permissions = await this.permissionRepository.getPermissions(
      { ids: [permissionId], limit: 1 },
      transaction
    );

    if (permissions.permissions.length === 0) {
      throw new NotFoundError('Permission');
    }
  }

  private async userHasPermission(
    userId: string,
    permissionId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.userExists(userId, transaction);
    await this.permissionExists(permissionId, transaction);
    const existing = await this.userPermissionRepository.getUserPermissions(
      { userId },
      transaction
    );

    return existing.some((up) => up.permissionId === permissionId);
  }

  public async getUserPermissions(
    params: QueryUserPermissionsInput,
    transaction?: Transaction
  ): Promise<UserPermission[]> {
    const context = 'UserPermissionService.getUserPermissions';
    const validatedParams = validateInput(queryUserPermissionsArgsSchema, params, context);
    const { userId, permissionId } = validatedParams;

    if (userId) {
      await this.userExists(userId, transaction);
    }
    if (permissionId) {
      await this.permissionExists(permissionId, transaction);
    }

    const result = await this.userPermissionRepository.getUserPermissions(
      validatedParams,
      transaction
    );

    return validateOutput(createDynamicSingleSchema(userPermissionSchema).array(), result, context);
  }

  public async countUserPermissions(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.userPermissionRepository.countUserPermissions(params, transaction);
  }

  public async assignUserPermission(
    params: AssignUserPermissionInput,
    transaction?: Transaction
  ): Promise<UserPermission> {
    const context = 'UserPermissionService.assignUserPermission';
    const validatedParams = validateInput(assignUserPermissionInputSchema, params, context);
    const { userId, permissionId } = validatedParams;

    const hasPermission = await this.userHasPermission(userId, permissionId, transaction);

    if (hasPermission) {
      throw new ConflictError('User already has this permission', 'UserPermission', 'permissionId');
    }

    const userPermission = await this.userPermissionRepository.addUserPermission(
      validatedParams,
      transaction
    );

    const newValues = {
      id: userPermission.id,
      userId: userPermission.userId,
      permissionId: userPermission.permissionId,
      createdAt: userPermission.createdAt,
      updatedAt: userPermission.updatedAt,
    };

    await this.audit.logCreate(userPermission.id, newValues, { context }, transaction);

    return validateOutput(createDynamicSingleSchema(userPermissionSchema), userPermission, context);
  }

  public async revokeUserPermission(
    params: RevokeUserPermissionInput & DeleteParams,
    transaction?: Transaction
  ): Promise<UserPermission> {
    const context = 'UserPermissionService.revokeUserPermission';
    const validatedParams = validateInput(revokeUserPermissionInputSchema, params, context);
    const { userId, permissionId, hardDelete } = validatedParams;

    const hasPermission = await this.userHasPermission(userId, permissionId, transaction);

    if (!hasPermission) {
      throw new NotFoundError('Permission');
    }

    const isHardDelete = hardDelete === true;

    const userPermission = isHardDelete
      ? await this.userPermissionRepository.hardDeleteUserPermission(validatedParams, transaction)
      : await this.userPermissionRepository.softDeleteUserPermission(validatedParams, transaction);

    const oldValues = {
      id: userPermission.id,
      userId: userPermission.userId,
      permissionId: userPermission.permissionId,
      createdAt: userPermission.createdAt,
      updatedAt: userPermission.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: userPermission.deletedAt,
    };

    const metadata = { context, hardDelete };

    if (isHardDelete) {
      await this.audit.logHardDelete(userPermission.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        userPermission.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(createDynamicSingleSchema(userPermissionSchema), userPermission, context);
  }
}
