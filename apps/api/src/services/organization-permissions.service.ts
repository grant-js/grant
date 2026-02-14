import {
  AddOrganizationPermissionInput,
  OrganizationPermission,
  QueryOrganizationPermissionsInput,
  RemoveOrganizationPermissionInput,
} from '@grantjs/schema';

import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addOrganizationPermissionInputSchema,
  organizationPermissionSchema,
  queryOrganizationPermissionsArgsSchema,
  removeOrganizationPermissionInputSchema,
} from './organization-permissions.schemas';

import type {
  IAuditLogger,
  IOrganizationPermissionRepository,
  IOrganizationPermissionService,
  IOrganizationRepository,
  IPermissionRepository,
} from '@grantjs/core';

export class OrganizationPermissionService implements IOrganizationPermissionService {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly organizationPermissionRepository: IOrganizationPermissionRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async organizationExists(
    organizationId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizations = await this.organizationRepository.getOrganizations(
      { ids: [organizationId], limit: 1 },
      transaction
    );

    if (organizations.organizations.length === 0) {
      throw new NotFoundError('Organization');
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

  private async organizationHasPermission(
    organizationId: string,
    permissionId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.permissionExists(permissionId, transaction);
    const existingOrganizationPermissions =
      await this.organizationPermissionRepository.getOrganizationPermissions(
        { organizationId },
        transaction
      );

    return existingOrganizationPermissions.some((op) => op.permissionId === permissionId);
  }

  public async getOrganizationPermissions(
    params: QueryOrganizationPermissionsInput,
    transaction?: Transaction
  ): Promise<OrganizationPermission[]> {
    const context = 'OrganizationPermissionService.getOrganizationPermissions';

    if (params.organizationId) {
      const validatedParams = validateInput(
        queryOrganizationPermissionsArgsSchema,
        params,
        context
      );
      await this.organizationExists(validatedParams.organizationId, transaction);
    }

    const queryParams = params.permissionId
      ? { permissionId: params.permissionId }
      : (params as QueryOrganizationPermissionsInput);
    const result = await this.organizationPermissionRepository.getOrganizationPermissions(
      queryParams,
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(organizationPermissionSchema).array(),
      result,
      context
    );
  }

  public async addOrganizationPermission(
    params: AddOrganizationPermissionInput,
    transaction?: Transaction
  ): Promise<OrganizationPermission> {
    const context = 'OrganizationPermissionService.addOrganizationPermission';
    const validatedParams = validateInput(addOrganizationPermissionInputSchema, params, context);

    const { organizationId, permissionId } = validatedParams;

    await this.organizationExists(organizationId, transaction);
    await this.permissionExists(permissionId, transaction);

    const hasPermission = await this.organizationHasPermission(
      organizationId,
      permissionId,
      transaction
    );

    if (hasPermission) {
      throw new ConflictError(
        'Organization already has this permission',
        'OrganizationPermission',
        'permissionId'
      );
    }

    const result = await this.organizationPermissionRepository.addOrganizationPermission(
      { organizationId, permissionId },
      transaction
    );

    const newValues = {
      id: result.id,
      organizationId: result.organizationId,
      permissionId: result.permissionId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(result.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(organizationPermissionSchema), result, context);
  }

  public async removeOrganizationPermission(
    params: RemoveOrganizationPermissionInput & DeleteParams,
    transaction?: Transaction
  ): Promise<OrganizationPermission> {
    const context = 'OrganizationPermissionService.removeOrganizationPermission';
    const validatedParams = validateInput(removeOrganizationPermissionInputSchema, params, context);

    const { organizationId, permissionId, hardDelete } = validatedParams;

    const hasPermission = await this.organizationHasPermission(
      organizationId,
      permissionId,
      transaction
    );

    if (!hasPermission) {
      throw new NotFoundError('Permission');
    }

    const isHardDelete = hardDelete === true;

    const result = isHardDelete
      ? await this.organizationPermissionRepository.hardDeleteOrganizationPermission(
          { organizationId, permissionId },
          transaction
        )
      : await this.organizationPermissionRepository.softDeleteOrganizationPermission(
          { organizationId, permissionId },
          transaction
        );

    if (!result) {
      throw new BadRequestError('Failed to remove organization permission');
    }

    const oldValues = {
      id: result.id,
      organizationId: result.organizationId,
      permissionId: result.permissionId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: result.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(result.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(result.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(organizationPermissionSchema), result, context);
  }
}
