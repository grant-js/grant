import { AddUserTagInput, RemoveUserTagInput, UpdateUserTagInput, UserTag } from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addUserTagInputSchema,
  getUserTagIntersectionInputSchema,
  queryUserTagsArgsSchema,
  removeUserTagInputSchema,
  removeUsersTagsInputSchema,
  updateUserTagInputSchema,
  userTagSchema,
} from './user-tags.schemas';

import type {
  IAuditLogger,
  ITagRepository,
  IUserRepository,
  IUserTagRepository,
  IUserTagService,
} from '@grantjs/core';

export class UserTagService implements IUserTagService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tagRepository: ITagRepository,
    private readonly userTagRepository: IUserTagRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.userRepository.getUsers({ ids: [userId], limit: 1 }, transaction);

    if (users.users.length === 0) {
      throw new NotFoundError('User');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.tagRepository.getTags({ ids: [tagId], limit: 1 }, transaction);

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag');
    }
  }
  private async userHasTag(
    userId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.userExists(userId, transaction);
    await this.tagExists(tagId, transaction);
    const existingUserTags = await this.userTagRepository.getUserTags({ userId }, transaction);

    return existingUserTags.some((ut) => ut.tagId === tagId);
  }

  public async getUserTags(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<UserTag[]> {
    const context = 'UserTagService.getUserTags';
    const validatedParams = validateInput(queryUserTagsArgsSchema, params, context);

    await this.userExists(validatedParams.userId, transaction);

    const result = await this.userTagRepository.getUserTags(
      { userId: validatedParams.userId },
      transaction
    );
    return validateOutput(createDynamicSingleSchema(userTagSchema).array(), result, context);
  }

  public async getUserTagIntersection(
    userIds: string[],
    tagIds: string[],
    transaction?: Transaction
  ): Promise<UserTag[]> {
    const context = 'UserTagService.getUserTagIntersection';
    validateInput(getUserTagIntersectionInputSchema, { userIds, tagIds }, context);

    const result = await this.userTagRepository.getUserTagIntersection(
      userIds,
      tagIds,
      transaction
    );

    return validateOutput(createDynamicSingleSchema(userTagSchema).array(), result, context);
  }

  public async addUserTag(params: AddUserTagInput, transaction?: Transaction): Promise<UserTag> {
    const context = 'UserTagService.addUserTag';
    const validatedParams = validateInput(addUserTagInputSchema, params, context);
    const { userId, tagId } = validatedParams;

    const hasTag = await this.userHasTag(userId, tagId, transaction);

    if (hasTag) {
      throw new ConflictError('User already has this tag', 'UserTag', 'tagId');
    }

    const userTag = await this.userTagRepository.addUserTag(validatedParams, transaction);

    const newValues = {
      id: userTag.id,
      userId: userTag.userId,
      tagId: userTag.tagId,
      createdAt: userTag.createdAt,
      updatedAt: userTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(userTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(userTagSchema), userTag, context);
  }

  public async updateUserTag(
    params: UpdateUserTagInput,
    transaction?: Transaction
  ): Promise<UserTag> {
    const context = 'UserTagService.updateUserTag';
    const validatedParams = validateInput(updateUserTagInputSchema, params, context);
    const { userId, tagId, isPrimary } = validatedParams;

    const userTag = await this.userTagRepository.getUserTag({ userId, tagId }, transaction);

    const updatedUserTag = await this.userTagRepository.updateUserTag(
      { userId, tagId, isPrimary },
      transaction
    );

    const metadata = {
      context,
    };

    await this.audit.logUpdate(updatedUserTag.id, userTag, updatedUserTag, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(userTagSchema), updatedUserTag, context);
  }

  public async removeUserTag(
    params: RemoveUserTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<UserTag> {
    const context = 'UserTagService.removeUserTag';
    const validatedParams = validateInput(removeUserTagInputSchema, params, context);
    const { userId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.userHasTag(userId, tagId, transaction);

    if (!hasTag) {
      throw new NotFoundError('Tag');
    }

    const isHardDelete = params.hardDelete === true;

    const userTag = isHardDelete
      ? await this.userTagRepository.hardDeleteUserTag(validatedParams, transaction)
      : await this.userTagRepository.softDeleteUserTag(validatedParams, transaction);

    const oldValues = {
      id: userTag.id,
      userId: userTag.userId,
      tagId: userTag.tagId,
      createdAt: userTag.createdAt,
      updatedAt: userTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: userTag.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(userTag.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(userTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(userTagSchema), userTag, context);
  }

  public async removeUserTags(
    params: { tagId: string } & DeleteParams,
    transaction?: Transaction
  ): Promise<UserTag[]> {
    const context = 'UserTagService.removeUsersTags';
    const validatedParams = validateInput(removeUsersTagsInputSchema, params, context);
    const { tagId, hardDelete } = validatedParams;

    const userTags = await this.userTagRepository.getUserTags({ tagId }, transaction);

    const isHardDelete = hardDelete === true;

    const deletedUserTags = await Promise.all(
      userTags.map((userTag) =>
        isHardDelete
          ? this.userTagRepository.hardDeleteUserTag(userTag, transaction)
          : this.userTagRepository.softDeleteUserTag(userTag, transaction)
      )
    );

    return validateOutput(
      createDynamicSingleSchema(userTagSchema).array(),
      deletedUserTags,
      context
    );
  }
}
