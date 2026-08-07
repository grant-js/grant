import { ROLES } from '@grantjs/constants';
import type { IAuditLogger, IEventPublisher, IRoleRepository, IRoleService } from '@grantjs/core';
import {
  CreateRoleInput,
  MutationDeleteRoleArgs,
  QueryRolesArgs,
  Role,
  RolePage,
  UpdateRoleInput,
} from '@grantjs/schema';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { buildDelta } from '@/lib/events';
import { buildSearchDocument } from '@/lib/search-document.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import {
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
  validatePage,
} from './common';
import {
  createRoleInputSchema,
  deleteRoleArgsSchema,
  getRolesParamsSchema,
  roleSchema,
  updateRoleArgsSchema,
} from './roles.schemas';

export class RoleService implements IRoleService {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher
  ) {}

  private getCorePlatformRoleNames(): string[] {
    return Object.values(ROLES).map((role) => role.name);
  }

  private validateRoleNameNotReserved(roleName: string): void {
    const coreRoleNames = this.getCorePlatformRoleNames();
    if (coreRoleNames.includes(roleName)) {
      throw new BadRequestError(
        `Role name '${roleName}' is reserved for core platform roles and cannot be used`
      );
    }
  }

  private async getRole(roleId: string): Promise<Role> {
    const existingRoles = await this.roleRepository.getRoles({
      ids: [roleId],
      limit: 1,
    });

    if (existingRoles.roles.length === 0) {
      throw new NotFoundError('Role');
    }

    return existingRoles.roles[0];
  }

  public async getRoleById(id: string, _transaction?: Transaction): Promise<Role | null> {
    try {
      return await this.getRole(id);
    } catch {
      return null;
    }
  }

  public async getRoles(
    params: Omit<QueryRolesArgs, 'scope' | 'tagIds'> & SelectedFields<Role>
  ): Promise<RolePage> {
    const context = 'RoleService.getRoles';
    validateInput(getRolesParamsSchema, params, context);
    const result = await this.roleRepository.getRoles(params);

    validatePage(
      createDynamicPaginatedSchema(roleSchema, params.requestedFields),
      result.roles,
      result,
      context
    );

    return result;
  }

  public async createRole(
    params: Omit<CreateRoleInput, 'scope' | 'tagIds' | 'groupIds'> & { searchDocument?: string },
    transaction?: Transaction
  ): Promise<Role> {
    const context = 'RoleService.createRole';
    const { searchDocument: providedSearchDocument, ...rest } = params;
    const validatedParams = validateInput(createRoleInputSchema, rest, context);

    this.validateRoleNameNotReserved(validatedParams.name);

    const searchDocument =
      providedSearchDocument ??
      buildSearchDocument({
        kind: 'role',
        name: validatedParams.name,
        description: validatedParams.description,
        metadata: validatedParams.metadata as Record<string, unknown> | undefined,
      });

    const role = await this.roleRepository.createRole(
      { ...validatedParams, searchDocument },
      transaction
    );

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

    await this.audit.logCreate(role.id, newValues, metadata, transaction);

    await this.events.publish(
      {
        type: 'role.created',
        aggregate: { kind: 'role', id: role.id },
        data: { after: newValues },
      },
      transaction
    );

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
    const updatedRole = await this.roleRepository.updateRole(id, input, transaction);

    const searchDocument = buildSearchDocument({
      kind: 'role',
      name: updatedRole.name,
      description: updatedRole.description,
      metadata: updatedRole.metadata as Record<string, unknown>,
    });
    const roleWithSearch =
      searchDocument !== (updatedRole as Role & { searchDocument?: string }).searchDocument
        ? await this.roleRepository.updateRole(
            id,
            { searchDocument } as unknown as UpdateRoleInput,
            transaction
          )
        : updatedRole;

    const oldValues = {
      id: oldRole.id,
      name: oldRole.name,
      description: oldRole.description,
      metadata: oldRole.metadata,
      createdAt: oldRole.createdAt,
      updatedAt: oldRole.updatedAt,
    };

    const newValues = {
      id: roleWithSearch.id,
      name: roleWithSearch.name,
      description: roleWithSearch.description,
      metadata: roleWithSearch.metadata,
      createdAt: roleWithSearch.createdAt,
      updatedAt: roleWithSearch.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logUpdate(updatedRole.id, oldValues, newValues, metadata, transaction);

    await this.events.publish(
      {
        type: 'role.updated',
        aggregate: { kind: 'role', id: roleWithSearch.id },
        data: { before: oldValues, after: newValues, delta: buildDelta(oldValues, newValues) },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(roleSchema), roleWithSearch, context);
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
      ? await this.roleRepository.hardDeleteRole({ id }, transaction)
      : await this.roleRepository.softDeleteRole({ id }, transaction);

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
      await this.audit.logHardDelete(deletedRole.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedRole.deletedAt,
      };

      await this.audit.logSoftDelete(deletedRole.id, oldValues, newValues, metadata, transaction);
    }

    await this.events.publish(
      {
        type: 'role.deleted',
        aggregate: { kind: 'role', id: deletedRole.id },
        data: { before: oldValues },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(roleSchema), deletedRole, context);
  }
}
