import { GrantAuth } from '@grantjs/core';
import { DbSchema, accountTagAuditLogs } from '@grantjs/database';
import { AccountTag, AddAccountTagInput, RemoveAccountTagInput } from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  accountTagSchema,
  addAccountTagInputSchema,
  getAccountTagsParamsSchema,
  removeAccountTagInputSchema,
} from './account-tags.schemas';
import { DeleteParams, createDynamicSingleSchema, validateInput, validateOutput } from './common';
import { AuditService } from './common/audit-service';

export class AccountTagsService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(accountTagAuditLogs, 'accountTagId', user, db);
  }

  private async accountExists(accountId: string, transaction?: Transaction): Promise<void> {
    const accounts = await this.repositories.accountRepository.getAccounts(
      {
        ids: [accountId],
        limit: 1,
      },
      transaction
    );

    if (accounts.accounts.length === 0) {
      throw new NotFoundError('Account not found', 'errors:notFound.account');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.repositories.tagRepository.getTags(
      {
        ids: [tagId],
        limit: 1,
      },
      transaction
    );

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag not found', 'errors:notFound.tag');
    }
  }

  private async accountHasTag(
    accountId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.accountExists(accountId, transaction);
    await this.tagExists(tagId, transaction);
    const existingAccountTags = await this.repositories.accountTagsRepository.getAccountTags(
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

    const result = await this.repositories.accountTagsRepository.getAccountTags(
      validatedParams,
      transaction
    );
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
      throw new ConflictError('Account already has this tag', 'errors:conflict.duplicateEntry', {
        resource: 'AccountTag',
        field: 'tagId',
      });
    }

    const accountTag = await this.repositories.accountTagsRepository.addAccountTag(
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

    await this.logCreate(accountTag.id, newValues, metadata, transaction);

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
      throw new NotFoundError('Account does not have this tag', 'errors:notFound.tag');
    }

    const isHardDelete = hardDelete === true;

    const accountTag = isHardDelete
      ? await this.repositories.accountTagsRepository.hardDeleteAccountTag(
          { accountId, tagId },
          transaction
        )
      : await this.repositories.accountTagsRepository.softDeleteAccountTag(
          { accountId, tagId },
          transaction
        );

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
      await this.logHardDelete(accountTag.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: accountTag.deletedAt,
      };
      await this.logSoftDelete(accountTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(accountTagSchema), accountTag, context);
  }
}
