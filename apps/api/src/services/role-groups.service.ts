import {
  AddRoleGroupInput,
  QueryRoleGroupsInput,
  RemoveRoleGroupInput,
  RoleGroup,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addRoleGroupInputSchema,
  queryRoleGroupsArgsSchema,
  removeRoleGroupInputSchema,
  roleGroupSchema,
} from './role-groups.schemas';

import type {
  IAuditLogger,
  IGroupRepository,
  IRoleGroupRepository,
  IRoleGroupService,
  IRoleRepository,
} from '@grantjs/core';

export class RoleGroupService implements IRoleGroupService {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly roleGroupRepository: IRoleGroupRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);

    if (roles.roles.length === 0) {
      throw new NotFoundError('Role');
    }
  }

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.groupRepository.getGroups({ ids: [groupId], limit: 1 }, transaction);

    if (groups.groups.length === 0) {
      throw new NotFoundError('Group');
    }
  }

  private async roleHasGroup(
    roleId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.roleExists(roleId, transaction);
    await this.groupExists(groupId, transaction);
    const existingRoleGroups = await this.roleGroupRepository.getRoleGroups(
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

    const result = await this.roleGroupRepository.getRoleGroups(validatedParams, transaction);
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
      throw new ConflictError('Role already has this group', 'RoleGroup', 'groupId');
    }

    const roleGroup = await this.roleGroupRepository.addRoleGroup({ roleId, groupId }, transaction);

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

    await this.audit.logCreate(roleGroup.id, newValues, metadata, transaction);

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
      throw new NotFoundError('Group');
    }

    const isHardDelete = hardDelete === true;

    const roleGroup = isHardDelete
      ? await this.roleGroupRepository.hardDeleteRoleGroup({ roleId, groupId }, transaction)
      : await this.roleGroupRepository.softDeleteRoleGroup({ roleId, groupId }, transaction);

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
      await this.audit.logHardDelete(roleGroup.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(roleGroup.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(roleGroupSchema), roleGroup, context);
  }
}
