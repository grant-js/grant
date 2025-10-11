import { DbSchema } from '@logusgraphics/grant-database';
import { roleAuditLogs } from '@logusgraphics/grant-database';
import {
  QueryRolesArgs,
  MutationUpdateRoleArgs,
  MutationDeleteRoleArgs,
  Role,
  RolePage,
  CreateRoleInput,
} from '@logusgraphics/grant-schema';

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
  getRolesParamsSchema,
  roleSchema,
  createRoleInputSchema,
  updateRoleArgsSchema,
  deleteRoleArgsSchema,
} from './roles.schemas';

import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

export class RoleService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(roleAuditLogs, 'roleId', user, db);
  }

  private async getRole(roleId: string): Promise<Role> {
    const existingRoles = await this.repositories.roleRepository.getRoles({
      ids: [roleId],
      limit: 1,
    });

    if (existingRoles.roles.length === 0) {
      throw new Error('Role not found');
    }

    return existingRoles.roles[0];
  }

  public async getRoles(
    params: Omit<QueryRolesArgs, 'scope' | 'tagIds'> & SelectedFields<Role>
  ): Promise<RolePage> {
    const context = 'RoleService.getRoles';
    validateInput(getRolesParamsSchema, params, context);
    const result = await this.repositories.roleRepository.getRoles(params);

    const transformedResult = {
      items: result.roles,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    validateOutput(
      createDynamicPaginatedSchema(roleSchema, params.requestedFields),
      transformedResult,
      context
    );

    return result;
  }

  public async createRole(
    params: Omit<CreateRoleInput, 'scope' | 'tagIds' | 'groupIds'>,
    transaction?: Transaction
  ): Promise<Role> {
    const context = 'RoleService.createRole';
    const validatedParams = validateInput(createRoleInputSchema, params, context);
    const role = await this.repositories.roleRepository.createRole(validatedParams, transaction);

    const newValues = {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(role.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(roleSchema), role, context);
  }

  public async updateRole(
    params: MutationUpdateRoleArgs,
    transaction?: Transaction
  ): Promise<Role> {
    const context = 'RoleService.updateRole';
    const validatedParams = validateInput(updateRoleArgsSchema, params, context);

    const oldRole = await this.getRole(validatedParams.id);
    const updatedRole = await this.repositories.roleRepository.updateRole(
      validatedParams,
      transaction
    );

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
      context,
    };

    await this.logUpdate(updatedRole.id, oldValues, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(roleSchema), updatedRole, context);
  }

  public async deleteRole(
    params: Omit<MutationDeleteRoleArgs, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<Role> {
    const context = 'RoleService.deleteRole';
    const validatedParams = validateInput(deleteRoleArgsSchema, params, context);
    const { id, hardDelete } = validatedParams;

    const oldRole = await this.getRole(id);
    const isHardDelete = hardDelete === true;

    const deletedRole = isHardDelete
      ? await this.repositories.roleRepository.hardDeleteRole({ id }, transaction)
      : await this.repositories.roleRepository.softDeleteRole({ id }, transaction);

    const oldValues = {
      id: oldRole.id,
      name: oldRole.name,
      description: oldRole.description,
      createdAt: oldRole.createdAt,
      updatedAt: oldRole.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(deletedRole.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedRole.deletedAt,
      };

      await this.logSoftDelete(deletedRole.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(roleSchema), deletedRole, context);
  }
}
