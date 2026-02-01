import { GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
import { groupPermissionsAuditLogs } from '@grantjs/database';
import {
  AddGroupPermissionInput,
  GroupPermission,
  QueryGroupPermissionsInput,
  RemoveGroupPermissionInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from './common';
import {
  getGroupPermissionsParamsSchema,
  addGroupPermissionParamsSchema,
  removeGroupPermissionParamsSchema,
  groupPermissionSchema,
} from './group-permissions.schemas';

export class GroupPermissionService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(groupPermissionsAuditLogs, 'groupPermissionId', user, db);
  }

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.repositories.groupRepository.getGroups(
      { ids: [groupId], limit: 1 },
      transaction
    );

    if (groups.groups.length === 0) {
      throw new NotFoundError('Group not found', 'errors:notFound.group');
    }
  }

  private async permissionExists(permissionId: string, transaction?: Transaction): Promise<void> {
    const permissions = await this.repositories.permissionRepository.getPermissions(
      { ids: [permissionId], limit: 1 },
      transaction
    );

    if (permissions.permissions.length === 0) {
      throw new NotFoundError('Permission not found', 'errors:notFound.permission');
    }
  }

  private async groupHasPermission(
    groupId: string,
    permissionId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.groupExists(groupId, transaction);
    await this.permissionExists(permissionId, transaction);
    const existingGroupPermissions =
      await this.repositories.groupPermissionRepository.getGroupPermissions(
        { groupId },
        transaction
      );

    return existingGroupPermissions.some((gp) => gp.permissionId === permissionId);
  }

  public async getGroupPermissions(
    params: QueryGroupPermissionsInput,
    transaction?: Transaction
  ): Promise<GroupPermission[]> {
    const context = 'GroupPermissionService.getGroupPermissions';
    const validatedParams = validateInput(getGroupPermissionsParamsSchema, params, context);
    const { groupId, permissionId } = validatedParams;

    if (groupId) {
      await this.groupExists(groupId, transaction);
    }
    if (permissionId) {
      await this.permissionExists(permissionId, transaction);
    }

    const result = await this.repositories.groupPermissionRepository.getGroupPermissions(
      validatedParams,
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(groupPermissionSchema).array(),
      result,
      context
    );
  }

  public async addGroupPermission(
    params: AddGroupPermissionInput,
    transaction?: Transaction
  ): Promise<GroupPermission> {
    const context = 'GroupPermissionService.addGroupPermission';
    const validatedParams = validateInput(addGroupPermissionParamsSchema, params, context);
    const { groupId, permissionId } = validatedParams;

    const hasPermission = await this.groupHasPermission(groupId, permissionId, transaction);

    if (hasPermission) {
      throw new ConflictError(
        'Group already has this permission',
        'errors:conflict.duplicateEntry',
        { resource: 'GroupPermission', field: 'permissionId' }
      );
    }

    const groupPermission = await this.repositories.groupPermissionRepository.addGroupPermission(
      { groupId, permissionId },
      transaction
    );

    const newValues = {
      id: groupPermission.id,
      groupId: groupPermission.groupId,
      permissionId: groupPermission.permissionId,
      createdAt: groupPermission.createdAt,
      updatedAt: groupPermission.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(groupPermission.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(groupPermissionSchema),
      groupPermission,
      context
    );
  }

  public async removeGroupPermission(
    params: RemoveGroupPermissionInput & DeleteParams,
    transaction?: Transaction
  ): Promise<GroupPermission> {
    const context = 'GroupPermissionService.removeGroupPermission';
    const validatedParams = validateInput(removeGroupPermissionParamsSchema, params, context);
    const { groupId, permissionId, hardDelete } = validatedParams;

    const hasPermission = await this.groupHasPermission(groupId, permissionId, transaction);

    if (!hasPermission) {
      throw new NotFoundError('Group does not have this permission', 'errors:notFound.permission');
    }

    const isHardDelete = hardDelete === true;

    const groupPermission = isHardDelete
      ? await this.repositories.groupPermissionRepository.hardDeleteGroupPermission(
          validatedParams,
          transaction
        )
      : await this.repositories.groupPermissionRepository.softDeleteGroupPermission(
          validatedParams,
          transaction
        );

    const oldValues = {
      id: groupPermission.id,
      groupId: groupPermission.groupId,
      permissionId: groupPermission.permissionId,
      createdAt: groupPermission.createdAt,
      updatedAt: groupPermission.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: groupPermission.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(groupPermission.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(groupPermission.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(
      createDynamicSingleSchema(groupPermissionSchema),
      groupPermission,
      context
    );
  }
}
