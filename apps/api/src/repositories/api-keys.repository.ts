import { ApiKeyModel, apiKeys, users } from '@logusgraphics/grant-database';
import {
  ApiKey,
  ApiKeyPage,
  ApiKeySearchableField,
  QueryApiKeysArgs,
  User,
} from '@logusgraphics/grant-schema';
import { eq } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/services/common';

import {
  BaseUpdateArgs,
  EntityRepository,
  FilterCondition,
  RelationsConfig,
} from './common/EntityRepository';

export class ApiKeyRepository extends EntityRepository<ApiKeyModel, ApiKey> {
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
    params: {
      clientId: string;
      clientSecretHash: string;
      name?: string | null;
      description?: string | null;
      expiresAt?: Date | null;
      createdBy: string;
    },
    transaction?: Transaction
  ): Promise<ApiKey> {
    return this.create(params, transaction);
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
