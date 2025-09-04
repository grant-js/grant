import { AddRoleTagInput, RemoveRoleTagInput, RoleTag } from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { roleTagAuditLogs } from '@/graphql/repositories/role-tags/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  getRoleTagsParamsSchema,
  roleTagSchema,
  addRoleTagInputSchema,
  removeRoleTagInputSchema,
  getRoleTagIntersectionInputSchema,
} from './schemas';

export class RoleTagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(roleTagAuditLogs, 'roleTagId', user, db);
  }

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.repositories.roleRepository.getRoles(
      { ids: [roleId], limit: 1 },
      transaction
    );

    if (roles.roles.length === 0) {
      throw new Error('Role not found');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.repositories.tagRepository.getTags(
      { ids: [tagId], limit: 1 },
      transaction
    );

    if (tags.tags.length === 0) {
      throw new Error('Tag not found');
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
      { roleIds, tagIds },
      transaction
    );
    return validateOutput(roleTagSchema.array(), roleTags, context);
  }

  public async addRoleTag(params: AddRoleTagInput, transaction?: Transaction): Promise<RoleTag> {
    const context = 'RoleTagService.addRoleTag';
    const validatedParams = validateInput(addRoleTagInputSchema, params, context);
    const { roleId, tagId } = validatedParams;

    const hasTag = await this.roleHasTag(roleId, tagId, transaction);

    if (hasTag) {
      throw new Error('Role already has this tag');
    }

    const roleTag = await this.repositories.roleTagRepository.addRoleTag(
      { roleId, tagId },
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

  public async removeRoleTag(
    params: RemoveRoleTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<RoleTag> {
    const context = 'RoleTagService.removeRoleTag';
    const validatedParams = validateInput(removeRoleTagInputSchema, params, context);
    const { roleId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.roleHasTag(roleId, tagId, transaction);

    if (!hasTag) {
      throw new Error('Role does not have this tag');
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
}
