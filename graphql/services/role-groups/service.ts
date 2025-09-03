import { RoleGroup, AddRoleGroupInput, RemoveRoleGroupInput } from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { roleGroupsAuditLogs } from '@/graphql/repositories/role-groups/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  addRoleGroupInputSchema,
  queryRoleGroupsArgsSchema,
  removeRoleGroupInputSchema,
  roleGroupSchema,
} from './schemas';

export class RoleGroupService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(roleGroupsAuditLogs, 'roleGroupId', user, db);
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

  private async groupExists(groupId: string): Promise<void> {
    const groups = await this.repositories.groupRepository.getGroups({
      ids: [groupId],
      limit: 1,
    });

    if (groups.groups.length === 0) {
      throw new Error('Group not found');
    }
  }

  private async roleHasGroup(roleId: string, groupId: string): Promise<boolean> {
    await this.roleExists(roleId);
    await this.groupExists(groupId);
    const existingRoleGroups = await this.repositories.roleGroupRepository.getRoleGroups({
      roleId,
    });

    return existingRoleGroups.some((rg) => rg.groupId === groupId);
  }

  public async getRoleGroups(params: { roleId: string }): Promise<RoleGroup[]> {
    const context = 'RoleGroupService.getRoleGroups';
    const validatedParams = validateInput(queryRoleGroupsArgsSchema, params, context);

    const { roleId } = validatedParams;

    await this.roleExists(roleId);

    const result = await this.repositories.roleGroupRepository.getRoleGroups({ roleId });
    return validateOutput(createDynamicSingleSchema(roleGroupSchema).array(), result, context);
  }

  public async addRoleGroup(
    params: AddRoleGroupInput,
    transaction?: Transaction
  ): Promise<RoleGroup> {
    const context = 'RoleGroupService.addRoleGroup';
    const validatedParams = validateInput(addRoleGroupInputSchema, params, context);

    const { roleId, groupId } = validatedParams;

    const hasGroup = await this.roleHasGroup(roleId, groupId);

    if (hasGroup) {
      throw new Error('Role already has this group');
    }

    const roleGroup = await this.repositories.roleGroupRepository.addRoleGroup(
      roleId,
      groupId,
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

    const hasGroup = await this.roleHasGroup(roleId, groupId);

    if (!hasGroup) {
      throw new Error('Role does not have this group');
    }

    const isHardDelete = hardDelete === true;

    const roleGroup = isHardDelete
      ? await this.repositories.roleGroupRepository.hardDeleteRoleGroup(
          roleId,
          groupId,
          transaction
        )
      : await this.repositories.roleGroupRepository.softDeleteRoleGroup(
          roleId,
          groupId,
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
