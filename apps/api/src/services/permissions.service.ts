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
import { DeleteParams, SelectedFields } from '@/types';

import {
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
} from './common';
import {
  getPermissionsParamsSchema,
  createPermissionParamsSchema,
  updatePermissionParamsSchema,
  deletePermissionParamsSchema,
  permissionSchema,
} from './permissions.schemas';

import type { IAuditLogger, IPermissionRepository, IPermissionService } from '@grantjs/core';

export class PermissionService implements IPermissionService {
  constructor(
    private readonly permissionRepository: IPermissionRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async getPermission(
    permissionId: string,
    transaction?: Transaction
  ): Promise<Permission> {
    const existingPermissions = await this.permissionRepository.getPermissions(
      { ids: [permissionId], limit: 1 },
      transaction
    );

    if (existingPermissions.permissions.length === 0) {
      throw new NotFoundError('Permission');
    }

    return existingPermissions.permissions[0];
  }

  public async getPermissions(
    params: Omit<QueryPermissionsArgs, 'scope' | 'tagIds'> & SelectedFields<Permission>
  ): Promise<PermissionPage> {
    const context = 'PermissionService.getPermissions';
    validateInput(getPermissionsParamsSchema, params, context);

    const result = await this.permissionRepository.getPermissions(params);

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
    return await this.permissionRepository.getPermissionsByResourceId(resourceId, transaction);
  }

  public async createPermission(
    params: Omit<CreatePermissionInput, 'scope' | 'tagIds'>,
    transaction?: Transaction
  ): Promise<Permission> {
    const context = 'PermissionService.createPermission';
    const validatedParams = validateInput(createPermissionParamsSchema, params, context);

    const permission = await this.permissionRepository.createPermission(
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

    await this.audit.logCreate(permission.id, newValues, metadata, transaction);

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
    const updatedPermission = await this.permissionRepository.updatePermission(
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

    await this.audit.logUpdate(updatedPermission.id, oldValues, newValues, metadata, transaction);

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
      ? await this.permissionRepository.hardDeletePermission(validatedParams, transaction)
      : await this.permissionRepository.softDeletePermission(validatedParams, transaction);

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
      await this.audit.logHardDelete(deletedPermission.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedPermission.deletedAt,
      };

      await this.audit.logSoftDelete(
        deletedPermission.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(createDynamicSingleSchema(permissionSchema), deletedPermission, context);
  }
}
