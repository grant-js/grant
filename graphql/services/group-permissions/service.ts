import {
  QueryGroupPermissionsArgs,
  MutationAddGroupPermissionArgs,
  MutationRemoveGroupPermissionArgs,
  GroupPermission,
} from '@/graphql/generated/types';
import {
  IGroupPermissionRepository,
  IGroupRepository,
  IPermissionRepository,
} from '@/graphql/repositories';
import { groupPermissionsAuditLogs } from '@/graphql/repositories/group-permissions/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IGroupPermissionService } from './interface';
import {
  getGroupPermissionsParamsSchema,
  addGroupPermissionParamsSchema,
  removeGroupPermissionParamsSchema,
  groupPermissionSchema,
} from './schemas';

export class GroupPermissionService extends AuditService implements IGroupPermissionService {
  constructor(
    private readonly groupPermissionRepository: IGroupPermissionRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly permissionRepository: IPermissionRepository,
    user: AuthenticatedUser | null
  ) {
    super(groupPermissionsAuditLogs, 'groupPermissionId', user);
  }

  private async groupExists(groupId: string): Promise<void> {
    const groups = await this.groupRepository.getGroups({
      ids: [groupId],
      limit: 1,
    });

    if (groups.groups.length === 0) {
      throw new Error('Group not found');
    }
  }

  private async permissionExists(permissionId: string): Promise<void> {
    const permissions = await this.permissionRepository.getPermissions({
      ids: [permissionId],
      limit: 1,
    });

    if (permissions.permissions.length === 0) {
      throw new Error('Permission not found');
    }
  }

  private async groupHasPermission(groupId: string, permissionId: string): Promise<boolean> {
    await this.groupExists(groupId);
    await this.permissionExists(permissionId);
    const existingGroupPermissions = await this.groupPermissionRepository.getGroupPermissions({
      groupId,
    });

    return existingGroupPermissions.some((gp) => gp.permissionId === permissionId);
  }

  public async getGroupPermissions(
    params: Omit<QueryGroupPermissionsArgs, 'scope'>
  ): Promise<GroupPermission[]> {
    const validatedParams = validateInput(
      getGroupPermissionsParamsSchema,
      params,
      'getGroupPermissions method'
    );

    if (!validatedParams.groupId) {
      throw new Error('Group ID is required');
    }
    await this.groupExists(validatedParams.groupId);

    const result = await this.groupPermissionRepository.getGroupPermissions(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(groupPermissionSchema).array(),
      result,
      'getGroupPermissions method'
    );
  }

  public async addGroupPermission(
    params: MutationAddGroupPermissionArgs
  ): Promise<GroupPermission> {
    const validatedParams = validateInput(
      addGroupPermissionParamsSchema,
      params,
      'addGroupPermission method'
    );

    const hasPermission = await this.groupHasPermission(
      validatedParams.input.groupId,
      validatedParams.input.permissionId
    );
    if (hasPermission) {
      throw new Error('Group already has this permission');
    }

    const groupPermission =
      await this.groupPermissionRepository.addGroupPermission(validatedParams);

    const newValues = {
      id: groupPermission.id,
      groupId: groupPermission.groupId,
      permissionId: groupPermission.permissionId,
      createdAt: groupPermission.createdAt,
      updatedAt: groupPermission.updatedAt,
    };

    const metadata = {
      source: 'add_group_permission_mutation',
    };

    await this.logCreate(groupPermission.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(groupPermissionSchema),
      groupPermission,
      'addGroupPermission method'
    );
  }

  public async removeGroupPermission(
    params: MutationRemoveGroupPermissionArgs & { hardDelete?: boolean }
  ): Promise<GroupPermission> {
    const validatedParams = validateInput(
      removeGroupPermissionParamsSchema,
      params,
      'removeGroupPermission method'
    );

    const hasPermission = await this.groupHasPermission(
      validatedParams.input.groupId,
      validatedParams.input.permissionId
    );
    if (!hasPermission) {
      throw new Error('Group does not have this permission');
    }

    const isHardDelete = params.hardDelete === true;

    const groupPermission = isHardDelete
      ? await this.groupPermissionRepository.hardDeleteGroupPermission(validatedParams)
      : await this.groupPermissionRepository.softDeleteGroupPermission(validatedParams);

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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_group_permission_mutation',
      };
      await this.logHardDelete(groupPermission.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_group_permission_mutation',
      };
      await this.logSoftDelete(groupPermission.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(groupPermissionSchema),
      groupPermission,
      'removeGroupPermission method'
    );
  }
}
