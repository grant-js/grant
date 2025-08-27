import {
  QueryRolesArgs,
  MutationCreateRoleArgs,
  MutationUpdateRoleArgs,
  MutationDeleteRoleArgs,
  Role,
  RolePage,
} from '@/graphql/generated/types';
import { IRoleRepository } from '@/graphql/repositories/roles/interface';
import { roleAuditLogs } from '@/graphql/repositories/roles/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, paginatedResponseSchema } from '../common';

import { IRoleService } from './interface';
import {
  getRolesParamsSchema,
  createRoleParamsSchema,
  updateRoleParamsSchema,
  deleteRoleParamsSchema,
  roleSchema,
} from './schemas';

export class RoleService extends AuditService implements IRoleService {
  constructor(
    private readonly roleRepository: IRoleRepository,
    user: AuthenticatedUser | null
  ) {
    super(roleAuditLogs, 'roleId', user);
  }

  private async getRole(roleId: string): Promise<Role> {
    const existingRoles = await this.roleRepository.getRoles({
      ids: [roleId],
      limit: 1,
    });

    if (existingRoles.roles.length === 0) {
      throw new Error('Role not found');
    }

    return existingRoles.roles[0];
  }

  public async getRoles(
    params: Omit<QueryRolesArgs, 'scope'> & { requestedFields?: string[] }
  ): Promise<RolePage> {
    const validatedParams = validateInput(getRolesParamsSchema, params, 'getRoles method');
    const result = await this.roleRepository.getRoles(validatedParams as any);

    // Transform repository result to standard format for validation
    const transformedResult = {
      items: result.roles,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    const validatedResult = validateOutput(
      paginatedResponseSchema(roleSchema),
      transformedResult,
      'getRoles method'
    ) as any;

    return {
      roles: validatedResult.items,
      hasNextPage: validatedResult.hasNextPage,
      totalCount: validatedResult.totalCount,
    };
  }

  public async createRole(params: MutationCreateRoleArgs): Promise<Role> {
    const validatedParams = validateInput(createRoleParamsSchema, params, 'createRole method');
    const role = await this.roleRepository.createRole(validatedParams);

    const newValues = {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };

    const metadata = {
      source: 'create_role_mutation',
    };

    await this.logCreate(role.id, newValues, metadata);

    return validateOutput(roleSchema, role, 'createRole method');
  }

  public async updateRole(params: MutationUpdateRoleArgs): Promise<Role> {
    const validatedParams = validateInput(updateRoleParamsSchema, params, 'updateRole method');

    const oldRole = await this.getRole(validatedParams.id);
    const updatedRole = await this.roleRepository.updateRole(validatedParams);

    const oldValues = {
      id: oldRole.id,
      name: oldRole.name,
      description: oldRole.description,
      createdAt: oldRole.createdAt,
      updatedAt: oldRole.updatedAt,
    };

    const newValues = {
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      createdAt: updatedRole.createdAt,
      updatedAt: updatedRole.updatedAt,
    };

    const metadata = {
      source: 'update_role_mutation',
    };

    await this.logUpdate(updatedRole.id, oldValues, newValues, metadata);

    return validateOutput(roleSchema, updatedRole, 'updateRole method');
  }

  public async deleteRole(
    params: MutationDeleteRoleArgs & { hardDelete?: boolean }
  ): Promise<Role> {
    const validatedParams = validateInput(deleteRoleParamsSchema, params, 'deleteRole method');

    const oldRole = await this.getRole(validatedParams.id);
    const isHardDelete = params.hardDelete === true;

    const deletedRole = isHardDelete
      ? await this.roleRepository.hardDeleteRole(validatedParams)
      : await this.roleRepository.softDeleteRole(validatedParams);

    const oldValues = {
      id: oldRole.id,
      name: oldRole.name,
      description: oldRole.description,
      createdAt: oldRole.createdAt,
      updatedAt: oldRole.updatedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_role_mutation',
      };
      await this.logHardDelete(deletedRole.id, oldValues, metadata);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedRole.deletedAt,
      };

      const metadata = {
        source: 'soft_delete_role_mutation',
      };
      await this.logSoftDelete(deletedRole.id, oldValues, newValues, metadata);
    }

    return validateOutput(roleSchema, deletedRole, 'deleteRole method');
  }
}
