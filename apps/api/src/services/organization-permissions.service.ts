import { DbSchema, organizationPermissionsAuditLogs } from '@logusgraphics/grant-database';
import {
  AddOrganizationPermissionInput,
  OrganizationPermission,
  RemoveOrganizationPermissionInput,
} from '@logusgraphics/grant-schema';

import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

import {
  AuditService,
  DeleteParams,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  addOrganizationPermissionInputSchema,
  organizationPermissionSchema,
  queryOrganizationPermissionsArgsSchema,
  removeOrganizationPermissionInputSchema,
} from './organization-permissions.schemas';

export class OrganizationPermissionService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(organizationPermissionsAuditLogs, 'organizationPermissionId', user, db);
  }

  private async organizationExists(
    organizationId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizations = await this.repositories.organizationRepository.getOrganizations(
      { ids: [organizationId], limit: 1 },
      transaction
    );

    if (organizations.organizations.length === 0) {
      throw new NotFoundError('Organization not found', 'errors:notFound.organization');
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

  private async organizationHasPermission(
    organizationId: string,
    permissionId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.permissionExists(permissionId, transaction);
    const existingOrganizationPermissions =
      await this.repositories.organizationPermissionRepository.getOrganizationPermissions(
        { organizationId },
        transaction
      );

    return existingOrganizationPermissions.some((op) => op.permissionId === permissionId);
  }

  public async getOrganizationPermissions(
    params: {
      organizationId: string;
    },
    transaction?: Transaction
  ): Promise<OrganizationPermission[]> {
    const context = 'OrganizationPermissionService.getOrganizationPermissions';
    const validatedParams = validateInput(queryOrganizationPermissionsArgsSchema, params, context);

    const { organizationId } = validatedParams;

    await this.organizationExists(organizationId, transaction);

    const result =
      await this.repositories.organizationPermissionRepository.getOrganizationPermissions(
        { organizationId },
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
        'errors:conflict.duplicateEntry',
        { resource: 'OrganizationPermission', field: 'permissionId' }
      );
    }

    const result =
      await this.repositories.organizationPermissionRepository.addOrganizationPermission(
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

    await this.logCreate(result.id, newValues, metadata, transaction);

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
      throw new NotFoundError(
        'Organization does not have this permission',
        'errors:notFound.permission'
      );
    }

    const isHardDelete = hardDelete === true;

    const result = isHardDelete
      ? await this.repositories.organizationPermissionRepository.hardDeleteOrganizationPermission(
          { organizationId, permissionId },
          transaction
        )
      : await this.repositories.organizationPermissionRepository.softDeleteOrganizationPermission(
          { organizationId, permissionId },
          transaction
        );

    if (!result) {
      throw new BadRequestError(
        'Failed to remove organization permission',
        'errors:common.badRequest'
      );
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
      await this.logHardDelete(result.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(result.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(organizationPermissionSchema), result, context);
  }
}
