import {
  QueryUserTagsArgs,
  MutationAddUserTagArgs,
  MutationRemoveUserTagArgs,
  UserTag,
} from '@/graphql/generated/types';
import { ITagRepository, IUserRepository } from '@/graphql/repositories';
import { IUserTagRepository } from '@/graphql/repositories/user-tags/interface';
import { userTagsAuditLogs } from '@/graphql/repositories/user-tags/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IUserTagService } from './interface';
import {
  getUserTagsParamsSchema,
  addUserTagParamsSchema,
  removeUserTagParamsSchema,
  userTagSchema,
} from './schemas';

export class UserTagService extends AuditService implements IUserTagService {
  constructor(
    private readonly userTagRepository: IUserTagRepository,
    private readonly userRepository: IUserRepository,
    private readonly tagRepository: ITagRepository,
    user: AuthenticatedUser | null
  ) {
    super(userTagsAuditLogs, 'userTagId', user);
  }

  private async userExists(userId: string): Promise<void> {
    const users = await this.userRepository.getUsers({
      ids: [userId],
      limit: 1,
    });

    if (users.users.length === 0) {
      throw new Error('User not found');
    }
  }

  private async tagExists(tagId: string): Promise<void> {
    const tags = await this.tagRepository.getTags({
      ids: [tagId],
      limit: 1,
    });

    if (tags.tags.length === 0) {
      throw new Error('Tag not found');
    }
  }
  private async userHasTag(userId: string, tagId: string): Promise<boolean> {
    await this.userExists(userId);
    await this.tagExists(tagId);
    const existingUserTags = await this.userTagRepository.getUserTags({
      userId,
    });

    return existingUserTags.some((ut) => ut.tagId === tagId);
  }

  public async getUserTags(params: Omit<QueryUserTagsArgs, 'scope'>): Promise<UserTag[]> {
    const validatedParams = validateInput(getUserTagsParamsSchema, params, 'getUserTags method');

    await this.userExists(validatedParams.userId);

    const result = await this.userTagRepository.getUserTags({ userId: validatedParams.userId });
    return validateOutput(
      createDynamicSingleSchema(userTagSchema).array(),
      result,
      'getUserTags method'
    );
  }

  public async addUserTag(params: MutationAddUserTagArgs): Promise<UserTag> {
    const validatedParams = validateInput(addUserTagParamsSchema, params, 'addUserTag method');

    const hasTag = await this.userHasTag(validatedParams.input.userId, validatedParams.input.tagId);

    if (hasTag) {
      throw new Error('User already has this tag');
    }

    const userTag = await this.userTagRepository.addUserTag(validatedParams);

    const newValues = {
      id: userTag.id,
      userId: userTag.userId,
      tagId: userTag.tagId,
      createdAt: userTag.createdAt,
      updatedAt: userTag.updatedAt,
    };

    const metadata = {
      source: 'add_user_tag_mutation',
    };

    await this.logCreate(userTag.id, newValues, metadata);

    return validateOutput(createDynamicSingleSchema(userTagSchema), userTag, 'addUserTag method');
  }

  public async removeUserTag(
    params: MutationRemoveUserTagArgs & { hardDelete?: boolean }
  ): Promise<UserTag> {
    const validatedParams = validateInput(
      removeUserTagParamsSchema,
      params,
      'removeUserTag method'
    );

    const hasTag = await this.userHasTag(validatedParams.input.userId, validatedParams.input.tagId);

    if (!hasTag) {
      throw new Error('User does not have this tag');
    }

    const isHardDelete = params.hardDelete === true;

    const userTag = isHardDelete
      ? await this.userTagRepository.hardDeleteUserTag(validatedParams)
      : await this.userTagRepository.softDeleteUserTag(validatedParams);

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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_user_tag_mutation',
      };
      await this.logHardDelete(userTag.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_user_tag_mutation',
      };
      await this.logSoftDelete(userTag.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(userTagSchema),
      userTag,
      'deleteUserTag method'
    );
  }
}
