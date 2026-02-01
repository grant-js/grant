import { GrantAuth } from '@grantjs/core';
import { DbSchema, roleGroupsAuditLogs } from '@grantjs/database';
import {
  AddRoleGroupInput,
  QueryRoleGroupsInput,
  RemoveRoleGroupInput,
  RoleGroup,
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
  addRoleGroupInputSchema,
  queryRoleGroupsArgsSchema,
  removeRoleGroupInputSchema,
  roleGroupSchema,
} from './role-groups.schemas';

export class RoleGroupService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(roleGroupsAuditLogs, 'roleGroupId', user, db);
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

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.repositories.groupRepository.getGroups(
      { ids: [groupId], limit: 1 },
      transaction
    );

    if (groups.groups.length === 0) {
      throw new NotFoundError('Group not found', 'errors:notFound.group');
    }
  }

  private async roleHasGroup(
    roleId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.roleExists(roleId, transaction);
    await this.groupExists(groupId, transaction);
    const existingRoleGroups = await this.repositories.roleGroupRepository.getRoleGroups(
      { roleId },
      transaction
    );

    return existingRoleGroups.some((rg) => rg.groupId === groupId);
  }

  public async getRoleGroups(
    params: QueryRoleGroupsInput,
    transaction?: Transaction
  ): Promise<RoleGroup[]> {
    const context = 'RoleGroupService.getRoleGroups';
    const validatedParams = validateInput(queryRoleGroupsArgsSchema, params, context);

    const { roleId, groupId } = validatedParams;

    if (roleId) {
      await this.roleExists(roleId, transaction);
    }
    if (groupId) {
      await this.groupExists(groupId, transaction);
    }

    const result = await this.repositories.roleGroupRepository.getRoleGroups(
      validatedParams,
      transaction
    );
    return validateOutput(createDynamicSingleSchema(roleGroupSchema).array(), result, context);
  }

  public async addRoleGroup(
    params: AddRoleGroupInput,
    transaction?: Transaction
  ): Promise<RoleGroup> {
    const context = 'RoleGroupService.addRoleGroup';
    const validatedParams = validateInput(addRoleGroupInputSchema, params, context);

    const { roleId, groupId } = validatedParams;

    const hasGroup = await this.roleHasGroup(roleId, groupId, transaction);

    if (hasGroup) {
      throw new ConflictError('Role already has this group', 'errors:conflict.duplicateEntry', {
        resource: 'RoleGroup',
        field: 'groupId',
      });
    }

    const roleGroup = await this.repositories.roleGroupRepository.addRoleGroup(
      { roleId, groupId },
      transaction
    );

    const newValues = {
      id: roleGroup.id,
      roleId: roleGroup.roleId,
      groupId: roleGroup.groupId,
      createdAt: roleGroup.createdAt,
      updatedAt: roleGroup.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(roleGroup.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(roleGroupSchema), roleGroup, context);
  }

  public async removeRoleGroup(
    params: RemoveRoleGroupInput & DeleteParams,
    transaction?: Transaction
  ): Promise<RoleGroup> {
    const context = 'RoleGroupService.removeRoleGroup';
    const validatedParams = validateInput(removeRoleGroupInputSchema, params, context);

    const { roleId, groupId, hardDelete } = validatedParams;

    const hasGroup = await this.roleHasGroup(roleId, groupId, transaction);

    if (!hasGroup) {
      throw new NotFoundError('Role does not have this group', 'errors:notFound.group');
    }

    const isHardDelete = hardDelete === true;

    const roleGroup = isHardDelete
      ? await this.repositories.roleGroupRepository.hardDeleteRoleGroup(
          { roleId, groupId },
          transaction
        )
      : await this.repositories.roleGroupRepository.softDeleteRoleGroup(
          { roleId, groupId },
          transaction
        );

    const oldValues = {
      id: roleGroup.id,
      roleId: roleGroup.roleId,
      groupId: roleGroup.groupId,
      createdAt: roleGroup.createdAt,
      updatedAt: roleGroup.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: roleGroup.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(roleGroup.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(roleGroup.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(roleGroupSchema), roleGroup, context);
  }
}
