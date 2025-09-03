import {
  AddPermissionTagInput,
  PermissionTag,
  RemovePermissionTagInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { permissionTagAuditLogs } from '@/graphql/repositories/permission-tags/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  getPermissionTagsParamsSchema,
  permissionTagSchema,
  addPermissionTagInputSchema,
  removePermissionTagInputSchema,
  getPermissionTagIntersectionParamsSchema,
} from './schemas';

export class PermissionTagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(permissionTagAuditLogs, 'permissionTagId', user, db);
  }

  private async permissionExists(permissionId: string): Promise<void> {
    const permissions = await this.repositories.permissionRepository.getPermissions({
      ids: [permissionId],
      limit: 1,
    });

    if (permissions.permissions.length === 0) {
      throw new Error('Permission not found');
    }
  }

  private async tagExists(tagId: string): Promise<void> {
    const tags = await this.repositories.tagRepository.getTags({
      ids: [tagId],
      limit: 1,
    });

    if (tags.tags.length === 0) {
      throw new Error('Tag not found');
    }
  }

  private async permissionHasTag(permissionId: string, tagId: string): Promise<boolean> {
    await this.permissionExists(permissionId);
    await this.tagExists(tagId);
    const existingPermissionTags =
      await this.repositories.permissionTagRepository.getPermissionTags({
        permissionId,
      });

    return existingPermissionTags.some((pt) => pt.tagId === tagId);
  }

  public async getPermissionTags(params: { permissionId: string }): Promise<PermissionTag[]> {
    const context = 'PermissionTagService.getPermissionTags';
    const validatedParams = validateInput(getPermissionTagsParamsSchema, params, context);

    const { permissionId } = validatedParams;

    await this.permissionExists(permissionId);

    const result = await this.repositories.permissionTagRepository.getPermissionTags({
      permissionId,
    });

    return validateOutput(createDynamicSingleSchema(permissionTagSchema).array(), result, context);
  }

  public async getPermissionTagIntersection(params: {
    permissionIds: string[];
    tagIds: string[];
  }): Promise<PermissionTag[]> {
    const context = 'PermissionTagService.getPermissionTagIntersection';
    const validatedParams = validateInput(
      getPermissionTagIntersectionParamsSchema,
      params,
      context
    );

    const { permissionIds, tagIds } = validatedParams;

    const result = await this.repositories.permissionTagRepository.getPermissionTagIntersection({
      permissionIds,
      tagIds,
    });

    return validateOutput(createDynamicSingleSchema(permissionTagSchema).array(), result, context);
  }

  public async addPermissionTag(
    params: Omit<AddPermissionTagInput, 'scope'>,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const context = 'PermissionTagService.addPermissionTag';
    const validatedParams = validateInput(addPermissionTagInputSchema, params, context);

    const { permissionId, tagId } = validatedParams;

    const hasTag = await this.permissionHasTag(permissionId, tagId);

    if (hasTag) {
      throw new Error('Permission already has this tag');
    }

    const permissionTag = await this.repositories.permissionTagRepository.addPermissionTag(
      { permissionId, tagId },
      transaction
    );

    const newValues = {
      id: permissionTag.id,
      permissionId: permissionTag.permissionId,
      tagId: permissionTag.tagId,
      createdAt: permissionTag.createdAt,
      updatedAt: permissionTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(permissionTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(permissionTagSchema), permissionTag, context);
  }

  public async removePermissionTag(
    params: Omit<RemovePermissionTagInput, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const context = 'PermissionTagService.removePermissionTag';
    const validatedParams = validateInput(removePermissionTagInputSchema, params, context);

    const { permissionId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.permissionHasTag(permissionId, tagId);

    if (!hasTag) {
      throw new Error('Permission does not have this tag');
    }

    const isHardDelete = hardDelete === true;

    const permissionTag = isHardDelete
      ? await this.repositories.permissionTagRepository.hardDeletePermissionTag(
          validatedParams,
          transaction
        )
      : await this.repositories.permissionTagRepository.softDeletePermissionTag(
          validatedParams,
          transaction
        );

    const oldValues = {
      id: permissionTag.id,
      permissionId: permissionTag.permissionId,
      tagId: permissionTag.tagId,
      createdAt: permissionTag.createdAt,
      updatedAt: permissionTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: permissionTag.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(permissionTag.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(permissionTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(permissionTagSchema), permissionTag, context);
  }
}
