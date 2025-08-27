import {
  QueryPermissionsArgs,
  MutationCreatePermissionArgs,
  MutationUpdatePermissionArgs,
  MutationDeletePermissionArgs,
  Permission,
  PermissionPage,
} from '@/graphql/generated/types';
import { IPermissionRepository } from '@/graphql/repositories/permissions/interface';
import { permissionAuditLogs } from '@/graphql/repositories/permissions/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, paginatedResponseSchema } from '../common';

import { IPermissionService } from './interface';
import {
  getPermissionsParamsSchema,
  createPermissionParamsSchema,
  updatePermissionParamsSchema,
  deletePermissionParamsSchema,
  permissionSchema,
} from './schemas';

export class PermissionService extends AuditService implements IPermissionService {
  constructor(
    private readonly permissionRepository: IPermissionRepository,
    user: AuthenticatedUser | null
  ) {
    super(permissionAuditLogs, 'permissionId', user);
  }

  private async getPermission(permissionId: string): Promise<Permission> {
    const permissions = await this.permissionRepository.getPermissions({
      ids: [permissionId],
      limit: 1,
    });

    if (permissions.permissions.length === 0) {
      throw new Error('Permission not found');
    }

    return permissions.permissions[0];
  }

  public async getPermissions(
    params: Omit<QueryPermissionsArgs, 'scope'> & { requestedFields?: string[] }
  ): Promise<PermissionPage> {
    const validatedParams = validateInput(
      getPermissionsParamsSchema,
      params,
      'getPermissions method'
    );
    const result = await this.permissionRepository.getPermissions(validatedParams as any);

    // Transform repository result to standard format for validation
    const transformedResult = {
      items: result.permissions,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    const validatedResult = validateOutput(
      paginatedResponseSchema(permissionSchema),
      transformedResult,
      'getPermissions method'
    ) as any;

    return {
      permissions: validatedResult.items,
      totalCount: validatedResult.totalCount,
      hasNextPage: validatedResult.hasNextPage,
    };
  }

  public async createPermission(params: MutationCreatePermissionArgs): Promise<Permission> {
    const validatedParams = validateInput(
      createPermissionParamsSchema,
      params,
      'createPermission method'
    );
    const permission = await this.permissionRepository.createPermission(validatedParams);

    const newValues = {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      action: permission.action,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };

    const metadata = {
      source: 'create_permission_mutation',
    };

    await this.logCreate(permission.id, newValues, metadata);

    return validateOutput(permissionSchema, permission, 'createPermission method');
  }

  public async updatePermission(params: MutationUpdatePermissionArgs): Promise<Permission> {
    const validatedParams = validateInput(
      updatePermissionParamsSchema,
      params,
      'updatePermission method'
    );

    const oldPermission = await this.getPermission(validatedParams.id);
    const updatedPermission = await this.permissionRepository.updatePermission(validatedParams);

    const oldValues = {
      id: oldPermission.id,
      name: oldPermission.name,
      description: oldPermission.description,
      action: oldPermission.action,
      createdAt: oldPermission.createdAt,
      updatedAt: oldPermission.updatedAt,
    };

    const newValues = {
      id: updatedPermission.id,
      name: updatedPermission.name,
      description: updatedPermission.description,
      action: updatedPermission.action,
      createdAt: updatedPermission.createdAt,
      updatedAt: updatedPermission.updatedAt,
    };

    const metadata = {
      source: 'update_permission_mutation',
    };

    await this.logUpdate(updatedPermission.id, oldValues, newValues, metadata);

    return validateOutput(permissionSchema, updatedPermission, 'updatePermission method');
  }

  public async deletePermission(
    params: MutationDeletePermissionArgs & { hardDelete?: boolean }
  ): Promise<Permission> {
    const validatedParams = validateInput(
      deletePermissionParamsSchema,
      params,
      'deletePermission method'
    );

    const oldPermission = await this.getPermission(validatedParams.id);
    const isHardDelete = params.hardDelete === true;

    const deletedPermission = isHardDelete
      ? await this.permissionRepository.hardDeletePermission(validatedParams)
      : await this.permissionRepository.softDeletePermission(validatedParams);

    const oldValues = {
      id: oldPermission.id,
      name: oldPermission.name,
      description: oldPermission.description,
      action: oldPermission.action,
      createdAt: oldPermission.createdAt,
      updatedAt: oldPermission.updatedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_permission_mutation',
      };
      await this.logHardDelete(deletedPermission.id, oldValues, metadata);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedPermission.deletedAt,
      };

      const metadata = {
        source: 'soft_delete_permission_mutation',
      };
      await this.logSoftDelete(deletedPermission.id, oldValues, newValues, metadata);
    }

    return validateOutput(permissionSchema, deletedPermission, 'deletePermission method');
  }
}
