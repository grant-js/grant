import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  MutationAddRoleGroupArgs,
  MutationRemoveRoleGroupArgs,
  RoleGroup,
  QueryRoleGroupsArgs,
} from '@/graphql/generated/types';
import { Repositories } from '@/graphql/repositories';
import { roleGroupsAuditLogs } from '@/graphql/repositories/role-groups/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IRoleGroupService } from './interface';
import {
  getRoleGroupsParamsSchema,
  addRoleGroupParamsSchema,
  removeRoleGroupParamsSchema,
  roleGroupSchema,
} from './schemas';

export class RoleGroupService extends AuditService implements IRoleGroupService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    private readonly db: PostgresJsDatabase
  ) {
    super(roleGroupsAuditLogs, 'roleGroupId', user);
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

  public async getRoleGroups(params: Omit<QueryRoleGroupsArgs, 'scope'>): Promise<RoleGroup[]> {
    const validatedParams = validateInput(
      getRoleGroupsParamsSchema,
      params,
      'getRoleGroups method'
    );

    await this.roleExists(validatedParams.roleId);

    const result = await this.repositories.roleGroupRepository.getRoleGroups(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(roleGroupSchema).array(),
      result,
      'getRoleGroups method'
    );
  }

  public async addRoleGroup(params: MutationAddRoleGroupArgs): Promise<RoleGroup> {
    const validatedParams = validateInput(addRoleGroupParamsSchema, params, 'addRoleGroup method');

    const hasGroup = await this.roleHasGroup(
      validatedParams.input.roleId,
      validatedParams.input.groupId
    );

    if (hasGroup) {
      throw new Error('Role already has this group');
    }

    const roleGroup = await this.repositories.roleGroupRepository.addRoleGroup(
      validatedParams.input.roleId,
      validatedParams.input.groupId
    );

    const newValues = {
      id: roleGroup.id,
      roleId: roleGroup.roleId,
      groupId: roleGroup.groupId,
      createdAt: roleGroup.createdAt,
      updatedAt: roleGroup.updatedAt,
    };

    const metadata = {
      source: 'add_role_group_mutation',
    };

    await this.logCreate(roleGroup.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(roleGroupSchema),
      roleGroup,
      'addRoleGroup method'
    );
  }

  public async removeRoleGroup(
    params: MutationRemoveRoleGroupArgs & { hardDelete?: boolean }
  ): Promise<RoleGroup> {
    const validatedParams = validateInput(
      removeRoleGroupParamsSchema,
      params,
      'removeRoleGroup method'
    );

    const hasGroup = await this.roleHasGroup(
      validatedParams.input.roleId,
      validatedParams.input.groupId
    );

    if (!hasGroup) {
      throw new Error('Role does not have this group');
    }

    const isHardDelete = params.hardDelete === true;

    const roleGroup = isHardDelete
      ? await this.repositories.roleGroupRepository.hardDeleteRoleGroup(
          validatedParams.input.roleId,
          validatedParams.input.groupId
        )
      : await this.repositories.roleGroupRepository.softDeleteRoleGroup(
          validatedParams.input.roleId,
          validatedParams.input.groupId
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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_role_group_mutation',
      };
      await this.logHardDelete(roleGroup.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'remove_role_group_mutation',
      };
      await this.logSoftDelete(roleGroup.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(roleGroupSchema),
      roleGroup,
      'removeRoleGroup method'
    );
  }
}
