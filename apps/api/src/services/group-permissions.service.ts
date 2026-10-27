import type {
  IAuditLogger,
  IEventPublisher,
  IGroupPermissionRepository,
  IGroupPermissionService,
  IGroupRepository,
  IPermissionRepository,
} from '@grantjs/core';
import {
  AddGroupPermissionInput,
  GroupPermission,
  QueryGroupPermissionsInput,
  RemoveGroupPermissionInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addGroupPermissionParamsSchema,
  addGroupPermissionsForCdmImportParamsSchema,
  getGroupPermissionsParamsSchema,
  groupPermissionSchema,
  removeGroupPermissionParamsSchema,
} from './group-permissions.schemas';

export class GroupPermissionService implements IGroupPermissionService {
  constructor(
    private readonly groupRepository: IGroupRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly groupPermissionRepository: IGroupPermissionRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher
  ) {}

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    if (!(await this.groupRepository.existsById(groupId, transaction))) {
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

  public async countGroupPermissions(
    params: { groupId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.groupPermissionRepository.countGroupPermissions(params, transaction);
  }

  public async countGroupPermissionsByGroupIds(
    groupIds: string[],
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return this.groupPermissionRepository.countGroupPermissionsByGroupIds(groupIds, transaction);
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

    await this.events.publish(
      {
        type: 'group.permission_assigned',
        aggregate: { kind: 'groupPermission', id: groupPermission.id },
        data: { after: newValues },
      },
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(groupPermissionSchema),
      groupPermission,
      context
    );
  }

  public async addGroupPermissionsForCdmImport(
    params: { links: readonly { groupId: string; permissionId: string }[] },
    transaction?: Transaction
  ): Promise<GroupPermission[]> {
    const context = 'GroupPermissionService.addGroupPermissionsForCdmImport';
    const validatedParams = validateInput(
      addGroupPermissionsForCdmImportParamsSchema,
      params,
      context
    );
    const unique = uniquePairs(
      validatedParams.links,
      (row) => row.groupId,
      (row) => row.permissionId
    );
    if (unique.length === 0) {
      return [];
    }

    const groupIds = [...new Set(unique.map((row) => row.groupId))];
    const permissionIds = [...new Set(unique.map((row) => row.permissionId))];
    const [groups, permissions, existing] = await Promise.all([
      this.groupRepository.getGroups({ ids: groupIds, limit: groupIds.length }, transaction),
      this.permissionRepository.getPermissions(
        { ids: permissionIds, limit: permissionIds.length },
        transaction
      ),
      this.groupPermissionRepository.getGroupPermissionsByGroupIds(groupIds, transaction),
    ]);
    if (groups.groups.length !== groupIds.length) {
      throw new NotFoundError('Group');
    }
    if (permissions.permissions.length !== permissionIds.length) {
      throw new NotFoundError('Permission');
    }

    const existingKeys = new Set(existing.map((row) => `${row.groupId}\0${row.permissionId}`));
    const missing = unique.filter(
      (row) => !existingKeys.has(`${row.groupId}\0${row.permissionId}`)
    );
    if (missing.length === 0) {
      return [];
    }

    const created = await this.groupPermissionRepository.addGroupPermissions(missing, transaction);
    for (const groupPermission of created) {
      const newValues = {
        id: groupPermission.id,
        groupId: groupPermission.groupId,
        permissionId: groupPermission.permissionId,
        createdAt: groupPermission.createdAt,
        updatedAt: groupPermission.updatedAt,
      };
      await this.audit.logCreate(groupPermission.id, newValues, { context }, transaction);
      await this.events.publish(
        {
          type: 'group.permission_assigned',
          aggregate: { kind: 'groupPermission', id: groupPermission.id },
          data: { after: newValues },
        },
        transaction
      );
    }

    return validateOutput(
      createDynamicSingleSchema(groupPermissionSchema).array(),
      created,
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

    await this.events.publish(
      {
        type: 'group.permission_revoked',
        aggregate: { kind: 'groupPermission', id: groupPermission.id },
        data: { before: oldValues },
      },
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(groupPermissionSchema),
      groupPermission,
      context
    );
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
