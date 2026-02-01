import { GrantAuth } from '@grantjs/core';
import { DbSchema, roleTagAuditLogs } from '@grantjs/database';
import { AddRoleTagInput, RemoveRoleTagInput, RoleTag, UpdateRoleTagInput } from '@grantjs/schema';

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
  addRoleTagInputSchema,
  getRoleTagIntersectionInputSchema,
  getRoleTagsParamsSchema,
  removeRoleTagInputSchema,
  removeRoleTagsInputSchema,
  roleTagSchema,
  updateRoleTagInputSchema,
} from './role-tags.schemas';

export class RoleTagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(roleTagAuditLogs, 'roleTagId', user, db);
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

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.repositories.tagRepository.getTags(
      { ids: [tagId], limit: 1 },
      transaction
    );

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag not found', 'errors:notFound.tag');
    }
  }

  private async roleHasTag(
    roleId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.roleExists(roleId, transaction);
    await this.tagExists(tagId, transaction);
    const existingRoleTags = await this.repositories.roleTagRepository.getRoleTags(
      { roleId },
      transaction
    );

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

    const result = await this.repositories.roleTagRepository.getRoleTags(params, transaction);
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

    const roleTags = await this.repositories.roleTagRepository.getRoleTagIntersection(
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
      throw new ConflictError('Role already has this tag', 'errors:conflict.duplicateEntry', {
        resource: 'RoleTag',
        field: 'tagId',
      });
    }

    const roleTag = await this.repositories.roleTagRepository.addRoleTag(
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

    await this.logCreate(roleTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(roleTagSchema), roleTag, context);
  }

  public async updateRoleTag(
    params: UpdateRoleTagInput,
    transaction?: Transaction
  ): Promise<RoleTag> {
    const context = 'RoleTagService.updateRoleTag';
    const validatedParams = validateInput(updateRoleTagInputSchema, params, context);
    const { roleId, tagId, isPrimary } = validatedParams;

    const roleTag = await this.repositories.roleTagRepository.getRoleTag(
      { roleId, tagId },
      transaction
    );

    const updatedRoleTag = await this.repositories.roleTagRepository.updateRoleTag(
      { roleId, tagId, isPrimary },
      transaction
    );

    const metadata = {
      context,
    };

    await this.logUpdate(updatedRoleTag.id, roleTag, updatedRoleTag, metadata, transaction);

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
      throw new NotFoundError('Role does not have this tag', 'errors:notFound.tag');
    }

    const isHardDelete = hardDelete === true;

    const roleTag = isHardDelete
      ? await this.repositories.roleTagRepository.hardDeleteRoleTag(validatedParams, transaction)
      : await this.repositories.roleTagRepository.softDeleteRoleTag(validatedParams, transaction);

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
      await this.logHardDelete(roleTag.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(roleTag.id, oldValues, newValues, metadata, transaction);
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

    const roleTags = await this.repositories.roleTagRepository.getRoleTags({ tagId }, transaction);

    const isHardDelete = hardDelete === true;

    const deletedRoleTags = await Promise.all(
      roleTags.map((roleTag) =>
        isHardDelete
          ? this.repositories.roleTagRepository.hardDeleteRoleTag(roleTag, transaction)
          : this.repositories.roleTagRepository.softDeleteRoleTag(roleTag, transaction)
      )
    );

    return validateOutput(
      createDynamicSingleSchema(roleTagSchema).array(),
      deletedRoleTags,
      context
    );
  }
}
