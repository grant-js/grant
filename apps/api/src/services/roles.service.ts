import { ROLES } from '@grantjs/constants';
import { GrantAuth } from '@grantjs/core';
import { DbSchema, roleAuditLogs } from '@grantjs/database';
import {
  CreateRoleInput,
  MutationDeleteRoleArgs,
  QueryRolesArgs,
  Role,
  RolePage,
  UpdateRoleInput,
} from '@grantjs/schema';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  DeleteParams,
  SelectedFields,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  createRoleInputSchema,
  deleteRoleArgsSchema,
  getRolesParamsSchema,
  roleSchema,
  updateRoleArgsSchema,
} from './roles.schemas';

export class RoleService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(roleAuditLogs, 'roleId', user, db);
  }

  private getCorePlatformRoleNames(): string[] {
    return Object.values(ROLES).map((role) => role.name);
  }

  private validateRoleNameNotReserved(roleName: string): void {
    const coreRoleNames = this.getCorePlatformRoleNames();
    if (coreRoleNames.includes(roleName)) {
      throw new BadRequestError(
        `Role name '${roleName}' is reserved for core platform roles and cannot be used`,
        'errors:validation.reservedRoleName',
        {
          roleName,
        }
      );
    }
  }

  private async getRole(roleId: string): Promise<Role> {
    const existingRoles = await this.repositories.roleRepository.getRoles({
      ids: [roleId],
      limit: 1,
    });

    if (existingRoles.roles.length === 0) {
      throw new NotFoundError('Role not found', 'errors:notFound.role');
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

    this.validateRoleNameNotReserved(validatedParams.name);

    const role = await this.repositories.roleRepository.createRole(validatedParams, transaction);

    const newValues = {
      id: role.id,
      name: role.name,
      description: role.description,
      metadata: role.metadata,
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
    id: string,
    input: UpdateRoleInput,
    transaction?: Transaction
  ): Promise<Role> {
    const context = 'RoleService.updateRole';
    validateInput(updateRoleArgsSchema, { id, input }, context);

    if (input.name) {
      this.validateRoleNameNotReserved(input.name);
    }

    const oldRole = await this.getRole(id);
    const updatedRole = await this.repositories.roleRepository.updateRole(id, input, transaction);

    const oldValues = {
      id: oldRole.id,
      name: oldRole.name,
      description: oldRole.description,
      metadata: oldRole.metadata,
      createdAt: oldRole.createdAt,
      updatedAt: oldRole.updatedAt,
    };

    const newValues = {
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      metadata: updatedRole.metadata,
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
