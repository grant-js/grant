import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  QueryOrganizationRolesArgs,
  MutationAddOrganizationRoleArgs,
  MutationRemoveOrganizationRoleArgs,
  OrganizationRole,
} from '@/graphql/generated/types';
import { Repositories } from '@/graphql/repositories';
import { organizationRolesAuditLogs } from '@/graphql/repositories/organization-roles/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IOrganizationRoleService } from './interface';
import {
  getOrganizationRolesParamsSchema,
  addOrganizationRoleParamsSchema,
  removeOrganizationRoleParamsSchema,
  organizationRoleSchema,
} from './schemas';

export class OrganizationRoleService extends AuditService implements IOrganizationRoleService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    private readonly db: PostgresJsDatabase
  ) {
    super(organizationRolesAuditLogs, 'organizationRoleId', user);
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

  private async roleExists(roleId: string): Promise<void> {
    const roles = await this.repositories.roleRepository.getRoles({
      ids: [roleId],
      limit: 1,
    });

    if (roles.roles.length === 0) {
      throw new Error('Role not found');
    }
  }

  private async organizationHasRole(organizationId: string, roleId: string): Promise<boolean> {
    await this.organizationExists(organizationId);
    await this.roleExists(roleId);
    const existingOrganizationRoles =
      await this.repositories.organizationRoleRepository.getOrganizationRoles({
        organizationId,
      });

    return existingOrganizationRoles.some((or) => or.roleId === roleId);
  }

  public async getOrganizationRoles(
    params: QueryOrganizationRolesArgs
  ): Promise<OrganizationRole[]> {
    const validatedParams = validateInput(
      getOrganizationRolesParamsSchema,
      params,
      'getOrganizationRoles method'
    );

    await this.organizationExists(validatedParams.organizationId);

    const result =
      await this.repositories.organizationRoleRepository.getOrganizationRoles(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(organizationRoleSchema).array(),
      result,
      'getOrganizationRoles method'
    );
  }

  public async addOrganizationRole(
    params: MutationAddOrganizationRoleArgs
  ): Promise<OrganizationRole> {
    const validatedParams = validateInput(
      addOrganizationRoleParamsSchema,
      params,
      'addOrganizationRole method'
    );

    const hasRole = await this.organizationHasRole(
      validatedParams.input.organizationId,
      validatedParams.input.roleId
    );

    if (hasRole) {
      throw new Error('Organization already has this role');
    }

    const organizationRole =
      await this.repositories.organizationRoleRepository.addOrganizationRole(validatedParams);

    const newValues = {
      id: organizationRole.id,
      organizationId: organizationRole.organizationId,
      roleId: organizationRole.roleId,
      createdAt: organizationRole.createdAt,
      updatedAt: organizationRole.updatedAt,
    };

    const metadata = {
      source: 'add_organization_role_mutation',
    };

    await this.logCreate(organizationRole.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(organizationRoleSchema),
      organizationRole,
      'addOrganizationRole method'
    );
  }

  public async removeOrganizationRole(
    params: MutationRemoveOrganizationRoleArgs & { hardDelete?: boolean }
  ): Promise<OrganizationRole> {
    const validatedParams = validateInput(
      removeOrganizationRoleParamsSchema,
      params,
      'removeOrganizationRole method'
    );

    const hasRole = await this.organizationHasRole(
      validatedParams.input.organizationId,
      validatedParams.input.roleId
    );

    if (!hasRole) {
      throw new Error('Organization does not have this role');
    }

    const isHardDelete = params.hardDelete === true;

    const organizationRole = isHardDelete
      ? await this.repositories.organizationRoleRepository.hardDeleteOrganizationRole(
          validatedParams
        )
      : await this.repositories.organizationRoleRepository.softDeleteOrganizationRole(
          validatedParams
        );

    const oldValues = {
      id: organizationRole.id,
      organizationId: organizationRole.organizationId,
      roleId: organizationRole.roleId,
      createdAt: organizationRole.createdAt,
      updatedAt: organizationRole.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: organizationRole.deletedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_organization_role_mutation',
      };
      await this.logHardDelete(organizationRole.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_organization_role_mutation',
      };
      await this.logSoftDelete(organizationRole.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationRoleSchema),
      organizationRole,
      'removeOrganizationRole method'
    );
  }
}
