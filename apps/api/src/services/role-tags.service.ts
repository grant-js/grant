import { AddRoleTagInput, RemoveRoleTagInput, RoleTag, UpdateRoleTagInput } from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addRoleTagInputSchema,
  getRoleTagIntersectionInputSchema,
  getRoleTagsParamsSchema,
  removeRoleTagInputSchema,
  removeRoleTagsInputSchema,
  roleTagSchema,
  updateRoleTagInputSchema,
} from './role-tags.schemas';

import type {
  IAuditLogger,
  IRoleRepository,
  IRoleTagRepository,
  IRoleTagService,
  ITagRepository,
} from '@grantjs/core';

export class RoleTagService implements IRoleTagService {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly tagRepository: ITagRepository,
    private readonly roleTagRepository: IRoleTagRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);

    if (roles.roles.length === 0) {
      throw new NotFoundError('Role');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.tagRepository.getTags({ ids: [tagId], limit: 1 }, transaction);

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag');
    }
  }

  private async roleHasTag(
    roleId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.roleExists(roleId, transaction);
    await this.tagExists(tagId, transaction);
    const existingRoleTags = await this.roleTagRepository.getRoleTags({ roleId }, transaction);

    return existingRoleTags.some((rt) => rt.tagId === tagId);
  }

  public async getRoleTags(
    params: { roleId: string },
    transaction?: Transaction
  ): Promise<RoleTag[]> {
    const context = 'RoleTagService.getRoleTags';
    const validatedParams = validateInput(getRoleTagsParamsSchema, params, context);
    const { roleId } = validatedParams;

    await this.roleExists(roleId, transaction);

    const result = await this.roleTagRepository.getRoleTags(params, transaction);
    return validateOutput(createDynamicSingleSchema(roleTagSchema).array(), result, context);
  }

  public async getRoleTagIntersection(
    params: {
      roleIds: string[];
      tagIds: string[];
    },
    transaction?: Transaction
  ): Promise<RoleTag[]> {
    const context = 'RoleTagService.getRoleTagIntersection';
    const validatedParams = validateInput(getRoleTagIntersectionInputSchema, params, context);
    const { roleIds, tagIds } = validatedParams;

    const roleTags = await this.roleTagRepository.getRoleTagIntersection(
      roleIds,
      tagIds,
      transaction
    );
    return validateOutput(roleTagSchema.array(), roleTags, context);
  }

  public async addRoleTag(params: AddRoleTagInput, transaction?: Transaction): Promise<RoleTag> {
    const context = 'RoleTagService.addRoleTag';
    const validatedParams = validateInput(addRoleTagInputSchema, params, context);
    const { roleId, tagId, isPrimary } = validatedParams;

    const hasTag = await this.roleHasTag(roleId, tagId, transaction);

    if (hasTag) {
      throw new ConflictError('Role already has this tag', 'RoleTag', 'tagId');
    }

    const roleTag = await this.roleTagRepository.addRoleTag(
      { roleId, tagId, isPrimary },
      transaction
    );

    const newValues = {
      id: roleTag.id,
      roleId: roleTag.roleId,
      tagId: roleTag.tagId,
      createdAt: roleTag.createdAt,
      updatedAt: roleTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(roleTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(roleTagSchema), roleTag, context);
  }

  public async updateRoleTag(
    params: UpdateRoleTagInput,
    transaction?: Transaction
  ): Promise<RoleTag> {
    const context = 'RoleTagService.updateRoleTag';
    const validatedParams = validateInput(updateRoleTagInputSchema, params, context);
    const { roleId, tagId, isPrimary } = validatedParams;

    const roleTag = await this.roleTagRepository.getRoleTag({ roleId, tagId }, transaction);

    const updatedRoleTag = await this.roleTagRepository.updateRoleTag(
      { roleId, tagId, isPrimary },
      transaction
    );

    const metadata = {
      context,
    };

    await this.audit.logUpdate(updatedRoleTag.id, roleTag, updatedRoleTag, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(roleTagSchema), updatedRoleTag, context);
  }

  public async removeRoleTag(
    params: RemoveRoleTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<RoleTag> {
    const context = 'RoleTagService.removeRoleTag';
    const validatedParams = validateInput(removeRoleTagInputSchema, params, context);
    const { roleId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.roleHasTag(roleId, tagId, transaction);

    if (!hasTag) {
      throw new NotFoundError('Tag');
    }

    const isHardDelete = hardDelete === true;

    const roleTag = isHardDelete
      ? await this.roleTagRepository.hardDeleteRoleTag(validatedParams, transaction)
      : await this.roleTagRepository.softDeleteRoleTag(validatedParams, transaction);

    const oldValues = {
      id: roleTag.id,
      roleId: roleTag.roleId,
      tagId: roleTag.tagId,
      createdAt: roleTag.createdAt,
      updatedAt: roleTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: roleTag.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(roleTag.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(roleTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(roleTagSchema), roleTag, context);
  }

  public async removeRoleTags(
    params: { tagId: string } & DeleteParams,
    transaction?: Transaction
  ): Promise<RoleTag[]> {
    const context = 'RoleTagService.removeRoleTags';
    const validatedParams = validateInput(removeRoleTagsInputSchema, params, context);
    const { tagId, hardDelete } = validatedParams;

    const roleTags = await this.roleTagRepository.getRoleTags({ tagId }, transaction);

    const isHardDelete = hardDelete === true;

    const deletedRoleTags = await Promise.all(
      roleTags.map((roleTag) =>
        isHardDelete
          ? this.roleTagRepository.hardDeleteRoleTag(roleTag, transaction)
          : this.roleTagRepository.softDeleteRoleTag(roleTag, transaction)
      )
    );

    return validateOutput(
      createDynamicSingleSchema(roleTagSchema).array(),
      deletedRoleTags,
      context
    );
  }
}
