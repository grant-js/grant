import { GrantAuth } from '@grantjs/core';
import { AccountProjectApiKey } from '@grantjs/schema';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';

import {
  accountProjectApiKeySchema,
  addAccountProjectApiKeyParamsSchema,
  getAccountProjectApiKeysParamsSchema,
} from './account-project-api-keys.schemas';
import { createDynamicSingleSchema, validateInput, validateOutput } from './common';

import type {
  IAuditLogger,
  IAccountProjectRepository,
  IAccountRoleRepository,
  IAccountProjectApiKeyRepository,
  IUserRoleRepository,
  IAccountProjectApiKeyService,
} from '@grantjs/core';

export class AccountProjectApiKeyService implements IAccountProjectApiKeyService {
  constructor(
    private readonly accountProjectRepository: IAccountProjectRepository,
    private readonly accountRoleRepository: IAccountRoleRepository,
    private readonly accountProjectApiKeyRepository: IAccountProjectApiKeyRepository,
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly user: GrantAuth | null,
    private readonly audit: IAuditLogger
  ) {}

  private async ensureAccountProjectExists(
    accountId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<void> {
    const accountProjects = await this.accountProjectRepository.getAccountProjects(
      { accountId },
      transaction
    );
    const accountProject = accountProjects.find((ap) => ap.projectId === projectId);
    if (!accountProject) {
      throw new NotFoundError('AccountProject');
    }
  }

  private async ensureAccountHasRole(
    accountId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<void> {
    const accountRoles = await this.accountRoleRepository.getAccountRoles(
      { accountId },
      transaction
    );
    if (!accountRoles.some((ar) => ar.roleId === roleId)) {
      throw new BadRequestError('Role is not assigned to this account');
    }
  }

  public async getAccountProjectApiKeys(
    params: { accountId?: string; projectId?: string; apiKeyId?: string },
    transaction?: Transaction
  ): Promise<AccountProjectApiKey[]> {
    const context = 'AccountProjectApiKeyService.getAccountProjectApiKeys';
    const validated = validateInput(getAccountProjectApiKeysParamsSchema, params, context);
    const result = await this.accountProjectApiKeyRepository.getAccountProjectApiKeys(
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

    const pivot = await this.accountProjectApiKeyRepository.addAccountProjectApiKey(
      validated,
      transaction
    );

    const newValues = { accountId, projectId, apiKeyId: validated.apiKeyId, accountRoleId };
    const metadata = { context };
    await this.audit.logCreate(pivot.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(accountProjectApiKeySchema), pivot, context);
  }

  public async getByApiKeyAndAccountAndProject(
    apiKeyId: string,
    accountId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<AccountProjectApiKey | null> {
    const context = 'AccountProjectApiKeyService.getByApiKeyAndAccountAndProject';
    const result = await this.accountProjectApiKeyRepository.getByApiKeyAndAccountAndProject(
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
        'roleId is required when creating an API key for accountProject scope'
      );
    }
    const [accountRoles, userRoles] = await Promise.all([
      this.accountRoleRepository.getAccountRoles({ accountId }, transaction),
      this.userRoleRepository.getUserRoles({ userId: this.user.userId }, transaction),
    ]);
    const accountRoleIds = new Set(accountRoles.map((r) => r.roleId));
    const userRoleId = userRoles.find((ur) => accountRoleIds.has(ur.roleId))?.roleId;
    if (!userRoleId) {
      throw new BadRequestError('No account role found for the current user in this account');
    }
    return userRoleId;
  }
}
