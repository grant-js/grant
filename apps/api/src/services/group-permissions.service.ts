import {
  AddGroupPermissionInput,
  GroupPermission,
  QueryGroupPermissionsInput,
  RemoveGroupPermissionInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { validateInput, validateOutput, createDynamicSingleSchema } from './common';
import {
  getGroupPermissionsParamsSchema,
  addGroupPermissionParamsSchema,
  removeGroupPermissionParamsSchema,
  groupPermissionSchema,
} from './group-permissions.schemas';

import type {
  IAuditLogger,
  IGroupPermissionRepository,
  IGroupPermissionService,
  IGroupRepository,
  IPermissionRepository,
} from '@grantjs/core';

export class GroupPermissionService implements IGroupPermissionService {
  constructor(
    private readonly groupRepository: IGroupRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly groupPermissionRepository: IGroupPermissionRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.groupRepository.getGroups({ ids: [groupId], limit: 1 }, transaction);

    if (groups.groups.length === 0) {
      throw new NotFoundError('Group');
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

  private async groupHasPermission(
    groupId: string,
    permissionId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.groupExists(groupId, transaction);
    await this.permissionExists(permissionId, transaction);
    const existingGroupPermissions = await this.groupPermissionRepository.getGroupPermissions(
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

    const result = await this.groupPermissionRepository.getGroupPermissions(
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
        'GroupPermission',
        'permissionId'
      );
    }

    const groupPermission = await this.groupPermissionRepository.addGroupPermission(
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

    await this.audit.logCreate(groupPermission.id, newValues, metadata, transaction);

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
      throw new NotFoundError('Permission');
    }

    const isHardDelete = hardDelete === true;

    const groupPermission = isHardDelete
      ? await this.groupPermissionRepository.hardDeleteGroupPermission(validatedParams, transaction)
      : await this.groupPermissionRepository.softDeleteGroupPermission(
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
      await this.audit.logHardDelete(groupPermission.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        groupPermission.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(
      createDynamicSingleSchema(groupPermissionSchema),
      groupPermission,
      context
    );
  }
}
