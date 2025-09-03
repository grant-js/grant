import {
  AddOrganizationRoleInput,
  OrganizationRole,
  RemoveOrganizationRoleInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { organizationRolesAuditLogs } from '@/graphql/repositories/organization-roles/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  getOrganizationRolesParamsSchema,
  organizationRoleSchema,
  addOrganizationRoleInputSchema,
  removeOrganizationRoleInputSchema,
} from './schemas';

export class OrganizationRoleService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(organizationRolesAuditLogs, 'organizationRoleId', user, db);
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

  public async getOrganizationRoles(params: {
    organizationId: string;
  }): Promise<OrganizationRole[]> {
    const context = 'OrganizationRoleService.getOrganizationRoles';
    const validatedParams = validateInput(getOrganizationRolesParamsSchema, params, context);
    const { organizationId } = validatedParams;

    await this.organizationExists(organizationId);

    const result = await this.repositories.organizationRoleRepository.getOrganizationRoles(params);
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

    const hasRole = await this.organizationHasRole(organizationId, roleId);

    if (hasRole) {
      throw new Error('Organization already has this role');
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

    const hasRole = await this.organizationHasRole(organizationId, roleId);

    if (!hasRole) {
      throw new Error('Organization does not have this role');
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
}
