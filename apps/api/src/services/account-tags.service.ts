import { AccountTag, AddAccountTagInput, RemoveAccountTagInput } from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import {
  accountTagSchema,
  addAccountTagInputSchema,
  getAccountTagsParamsSchema,
  removeAccountTagInputSchema,
} from './account-tags.schemas';
import { createDynamicSingleSchema, validateInput, validateOutput } from './common';

import type {
  IAuditLogger,
  IAccountRepository,
  ITagRepository,
  IAccountTagRepository,
  IAccountTagService,
} from '@grantjs/core';

export class AccountTagsService implements IAccountTagService {
  constructor(
    private readonly accountRepository: IAccountRepository,
    private readonly tagRepository: ITagRepository,
    private readonly accountTagsRepository: IAccountTagRepository,
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

  private async accountHasTag(
    accountId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.accountExists(accountId, transaction);
    await this.tagExists(tagId, transaction);
    const existingAccountTags = await this.accountTagsRepository.getAccountTags(
      {
        accountId,
      },
      transaction
    );

    return existingAccountTags.some((at) => at.tagId === tagId);
  }

  public async getAccountTags(
    params: { accountId: string },
    transaction?: Transaction
  ): Promise<AccountTag[]> {
    const context = 'AccountTagService.getAccountTags';
    const validatedParams = validateInput(getAccountTagsParamsSchema, params, context);

    await this.accountExists(validatedParams.accountId, transaction);

    const result = await this.accountTagsRepository.getAccountTags(validatedParams, transaction);
    return validateOutput(createDynamicSingleSchema(accountTagSchema).array(), result, context);
  }

  public async addAccountTag(
    params: AddAccountTagInput,
    transaction?: Transaction
  ): Promise<AccountTag> {
    const context = 'AccountTagsService.addAccountTag';
    const validatedParams = validateInput(addAccountTagInputSchema, params, context);
    const { accountId, tagId } = validatedParams;

    const hasTag = await this.accountHasTag(accountId, tagId, transaction);

    if (hasTag) {
      throw new ConflictError('Account already has this tag', 'AccountTag', 'tagId');
    }

    const accountTag = await this.accountTagsRepository.addAccountTag(
      { accountId, tagId },
      transaction
    );

    const newValues = {
      id: accountTag.id,
      accountId: accountTag.accountId,
      tagId: accountTag.tagId,
      createdAt: accountTag.createdAt,
      updatedAt: accountTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(accountTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(accountTagSchema), accountTag, context);
  }

  public async removeAccountTag(
    params: RemoveAccountTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<AccountTag> {
    const context = 'AccountTagsService.removeAccountTag';
    const validatedParams = validateInput(removeAccountTagInputSchema, params, context);

    const { accountId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.accountHasTag(accountId, tagId, transaction);

    if (!hasTag) {
      throw new NotFoundError('Tag');
    }

    const isHardDelete = hardDelete === true;

    const accountTag = isHardDelete
      ? await this.accountTagsRepository.hardDeleteAccountTag({ accountId, tagId }, transaction)
      : await this.accountTagsRepository.softDeleteAccountTag({ accountId, tagId }, transaction);

    const oldValues = {
      id: accountTag.id,
      accountId: accountTag.accountId,
      tagId: accountTag.tagId,
      createdAt: accountTag.createdAt,
      updatedAt: accountTag.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(accountTag.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: accountTag.deletedAt,
      };
      await this.audit.logSoftDelete(accountTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(accountTagSchema), accountTag, context);
  }
}
