import {
  ProjectUserApiKeyModel,
  projectUserApiKeys,
  projects,
  users,
} from '@logusgraphics/grant-database';
import {
  Project,
  ProjectUserApiKey,
  ProjectUserApiKeyPage,
  QueryProjectUserApiKeysArgs,
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

export class ProjectUserApiKeyRepository extends EntityRepository<
  ProjectUserApiKeyModel,
  ProjectUserApiKey
> {
  protected table = projectUserApiKeys;
  protected schemaName = 'projectUserApiKeys' as const;
  protected searchFields: Array<keyof ProjectUserApiKeyModel> = ['clientId', 'name'];
  protected defaultSortField: keyof ProjectUserApiKeyModel = 'createdAt';
  protected relations: RelationsConfig<ProjectUserApiKey> = {
    project: {
      field: 'project',
      table: projects,
      extract: (v: Project) => v,
    },
    user: {
      field: 'user',
      table: users,
      extract: (v: User) => v,
    },
  };

  public async findByClientId(
    clientId: string,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey | null> {
    const filters: FilterCondition<ProjectUserApiKeyModel>[] = [
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

  public async getProjectUserApiKey(
    id: string,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey | null> {
    const result = await this.query({ ids: [id], limit: 1 }, transaction);
    return result.items[0] || null;
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

  public async findActiveByClientId(
    clientId: string,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey | null> {
    const now = new Date();
    const filters: FilterCondition<ProjectUserApiKeyModel>[] = [
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

  public async findByProjectAndUser(
    projectId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey[]> {
    const filters: FilterCondition<ProjectUserApiKeyModel>[] = [
      {
        field: 'projectId',
        operator: 'eq',
        value: projectId,
      },
      {
        field: 'userId',
        operator: 'eq',
        value: userId,
      },
    ];

    const result = await this.query(
      {
        filters,
        limit: -1,
      },
      transaction
    );

    return result.items;
  }

  public async getProjectUserApiKeys(
    params: QueryProjectUserApiKeysArgs & SelectedFields<ProjectUserApiKey>,
    transaction?: Transaction
  ): Promise<ProjectUserApiKeyPage> {
    const filters: FilterCondition<ProjectUserApiKeyModel>[] = [
      {
        field: 'projectId',
        operator: 'eq',
        value: params.projectId,
      },
      {
        field: 'userId',
        operator: 'eq',
        value: params.userId,
      },
    ];

    const { page, limit, search, sort, requestedFields } = params;

    const result = await this.query(
      {
        page,
        limit,
        search,
        sort,
        requestedFields,
        filters,
      },
      transaction
    );

    return {
      projectUserApiKeys: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createProjectUserApiKey(
    params: {
      projectId: string;
      userId: string;
      clientId: string;
      clientSecretHash: string;
      name?: string | null;
      description?: string | null;
      expiresAt?: Date | null;
      createdBy: string;
    },
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    return this.create(params, transaction);
  }

  public async updateLastUsedAt(
    id: string,
    lastUsedAt: Date,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
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
  ): Promise<ProjectUserApiKey> {
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

  public async softDeleteProjectUserApiKey(
    id: string,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    return this.softDelete({ id }, transaction);
  }

  public async hardDeleteProjectUserApiKey(
    id: string,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    return this.hardDelete({ id }, transaction);
  }
}
