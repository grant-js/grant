import { ORGANIZATION_ROLE_DEFINITIONS } from '@grantjs/constants';
import { GrantAuth } from '@grantjs/core';
import { DbSchema, organizationRolesAuditLogs } from '@grantjs/database';
import {
  AddOrganizationRoleInput,
  OrganizationRole,
  RemoveOrganizationRoleInput,
  Role,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  DeleteParams,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  addOrganizationRoleInputSchema,
  getOrganizationRolesParamsSchema,
  organizationRoleSchema,
  removeOrganizationRoleInputSchema,
} from './organization-roles.schemas';

export class OrganizationRoleService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: GrantAuth | null,
    db: DbSchema
  ) {
    super(organizationRolesAuditLogs, 'organizationRoleId', user, db);
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

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.repositories.roleRepository.getRoles(
      { ids: [roleId], limit: 1 },
      transaction
    );

    if (roles.roles.length === 0) {
      throw new NotFoundError('Role not found', 'errors:notFound.role');
    }
  }

  private async organizationHasRole(
    organizationId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.roleExists(roleId, transaction);
    const existingOrganizationRoles =
      await this.repositories.organizationRoleRepository.getOrganizationRoles(
        { organizationId },
        transaction
      );

    return existingOrganizationRoles.some((or) => or.roleId === roleId);
  }

  public async getOrganizationRoles(
    params: {
      organizationId: string;
    },
    transaction?: Transaction
  ): Promise<OrganizationRole[]> {
    const context = 'OrganizationRoleService.getOrganizationRoles';
    const validatedParams = validateInput(getOrganizationRolesParamsSchema, params, context);
    const { organizationId } = validatedParams;

    await this.organizationExists(organizationId, transaction);

    const result = await this.repositories.organizationRoleRepository.getOrganizationRoles(
      params,
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(organizationRoleSchema).array(),
      result,
      context
    );
  }

  public async addOrganizationRole(
    params: AddOrganizationRoleInput,
    transaction?: Transaction
  ): Promise<OrganizationRole> {
    const context = 'OrganizationRoleService.addOrganizationRole';
    const validatedParams = validateInput(addOrganizationRoleInputSchema, params, context);
    const { organizationId, roleId } = validatedParams;

    const hasRole = await this.organizationHasRole(organizationId, roleId, transaction);

    if (hasRole) {
      throw new ConflictError(
        'Organization already has this role',
        'errors:conflict.duplicateEntry',
        { resource: 'OrganizationRole', field: 'roleId' }
      );
    }

    const organizationRole = await this.repositories.organizationRoleRepository.addOrganizationRole(
      { organizationId, roleId },
      transaction
    );

    const newValues = {
      id: organizationRole.id,
      organizationId: organizationRole.organizationId,
      roleId: organizationRole.roleId,
      createdAt: organizationRole.createdAt,
      updatedAt: organizationRole.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(organizationRole.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(organizationRoleSchema),
      organizationRole,
      context
    );
  }

  public async removeOrganizationRole(
    params: RemoveOrganizationRoleInput & DeleteParams,
    transaction?: Transaction
  ): Promise<OrganizationRole> {
    const context = 'OrganizationRoleService.removeOrganizationRole';
    const validatedParams = validateInput(removeOrganizationRoleInputSchema, params, context);
    const { organizationId, roleId, hardDelete } = validatedParams;

    const hasRole = await this.organizationHasRole(organizationId, roleId, transaction);

    if (!hasRole) {
      throw new NotFoundError('Organization does not have this role', 'errors:notFound.role');
    }

    const isHardDelete = hardDelete === true;

    const organizationRole = isHardDelete
      ? await this.repositories.organizationRoleRepository.hardDeleteOrganizationRole(
          { organizationId, roleId },
          transaction
        )
      : await this.repositories.organizationRoleRepository.softDeleteOrganizationRole(
          { organizationId, roleId },
          transaction
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

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(organizationRole.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(organizationRole.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationRoleSchema),
      organizationRole,
      context
    );
  }

  public async seedOrganizationRoles(
    organizationId: string,
    transaction?: Transaction
  ): Promise<Array<{ role: Role; organizationRole: OrganizationRole }>> {
    const context = 'OrganizationRoleService.seedOrganizationRoles';

    const results = [];

    // Only seed organization-level roles, not account-level roles
    for (const roleData of Object.values(ORGANIZATION_ROLE_DEFINITIONS)) {
      // Check if role already exists
      const existingRoles = await this.repositories.roleRepository.getRoles(
        {
          search: roleData.name,
          limit: 1,
        },
        transaction
      );

      let role = existingRoles.roles.find((r) => r.name === roleData.name);

      // Only create role if it doesn't exist
      if (!role) {
        role = await this.repositories.roleRepository.createRole(
          {
            name: roleData.name,
            description: roleData.description,
          },
          transaction
        );
      }

      // At this point, role is guaranteed to be defined
      const finalRole = role;

      // Check if organization-role relationship already exists
      const existingOrganizationRoles =
        await this.repositories.organizationRoleRepository.getOrganizationRoles(
          { organizationId },
          transaction
        );

      if (!existingOrganizationRoles.some((or) => or.roleId === finalRole.id)) {
        // Only create relationship if it doesn't exist
        const organizationRole =
          await this.repositories.organizationRoleRepository.addOrganizationRole(
            {
              organizationId,
              roleId: finalRole.id,
            },
            transaction
          );

        const newValues = {
          id: organizationRole.id,
          organizationId: organizationRole.organizationId,
          roleId: organizationRole.roleId,
          createdAt: organizationRole.createdAt,
          updatedAt: organizationRole.updatedAt,
        };

        const metadata = {
          context,
          roleName: roleData.name,
          seeded: true,
        };

        await this.logCreate(organizationRole.id, newValues, metadata, transaction);

        results.push({
          role: finalRole,
          organizationRole,
        });
      } else {
        // Use existing relationship
        const existingOrganizationRole = existingOrganizationRoles.find(
          (or) => or.roleId === finalRole.id
        )!;
        results.push({
          role: finalRole,
          organizationRole: existingOrganizationRole,
        });
      }
    }

    return results;
  }
}
