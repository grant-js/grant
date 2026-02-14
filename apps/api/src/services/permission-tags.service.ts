import {
  AddPermissionTagInput,
  PermissionTag,
  RemovePermissionTagInput,
  UpdatePermissionTagInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addPermissionTagInputSchema,
  getPermissionTagIntersectionParamsSchema,
  getPermissionTagsParamsSchema,
  permissionTagSchema,
  removePermissionTagInputSchema,
  removePermissionTagsInputSchema,
  updatePermissionTagInputSchema,
} from './permission-tags.schemas';

import type {
  IAuditLogger,
  IPermissionRepository,
  IPermissionTagRepository,
  IPermissionTagService,
  ITagRepository,
} from '@grantjs/core';

export class PermissionTagService implements IPermissionTagService {
  constructor(
    private readonly permissionRepository: IPermissionRepository,
    private readonly tagRepository: ITagRepository,
    private readonly permissionTagRepository: IPermissionTagRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async permissionExists(permissionId: string, transaction?: Transaction): Promise<void> {
    const permissions = await this.permissionRepository.getPermissions(
      { ids: [permissionId], limit: 1 },
      transaction
    );

    if (permissions.permissions.length === 0) {
      throw new NotFoundError('Permission');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.tagRepository.getTags({ ids: [tagId], limit: 1 }, transaction);

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag');
    }
  }

  private async permissionHasTag(
    permissionId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.permissionExists(permissionId, transaction);
    await this.tagExists(tagId, transaction);
    const existingPermissionTags = await this.permissionTagRepository.getPermissionTags(
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

    const result = await this.permissionTagRepository.getPermissionTags(
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

    const result = await this.permissionTagRepository.getPermissionTagIntersection(
      permissionIds,
      tagIds,
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
      throw new ConflictError('Permission already has this tag', 'PermissionTag', 'tagId');
    }

    const permissionTag = await this.permissionTagRepository.addPermissionTag(
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

    await this.audit.logCreate(permissionTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(permissionTagSchema), permissionTag, context);
  }

  public async updatePermissionTag(
    params: UpdatePermissionTagInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const context = 'PermissionTagService.updatePermissionTag';
    const validatedParams = validateInput(updatePermissionTagInputSchema, params, context);
    const { permissionId, tagId, isPrimary } = validatedParams;

    const permissionTag = await this.permissionTagRepository.getPermissionTag(
      { permissionId, tagId },
      transaction
    );

    const updatedPermissionTag = await this.permissionTagRepository.updatePermissionTag(
      { permissionId, tagId, isPrimary },
      transaction
    );

    const metadata = {
      context,
    };

    await this.audit.logUpdate(
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
      throw new NotFoundError('Tag');
    }

    const isHardDelete = hardDelete === true;

    const permissionTag = isHardDelete
      ? await this.permissionTagRepository.hardDeletePermissionTag(validatedParams, transaction)
      : await this.permissionTagRepository.softDeletePermissionTag(validatedParams, transaction);

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
      await this.audit.logHardDelete(permissionTag.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(permissionTag.id, oldValues, newValues, metadata, transaction);
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

    const permissionTags = await this.permissionTagRepository.getPermissionTags(
      { tagId },
      transaction
    );

    const isHardDelete = hardDelete === true;

    const deletedPermissionTags = await Promise.all(
      permissionTags.map((permissionTag) =>
        isHardDelete
          ? this.permissionTagRepository.hardDeletePermissionTag(permissionTag, transaction)
          : this.permissionTagRepository.softDeletePermissionTag(permissionTag, transaction)
      )
    );

    return validateOutput(
      createDynamicSingleSchema(permissionTagSchema).array(),
      deletedPermissionTags,
      context
    );
  }
}
