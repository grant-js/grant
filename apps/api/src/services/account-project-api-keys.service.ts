import { GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
import { AccountProjectApiKey } from '@grantjs/schema';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  accountProjectApiKeySchema,
  addAccountProjectApiKeyParamsSchema,
  getAccountProjectApiKeysParamsSchema,
} from './account-project-api-keys.schemas';
import { createDynamicSingleSchema, validateInput, validateOutput } from './common';

export class AccountProjectApiKeyService {
  constructor(
    private readonly repositories: Repositories,
    private readonly user: GrantAuth | null,
    private readonly db: DbSchema
  ) {}

  private async ensureAccountProjectExists(
    accountId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<void> {
    const accountProjects = await this.repositories.accountProjectRepository.getAccountProjects(
      { accountId },
      transaction
    );
    const accountProject = accountProjects.find((ap) => ap.projectId === projectId);
    if (!accountProject) {
      throw new NotFoundError(
        'Account project not found for scope',
        'errors:notFound.accountProject'
      );
    }
  }

  private async ensureAccountHasRole(
    accountId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<void> {
    const accountRoles = await this.repositories.accountRoleRepository.getAccountRoles(
      { accountId },
      transaction
    );
    if (!accountRoles.some((ar) => ar.roleId === roleId)) {
      throw new BadRequestError(
        'Role is not assigned to this account',
        'errors:validation.invalid',
        { field: 'roleId' }
      );
    }
  }

  public async getAccountProjectApiKeys(
    params: { accountId?: string; projectId?: string; apiKeyId?: string },
    transaction?: Transaction
  ): Promise<AccountProjectApiKey[]> {
    const context = 'AccountProjectApiKeyService.getAccountProjectApiKeys';
    const validated = validateInput(getAccountProjectApiKeysParamsSchema, params, context);
    const result = await this.repositories.accountProjectApiKeyRepository.getAccountProjectApiKeys(
      validated,
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(accountProjectApiKeySchema).array(),
      result,
      context
    );
  }

  public async addAccountProjectApiKey(
    params: { accountId: string; projectId: string; apiKeyId: string; accountRoleId: string },
    transaction?: Transaction
  ): Promise<AccountProjectApiKey> {
    const context = 'AccountProjectApiKeyService.addAccountProjectApiKey';
    const validated = validateInput(addAccountProjectApiKeyParamsSchema, params, context);
    const { accountId, projectId, accountRoleId } = validated;

    await this.ensureAccountProjectExists(accountId, projectId, transaction);
    await this.ensureAccountHasRole(accountId, accountRoleId, transaction);

    const pivot = await this.repositories.accountProjectApiKeyRepository.addAccountProjectApiKey(
      validated,
      transaction
    );
    return validateOutput(createDynamicSingleSchema(accountProjectApiKeySchema), pivot, context);
  }

  public async getByApiKeyAndAccountAndProject(
    apiKeyId: string,
    accountId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<AccountProjectApiKey | null> {
    const context = 'AccountProjectApiKeyService.getByApiKeyAndAccountAndProject';
    const result =
      await this.repositories.accountProjectApiKeyRepository.getByApiKeyAndAccountAndProject(
        apiKeyId,
        accountId,
        projectId,
        transaction
      );
    if (result === null) {
      return null;
    }
    return validateOutput(createDynamicSingleSchema(accountProjectApiKeySchema), result, context);
  }

  public async resolveAccountRoleIdForCurrentUser(
    accountId: string,
    transaction?: Transaction
  ): Promise<string> {
    if (!this.user?.userId) {
      throw new BadRequestError(
        'roleId is required when creating an API key for accountProject scope',
        'errors:validation.invalid',
        { field: 'roleId' }
      );
    }
    const [accountRoles, userRoles] = await Promise.all([
      this.repositories.accountRoleRepository.getAccountRoles({ accountId }, transaction),
      this.repositories.userRoleRepository.getUserRoles({ userId: this.user.userId }, transaction),
    ]);
    const accountRoleIds = new Set(accountRoles.map((r) => r.roleId));
    const userRoleId = userRoles.find((ur) => accountRoleIds.has(ur.roleId))?.roleId;
    if (!userRoleId) {
      throw new BadRequestError(
        'No account role found for the current user in this account',
        'errors:validation.invalid',
        { field: 'roleId' }
      );
    }
    return userRoleId;
  }
}
