import { GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
import { permissionAuditLogs } from '@grantjs/database';
import {
  QueryPermissionsArgs,
  MutationDeletePermissionArgs,
  Permission,
  PermissionPage,
  CreatePermissionInput,
  UpdatePermissionInput,
} from '@grantjs/schema';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  SelectedFields,
  DeleteParams,
} from './common';
import {
  getPermissionsParamsSchema,
  createPermissionParamsSchema,
  updatePermissionParamsSchema,
  deletePermissionParamsSchema,
  permissionSchema,
} from './permissions.schemas';

export class PermissionService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: GrantAuth | null,
    db: DbSchema
  ) {
    super(permissionAuditLogs, 'permissionId', user, db);
  }

  private async getPermission(
    permissionId: string,
    transaction?: Transaction
  ): Promise<Permission> {
    const existingPermissions = await this.repositories.permissionRepository.getPermissions(
      { ids: [permissionId], limit: 1 },
      transaction
    );

    if (existingPermissions.permissions.length === 0) {
      throw new NotFoundError('Permission not found', 'errors:notFound.permission');
    }

    return existingPermissions.permissions[0];
  }

  public async getPermissions(
    params: Omit<QueryPermissionsArgs, 'scope' | 'tagIds'> & SelectedFields<Permission>
  ): Promise<PermissionPage> {
    const context = 'PermissionService.getPermissions';
    validateInput(getPermissionsParamsSchema, params, context);

    const result = await this.repositories.permissionRepository.getPermissions(params);

    const transformedResult = {
      items: result.permissions,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    validateOutput(
      createDynamicPaginatedSchema(permissionSchema, params.requestedFields),
      transformedResult,
      context
    );

    return result;
  }

  public async getPermissionsByResourceId(
    resourceId: string,
    transaction?: Transaction
  ): Promise<Permission[]> {
    return await this.repositories.permissionRepository.getPermissionsByResourceId(
      resourceId,
      transaction
    );
  }

  public async createPermission(
    params: Omit<CreatePermissionInput, 'scope' | 'tagIds'>,
    transaction?: Transaction
  ): Promise<Permission> {
    const context = 'PermissionService.createPermission';
    const validatedParams = validateInput(createPermissionParamsSchema, params, context);

    const permission = await this.repositories.permissionRepository.createPermission(
      validatedParams,
      transaction
    );

    const newValues = {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(permission.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(permissionSchema), permission, context);
  }

  public async updatePermission(
    id: string,
    input: UpdatePermissionInput,
    transaction?: Transaction
  ): Promise<Permission> {
    const context = 'PermissionService.updatePermission';
    validateInput(updatePermissionParamsSchema, { id, input }, context);

    const oldPermission = await this.getPermission(id, transaction);
    const updatedPermission = await this.repositories.permissionRepository.updatePermission(
      { id, input },
      transaction
    );

    const oldValues = {
      id: oldPermission.id,
      name: oldPermission.name,
      description: oldPermission.description,
      createdAt: oldPermission.createdAt,
      updatedAt: oldPermission.updatedAt,
    };

    const newValues = {
      id: updatedPermission.id,
      name: updatedPermission.name,
      description: updatedPermission.description,
      createdAt: updatedPermission.createdAt,
      updatedAt: updatedPermission.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logUpdate(updatedPermission.id, oldValues, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(permissionSchema), updatedPermission, context);
  }

  public async deletePermission(
    params: Omit<MutationDeletePermissionArgs, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<Permission> {
    const context = 'PermissionService.deletePermission';
    const validatedParams = validateInput(deletePermissionParamsSchema, params, context);

    const { id, hardDelete } = validatedParams;

    const oldPermission = await this.getPermission(id, transaction);
    const isHardDelete = hardDelete === true;

    const deletedPermission = isHardDelete
      ? await this.repositories.permissionRepository.hardDeletePermission(
          validatedParams,
          transaction
        )
      : await this.repositories.permissionRepository.softDeletePermission(
          validatedParams,
          transaction
        );

    const oldValues = {
      id: oldPermission.id,
      name: oldPermission.name,
      description: oldPermission.description,
      createdAt: oldPermission.createdAt,
      updatedAt: oldPermission.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(deletedPermission.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedPermission.deletedAt,
      };

      await this.logSoftDelete(deletedPermission.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(permissionSchema), deletedPermission, context);
  }
}
