import type { IApiKeyRepository } from '@grantjs/core';
import type {
  AccountProjectApiKeyModel,
  ApiKeyModel,
  OrganizationProjectApiKeyModel,
  ProjectUserApiKeyModel,
} from '@grantjs/database';
import {
  accountProjectApiKeys,
  apiKeys,
  organizationProjectApiKeys,
  projectUserApiKeys,
  users,
} from '@grantjs/database';
import {
  ApiKey,
  ApiKeyPage,
  ApiKeySearchableField,
  CreateApiKeyInput,
  QueryApiKeysArgs,
  User,
} from '@grantjs/schema';
import { and, eq, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import {
  BaseUpdateArgs,
  EntityRepository,
  FilterCondition,
  RelationsConfig,
} from './common/EntityRepository';

export class ApiKeyRepository
  extends EntityRepository<ApiKeyModel, ApiKey>
  implements IApiKeyRepository
{
  protected table = apiKeys;
  protected schemaName = 'apiKeys' as const;
  protected searchFields: Array<keyof ApiKeyModel> = Object.values(ApiKeySearchableField);
  protected defaultSortField: keyof ApiKeyModel = 'createdAt';
  protected relations: RelationsConfig<ApiKey> = {
    createdByUser: {
      field: 'createdByUser',
      table: users,
      extract: (v: User) => v,
    },
    revokedByUser: {
      field: 'revokedByUser',
      table: users,
      extract: (v: User) => v,
    },
  };

  private isActiveKey(key: ApiKeyModel): boolean {
    return (
      !key.isRevoked && !key.deletedAt && (!key.expiresAt || new Date(key.expiresAt) >= new Date())
    );
  }

  private toApiKey(key: ApiKeyModel): ApiKey {
    return key as ApiKey;
  }

  public async getApiKeys(
    params: Omit<QueryApiKeysArgs, 'scope'> & SelectedFields<ApiKey>,
    transaction?: Transaction
  ): Promise<ApiKeyPage> {
    const result = await this.query(params, transaction);

    return {
      apiKeys: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async getApiKey(id: string, transaction?: Transaction): Promise<ApiKey | null> {
    const filters: FilterCondition<ApiKeyModel>[] = [
      {
        field: 'id',
        operator: 'eq',
        value: id,
      },
    ];

    const result = await this.query(
      {
        filters,
        limit: 1,
      },
      transaction
    );

    return result.items[0] || null;
  }

  public async findByClientId(clientId: string, transaction?: Transaction): Promise<ApiKey | null> {
    const filters: FilterCondition<ApiKeyModel>[] = [
      {
        field: 'clientId',
        operator: 'eq',
        value: clientId,
      },
    ];

    const result = await this.query(
      {
        filters,
        limit: 1,
      },
      transaction
    );

    return result.items[0] || null;
  }

  public async findActiveByClientId(
    clientId: string,
    transaction?: Transaction
  ): Promise<ApiKey | null> {
    const now = new Date();
    const filters: FilterCondition<ApiKeyModel>[] = [
      {
        field: 'clientId',
        operator: 'eq',
        value: clientId,
      },
      {
        field: 'isRevoked',
        operator: 'eq',
        value: false,
      },
      {
        field: 'deletedAt',
        operator: 'isNull',
        value: undefined,
      },
    ];

    const result = await this.query(
      {
        filters,
        limit: 1,
      },
      transaction
    );

    if (result.items.length === 0) {
      return null;
    }

    const key = result.items[0];

    if (key.expiresAt && new Date(key.expiresAt) < now) {
      return null;
    }

    return key;
  }

  public async findActiveProjectUserApiKeysByClientId(
    params: { clientId: string; projectId: string; userId: string },
    transaction?: Transaction
  ): Promise<ApiKey[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        apiKey: this.table,
      })
      .from(this.table)
      .innerJoin(projectUserApiKeys, eq(projectUserApiKeys.apiKeyId, this.table.id))
      .where(
        and(
          eq(this.table.clientId, params.clientId),
          isNull(this.table.deletedAt),
          eq(this.table.isRevoked, false),
          eq(projectUserApiKeys.projectId, params.projectId),
          eq(projectUserApiKeys.userId, params.userId),
          isNull(projectUserApiKeys.deletedAt)
        )
      );

    return rows
      .map((row: { apiKey: ApiKeyModel; project_user_api_keys?: ProjectUserApiKeyModel }) =>
        this.toApiKey(row.apiKey)
      )
      .filter((key) => this.isActiveKey(key as ApiKeyModel));
  }

  public async findActiveAccountProjectApiKeysByClientId(
    params: { clientId: string; accountId: string; projectId: string },
    transaction?: Transaction
  ): Promise<ApiKey[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        apiKey: this.table,
      })
      .from(this.table)
      .innerJoin(accountProjectApiKeys, eq(accountProjectApiKeys.apiKeyId, this.table.id))
      .where(
        and(
          eq(this.table.clientId, params.clientId),
          isNull(this.table.deletedAt),
          eq(this.table.isRevoked, false),
          eq(accountProjectApiKeys.accountId, params.accountId),
          eq(accountProjectApiKeys.projectId, params.projectId),
          isNull(accountProjectApiKeys.deletedAt)
        )
      );

    return rows
      .map((row: { apiKey: ApiKeyModel; account_project_api_keys?: AccountProjectApiKeyModel }) =>
        this.toApiKey(row.apiKey)
      )
      .filter((key) => this.isActiveKey(key as ApiKeyModel));
  }

  public async findActiveOrganizationProjectApiKeysByClientId(
    params: { clientId: string; organizationId: string; projectId: string },
    transaction?: Transaction
  ): Promise<ApiKey[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        apiKey: this.table,
      })
      .from(this.table)
      .innerJoin(organizationProjectApiKeys, eq(organizationProjectApiKeys.apiKeyId, this.table.id))
      .where(
        and(
          eq(this.table.clientId, params.clientId),
          isNull(this.table.deletedAt),
          eq(this.table.isRevoked, false),
          eq(organizationProjectApiKeys.organizationId, params.organizationId),
          eq(organizationProjectApiKeys.projectId, params.projectId),
          isNull(organizationProjectApiKeys.deletedAt)
        )
      );

    return rows
      .map(
        (row: {
          apiKey: ApiKeyModel;
          organization_project_api_keys?: OrganizationProjectApiKeyModel;
        }) => this.toApiKey(row.apiKey)
      )
      .filter((key) => this.isActiveKey(key as ApiKeyModel));
  }

  public async getClientSecretHash(id: string, transaction?: Transaction): Promise<string | null> {
    const dbInstance = transaction ?? this.db;
    const result = await dbInstance
      .select({ clientSecretHash: this.table.clientSecretHash })
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);

    return result[0]?.clientSecretHash || null;
  }

  public async createApiKey(
    params: Omit<CreateApiKeyInput, 'scope'> & {
      clientId: string;
      clientSecretHash: string;
      createdBy: string;
    },
    transaction?: Transaction
  ): Promise<ApiKey> {
    return this.create(params, transaction);
  }

  public async updateClientSecretHash(
    id: string,
    clientSecretHash: string,
    transaction?: Transaction
  ): Promise<ApiKey> {
    const baseUpdateArgs: BaseUpdateArgs = {
      id,
      input: {
        clientSecretHash,
      },
    };

    return this.update(baseUpdateArgs, transaction);
  }

  public async updateLastUsedAt(
    id: string,
    lastUsedAt: Date,
    transaction?: Transaction
  ): Promise<ApiKey> {
    const baseUpdateArgs: BaseUpdateArgs = {
      id,
      input: {
        lastUsedAt,
      },
    };

    return this.update(baseUpdateArgs, transaction);
  }

  public async revokeApiKey(
    id: string,
    revokedBy: string,
    transaction?: Transaction
  ): Promise<ApiKey> {
    const baseUpdateArgs: BaseUpdateArgs = {
      id,
      input: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy,
      },
    };

    return this.update(baseUpdateArgs, transaction);
  }

  public async softDeleteApiKey(id: string, transaction?: Transaction): Promise<ApiKey> {
    return this.softDelete({ id }, transaction);
  }

  public async hardDeleteApiKey(id: string, transaction?: Transaction): Promise<ApiKey> {
    return this.hardDelete({ id }, transaction);
  }
}
