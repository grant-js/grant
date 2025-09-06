import {
  AddPermissionTagInput,
  PermissionTag,
  RemovePermissionTagInput,
  UpdatePermissionTagInput,
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
  removePermissionTagsInputSchema,
  updatePermissionTagInputSchema,
} from './schemas';

export class PermissionTagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(permissionTagAuditLogs, 'permissionTagId', user, db);
  }

  private async permissionExists(permissionId: string, transaction?: Transaction): Promise<void> {
    const permissions = await this.repositories.permissionRepository.getPermissions(
      { ids: [permissionId], limit: 1 },
      transaction
    );

    if (permissions.permissions.length === 0) {
      throw new Error('Permission not found');
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

  private async permissionHasTag(
    permissionId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.permissionExists(permissionId, transaction);
    await this.tagExists(tagId, transaction);
    const existingPermissionTags =
      await this.repositories.permissionTagRepository.getPermissionTags(
        { permissionId },
        transaction
      );

    return existingPermissionTags.some((pt) => pt.tagId === tagId);
  }

  public async getPermissionTags(
    params: { permissionId: string },
    transaction?: Transaction
  ): Promise<PermissionTag[]> {
    const context = 'PermissionTagService.getPermissionTags';
    const validatedParams = validateInput(getPermissionTagsParamsSchema, params, context);

    const { permissionId } = validatedParams;

    await this.permissionExists(permissionId, transaction);

    const result = await this.repositories.permissionTagRepository.getPermissionTags(
      { permissionId },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(permissionTagSchema).array(), result, context);
  }

  public async getPermissionTagIntersection(
    params: {
      permissionIds: string[];
      tagIds: string[];
    },
    transaction?: Transaction
  ): Promise<PermissionTag[]> {
    const context = 'PermissionTagService.getPermissionTagIntersection';
    const validatedParams = validateInput(
      getPermissionTagIntersectionParamsSchema,
      params,
      context
    );

    const { permissionIds, tagIds } = validatedParams;

    const result = await this.repositories.permissionTagRepository.getPermissionTagIntersection(
      { permissionIds, tagIds },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(permissionTagSchema).array(), result, context);
  }

  public async addPermissionTag(
    params: Omit<AddPermissionTagInput, 'scope'>,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const context = 'PermissionTagService.addPermissionTag';
    const validatedParams = validateInput(addPermissionTagInputSchema, params, context);

    const { permissionId, tagId, isPrimary } = validatedParams;

    const hasTag = await this.permissionHasTag(permissionId, tagId, transaction);

    if (hasTag) {
      throw new Error('Permission already has this tag');
    }

    const permissionTag = await this.repositories.permissionTagRepository.addPermissionTag(
      { permissionId, tagId, isPrimary },
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

  public async updatePermissionTag(
    params: UpdatePermissionTagInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const context = 'PermissionTagService.updatePermissionTag';
    const validatedParams = validateInput(updatePermissionTagInputSchema, params, context);
    const { permissionId, tagId, isPrimary } = validatedParams;

    const permissionTag = await this.repositories.permissionTagRepository.getPermissionTag(
      { permissionId, tagId },
      transaction
    );

    const updatedPermissionTag =
      await this.repositories.permissionTagRepository.updatePermissionTag(
        { permissionId, tagId, isPrimary },
        transaction
      );

    const metadata = {
      context,
    };

    await this.logUpdate(
      updatedPermissionTag.id,
      permissionTag,
      updatedPermissionTag,
      metadata,
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(permissionTagSchema),
      updatedPermissionTag,
      context
    );
  }

  public async removePermissionTag(
    params: Omit<RemovePermissionTagInput, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const context = 'PermissionTagService.removePermissionTag';
    const validatedParams = validateInput(removePermissionTagInputSchema, params, context);

    const { permissionId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.permissionHasTag(permissionId, tagId, transaction);

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

  public async removePermissionTags(
    params: { tagId: string } & DeleteParams,
    transaction?: Transaction
  ): Promise<PermissionTag[]> {
    const context = 'PermissionTagService.removePermissionTags';
    const validatedParams = validateInput(removePermissionTagsInputSchema, params, context);
    const { tagId, hardDelete } = validatedParams;

    const permissionTags = await this.repositories.permissionTagRepository.getPermissionTags(
      { tagId },
      transaction
    );

    const isHardDelete = hardDelete === true;

    const deletedPermissionTags = await Promise.all(
      permissionTags.map((permissionTag) =>
        isHardDelete
          ? this.repositories.permissionTagRepository.hardDeletePermissionTag(
              permissionTag,
              transaction
            )
          : this.repositories.permissionTagRepository.softDeletePermissionTag(
              permissionTag,
              transaction
            )
      )
    );

    return validateOutput(
      createDynamicSingleSchema(permissionTagSchema).array(),
      deletedPermissionTags,
      context
    );
  }
}
