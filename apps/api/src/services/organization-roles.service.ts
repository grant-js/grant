import { ORGANIZATION_ROLE_DEFINITIONS } from '@grantjs/constants';
import {
  AddOrganizationRoleInput,
  OrganizationRole,
  RemoveOrganizationRoleInput,
  Role,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addOrganizationRoleInputSchema,
  getOrganizationRolesParamsSchema,
  organizationRoleSchema,
  removeOrganizationRoleInputSchema,
} from './organization-roles.schemas';

import type {
  IAuditLogger,
  IOrganizationRepository,
  IOrganizationRoleRepository,
  IOrganizationRoleService,
  IRoleRepository,
} from '@grantjs/core';

export class OrganizationRoleService implements IOrganizationRoleService {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly organizationRoleRepository: IOrganizationRoleRepository,
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

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);

    if (roles.roles.length === 0) {
      throw new NotFoundError('Role');
    }
  }

  private async organizationHasRole(
    organizationId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.roleExists(roleId, transaction);
    const existingOrganizationRoles = await this.organizationRoleRepository.getOrganizationRoles(
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

    const result = await this.organizationRoleRepository.getOrganizationRoles(params, transaction);
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
      throw new ConflictError('Organization already has this role', 'OrganizationRole', 'roleId');
    }

    const organizationRole = await this.organizationRoleRepository.addOrganizationRole(
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

    await this.audit.logCreate(organizationRole.id, newValues, metadata, transaction);

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
      throw new NotFoundError('Role');
    }

    const isHardDelete = hardDelete === true;

    const organizationRole = isHardDelete
      ? await this.organizationRoleRepository.hardDeleteOrganizationRole(
          { organizationId, roleId },
          transaction
        )
      : await this.organizationRoleRepository.softDeleteOrganizationRole(
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
      await this.audit.logHardDelete(organizationRole.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        organizationRole.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
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
      const existingRoles = await this.roleRepository.getRoles(
        {
          search: roleData.name,
          limit: 1,
        },
        transaction
      );

      let role = existingRoles.roles.find((r) => r.name === roleData.name);

      // Only create role if it doesn't exist
      if (!role) {
        role = await this.roleRepository.createRole(
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
      const existingOrganizationRoles = await this.organizationRoleRepository.getOrganizationRoles(
        { organizationId },
        transaction
      );

      if (!existingOrganizationRoles.some((or) => or.roleId === finalRole.id)) {
        // Only create relationship if it doesn't exist
        const organizationRole = await this.organizationRoleRepository.addOrganizationRole(
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

        await this.audit.logCreate(organizationRole.id, newValues, metadata, transaction);

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
