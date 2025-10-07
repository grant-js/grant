import { DbSchema } from '@logusgraphics/grant-database';
import { userTagsAuditLogs } from '@logusgraphics/grant-database';
import {
  AddUserTagInput,
  RemoveUserTagInput,
  UpdateUserTagInput,
  UserTag,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  userTagSchema,
  queryUserTagsArgsSchema,
  addUserTagInputSchema,
  removeUserTagInputSchema,
  getUserTagIntersectionInputSchema,
  removeUsersTagsInputSchema,
  updateUserTagInputSchema,
} from './schemas';

export class UserTagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(userTagsAuditLogs, 'userTagId', user, db);
  }

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.repositories.userRepository.getUsers(
      { ids: [userId], limit: 1 },
      transaction
    );

    if (users.users.length === 0) {
      throw new Error('User not found');
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
  private async userHasTag(
    userId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.userExists(userId, transaction);
    await this.tagExists(tagId, transaction);
    const existingUserTags = await this.repositories.userTagRepository.getUserTags(
      { userId },
      transaction
    );

    return existingUserTags.some((ut) => ut.tagId === tagId);
  }

  public async getUserTags(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<UserTag[]> {
    const context = 'UserTagService.getUserTags';
    const validatedParams = validateInput(queryUserTagsArgsSchema, params, context);

    await this.userExists(validatedParams.userId, transaction);

    const result = await this.repositories.userTagRepository.getUserTags(
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

    const result = await this.repositories.userTagRepository.getUserTagIntersection(
      { userIds, tagIds },
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
      throw new Error('User already has this tag');
    }

    const userTag = await this.repositories.userTagRepository.addUserTag(
      validatedParams,
      transaction
    );

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

    await this.logCreate(userTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(userTagSchema), userTag, context);
  }

  public async updateUserTag(
    params: UpdateUserTagInput,
    transaction?: Transaction
  ): Promise<UserTag> {
    const context = 'UserTagService.updateUserTag';
    const validatedParams = validateInput(updateUserTagInputSchema, params, context);
    const { userId, tagId, isPrimary } = validatedParams;

    const userTag = await this.repositories.userTagRepository.getUserTag(
      { userId, tagId },
      transaction
    );

    const updatedUserTag = await this.repositories.userTagRepository.updateUserTag(
      { userId, tagId, isPrimary },
      transaction
    );

    const metadata = {
      context,
    };

    await this.logUpdate(updatedUserTag.id, userTag, updatedUserTag, metadata, transaction);

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
      throw new Error('User does not have this tag');
    }

    const isHardDelete = params.hardDelete === true;

    const userTag = isHardDelete
      ? await this.repositories.userTagRepository.hardDeleteUserTag(validatedParams, transaction)
      : await this.repositories.userTagRepository.softDeleteUserTag(validatedParams, transaction);

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
      await this.logHardDelete(userTag.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(userTag.id, oldValues, newValues, metadata, transaction);
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

    const userTags = await this.repositories.userTagRepository.getUserTags({ tagId }, transaction);

    const isHardDelete = hardDelete === true;

    const deletedUserTags = await Promise.all(
      userTags.map((userTag) =>
        isHardDelete
          ? this.repositories.userTagRepository.hardDeleteUserTag(userTag, transaction)
          : this.repositories.userTagRepository.softDeleteUserTag(userTag, transaction)
      )
    );

    return validateOutput(
      createDynamicSingleSchema(userTagSchema).array(),
      deletedUserTags,
      context
    );
  }
}
