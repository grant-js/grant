import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  MutationAddOrganizationPermissionArgs,
  MutationRemoveOrganizationPermissionArgs,
  OrganizationPermission,
  QueryOrganizationPermissionsArgs,
} from '@/graphql/generated/types';
import { Repositories } from '@/graphql/repositories';
import { organizationPermissionsAuditLogs } from '@/graphql/repositories/organization-permissions/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IOrganizationPermissionService } from './interface';
import {
  getOrganizationPermissionsParamsSchema,
  addOrganizationPermissionParamsSchema,
  removeOrganizationPermissionParamsSchema,
  organizationPermissionSchema,
} from './schemas';

export class OrganizationPermissionService
  extends AuditService
  implements IOrganizationPermissionService
{
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    private readonly db: PostgresJsDatabase
  ) {
    super(organizationPermissionsAuditLogs, 'organizationPermissionId', user);
  }

  private async organizationExists(organizationId: string): Promise<void> {
    const organizations = await this.repositories.organizationRepository.getOrganizations({
      ids: [organizationId],
      limit: 1,
    });

    if (organizations.organizations.length === 0) {
      throw new Error('Organization not found');
    }
  }

  private async permissionExists(permissionId: string): Promise<void> {
    const permissions = await this.repositories.permissionRepository.getPermissions({
      ids: [permissionId],
      limit: 1,
    });

    if (permissions.permissions.length === 0) {
      throw new Error('Permission not found');
    }
  }

  private async organizationHasPermission(
    organizationId: string,
    permissionId: string
  ): Promise<boolean> {
    await this.organizationExists(organizationId);
    await this.permissionExists(permissionId);
    const existingOrganizationPermissions =
      await this.repositories.organizationPermissionRepository.getOrganizationPermissions({
        organizationId,
      });

    return existingOrganizationPermissions.some((op) => op.permissionId === permissionId);
  }

  public async getOrganizationPermissions(
    params: Omit<QueryOrganizationPermissionsArgs, 'scope'>
  ): Promise<OrganizationPermission[]> {
    const validatedParams = validateInput(
      getOrganizationPermissionsParamsSchema,
      params,
      'getOrganizationPermissions method'
    );

    await this.organizationExists(validatedParams.organizationId);

    const result =
      await this.repositories.organizationPermissionRepository.getOrganizationPermissions(
        validatedParams
      );
    return validateOutput(
      createDynamicSingleSchema(organizationPermissionSchema).array(),
      result,
      'getOrganizationPermissions method'
    );
  }

  public async addOrganizationPermission(
    params: MutationAddOrganizationPermissionArgs
  ): Promise<OrganizationPermission> {
    const validatedParams = validateInput(
      addOrganizationPermissionParamsSchema,
      params,
      'addOrganizationPermission method'
    );

    const hasPermission = await this.organizationHasPermission(
      validatedParams.input.organizationId,
      validatedParams.input.permissionId
    );

    if (hasPermission) {
      throw new Error('Organization already has this permission');
    }

    const result =
      await this.repositories.organizationPermissionRepository.addOrganizationPermission(
        validatedParams.input.organizationId,
        validatedParams.input.permissionId
      );

    const newValues = {
      id: result.id,
      organizationId: result.organizationId,
      permissionId: result.permissionId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    const metadata = {
      source: 'add_organization_permission_mutation',
    };

    await this.logCreate(result.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(organizationPermissionSchema),
      result,
      'addOrganizationPermission method'
    );
  }

  public async removeOrganizationPermission(
    params: MutationRemoveOrganizationPermissionArgs & { hardDelete?: boolean }
  ): Promise<OrganizationPermission> {
    const validatedParams = validateInput(
      removeOrganizationPermissionParamsSchema,
      params,
      'removeOrganizationPermission method'
    );

    const hasPermission = await this.organizationHasPermission(
      validatedParams.input.organizationId,
      validatedParams.input.permissionId
    );

    if (!hasPermission) {
      throw new Error('Organization does not have this permission');
    }

    const isHardDelete = params.hardDelete === true;

    const result = isHardDelete
      ? await this.repositories.organizationPermissionRepository.hardDeleteOrganizationPermission(
          validatedParams.input.organizationId,
          validatedParams.input.permissionId
        )
      : await this.repositories.organizationPermissionRepository.softDeleteOrganizationPermission(
          validatedParams.input.organizationId,
          validatedParams.input.permissionId
        );

    if (!result) {
      throw new Error('Failed to remove organization permission');
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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_organization_permission_mutation',
      };
      await this.logHardDelete(result.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_organization_permission_mutation',
      };
      await this.logSoftDelete(result.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationPermissionSchema),
      result,
      'removeOrganizationPermission method'
    );
  }
}
