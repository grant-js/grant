import {
  AccountProjectTag,
  AddAccountProjectTagInput,
  QueryAccountProjectTagInput,
  RemoveAccountProjectTagInput,
  UpdateAccountProjectTagInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import {
  accountProjectTagSchema,
  addAccountProjectTagInputSchema,
  getAccountProjectTagsIntersectionSchema,
  getAccountProjectTagsParamsSchema,
  removeAccountProjectTagInputSchema,
  updateAccountProjectTagInputSchema,
} from './account-project-tags.schema';
import { createDynamicSingleSchema, validateInput, validateOutput } from './common';

import type {
  IAuditLogger,
  IAccountRepository,
  IProjectRepository,
  ITagRepository,
  IAccountProjectTagRepository,
  IAccountProjectTagService,
} from '@grantjs/core';

export class AccountProjectTagService implements IAccountProjectTagService {
  constructor(
    private readonly accountRepository: IAccountRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly tagRepository: ITagRepository,
    private readonly accountProjectTagRepository: IAccountProjectTagRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async accountExists(accountId: string, transaction?: Transaction): Promise<void> {
    const accounts = await this.accountRepository.getAccounts(
      {
        ids: [accountId],
        limit: 1,
      },
      transaction
    );

    if (accounts.accounts.length === 0) {
      throw new NotFoundError('Account');
    }
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.projectRepository.getProjects(
      {
        ids: [projectId],
        limit: 1,
      },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.tagRepository.getTags(
      {
        ids: [tagId],
        limit: 1,
      },
      transaction
    );

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag');
    }
  }

  private async projectHasAccountTag(
    accountId: string,
    projectId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.accountExists(accountId, transaction);
    await this.projectExists(projectId, transaction);
    await this.tagExists(tagId, transaction);
    const existingAccountProjectTags = await this.accountProjectTagRepository.getAccountProjectTags(
      { accountId, projectId },
      transaction
    );

    return existingAccountProjectTags.some((apt) => apt.tagId === tagId);
  }

  public async getAccountProjectTags(
    params: QueryAccountProjectTagInput,
    transaction?: Transaction
  ): Promise<AccountProjectTag[]> {
    const context = 'AccountProjectTagService.getAccountProjectTags';
    const validatedParams = validateInput(getAccountProjectTagsParamsSchema, params, context);

    await this.accountExists(validatedParams.accountId);
    await this.projectExists(validatedParams.projectId);

    const result = await this.accountProjectTagRepository.getAccountProjectTags(
      validatedParams,
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(accountProjectTagSchema).array(),
      result,
      context
    );
  }

  public async getAccountProjectTagIntersection(
    accountId: string,
    projectIds: string[],
    tagIds: string[]
  ): Promise<AccountProjectTag[]> {
    const context = 'AccountProjectTagService.getAccountProjectTagIntersection';
    validateInput(
      getAccountProjectTagsIntersectionSchema,
      { accountId, projectIds, tagIds },
      context
    );

    const result = await this.accountProjectTagRepository.getAccountProjectTagIntersection(
      accountId,
      projectIds,
      tagIds
    );
    return validateOutput(
      createDynamicSingleSchema(accountProjectTagSchema).array(),
      result,
      context
    );
  }

  public async addAccountProjectTag(
    params: AddAccountProjectTagInput,
    transaction?: Transaction
  ): Promise<AccountProjectTag> {
    const context = 'AccountProjectTagService.addAccountProjectTag';
    const validatedParams = validateInput(addAccountProjectTagInputSchema, params, context);
    const { accountId, projectId, tagId, isPrimary } = validatedParams;

    const hasTag = await this.projectHasAccountTag(accountId, projectId, tagId, transaction);

    if (hasTag) {
      throw new ConflictError('Project already has this tag', 'ProjectTag', 'tagId');
    }

    const accountProjectTag = await this.accountProjectTagRepository.addAccountProjectTag(
      { accountId, projectId, tagId, isPrimary },
      transaction
    );

    const newValues = {
      id: accountProjectTag.id,
      accountId: accountProjectTag.accountId,
      projectId: accountProjectTag.projectId,
      tagId: accountProjectTag.tagId,
      isPrimary: accountProjectTag.isPrimary,
      createdAt: accountProjectTag.createdAt,
      updatedAt: accountProjectTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(accountProjectTag.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(accountProjectTagSchema),
      accountProjectTag,
      context
    );
  }

  public async updateAccountProjectTag(
    params: UpdateAccountProjectTagInput,
    transaction?: Transaction
  ): Promise<AccountProjectTag> {
    const context = 'AccountProjectTagService.updateAccountProjectTag';
    const validatedParams = validateInput(updateAccountProjectTagInputSchema, params, context);
    const { accountId, projectId, tagId, isPrimary } = validatedParams;

    const accountProjectTag = await this.accountProjectTagRepository.getAccountProjectTag(
      { accountId, projectId, tagId },
      transaction
    );

    const updatedAccountProjectTag = await this.accountProjectTagRepository.updateAccountProjectTag(
      { accountId, projectId, tagId, isPrimary },
      transaction
    );

    const oldValues = {
      id: accountProjectTag.id,
      accountId: accountProjectTag.accountId,
      projectId: accountProjectTag.projectId,
      tagId: accountProjectTag.tagId,
      isPrimary: accountProjectTag.isPrimary,
      createdAt: accountProjectTag.createdAt,
      updatedAt: accountProjectTag.updatedAt,
    };

    const newValues = {
      id: updatedAccountProjectTag.id,
      accountId: updatedAccountProjectTag.accountId,
      projectId: updatedAccountProjectTag.projectId,
      tagId: updatedAccountProjectTag.tagId,
      isPrimary: updatedAccountProjectTag.isPrimary,
      createdAt: updatedAccountProjectTag.createdAt,
      updatedAt: updatedAccountProjectTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logUpdate(
      updatedAccountProjectTag.id,
      oldValues,
      newValues,
      metadata,
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(accountProjectTagSchema),
      updatedAccountProjectTag,
      context
    );
  }

  public async removeAccountProjectTag(
    params: RemoveAccountProjectTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<AccountProjectTag> {
    const context = 'AccountProjectTagService.removeAccountProjectTag';
    const validatedParams = validateInput(removeAccountProjectTagInputSchema, params, context);

    const { accountId, projectId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.projectHasAccountTag(accountId, projectId, tagId, transaction);

    if (!hasTag) {
      throw new NotFoundError('Tag');
    }

    const isHardDelete = hardDelete === true;

    const accountProjectTag = isHardDelete
      ? await this.accountProjectTagRepository.hardDeleteAccountProjectTag(
          { accountId, projectId, tagId },
          transaction
        )
      : await this.accountProjectTagRepository.softDeleteAccountProjectTag(
          { accountId, projectId, tagId },
          transaction
        );

    const oldValues = {
      id: accountProjectTag.id,
      accountId: accountProjectTag.accountId,
      projectId: accountProjectTag.projectId,
      tagId: accountProjectTag.tagId,
      createdAt: accountProjectTag.createdAt,
      updatedAt: accountProjectTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: accountProjectTag.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(accountProjectTag.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        accountProjectTag.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(
      createDynamicSingleSchema(accountProjectTagSchema),
      accountProjectTag,
      context
    );
  }
}
