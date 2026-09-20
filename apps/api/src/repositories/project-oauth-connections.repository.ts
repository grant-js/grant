import type {
  IProjectOAuthConnectionRepository,
  ProjectOAuthConnectionSecretRecord,
} from '@grantjs/core';
import type { ProjectOAuthConnectionModel } from '@grantjs/database';
import { projectOAuthConnections } from '@grantjs/database';
import {
  type ProjectOAuthConnection,
  ProjectOAuthConnectionProvider,
  SortOrder,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import {
  EntityRepository,
  type FilterCondition,
  type RelationsConfig,
} from '@/repositories/common';

function toPublicConnection(row: ProjectOAuthConnectionModel): ProjectOAuthConnection {
  return {
    id: row.id,
    projectId: row.projectId,
    provider: row.provider as ProjectOAuthConnectionProvider,
    clientId: row.clientId,
    isConfigured: Boolean(row.encryptedSecret && row.secretIv && row.secretTag),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? undefined,
  };
}

function toSecretRecord(row: ProjectOAuthConnectionModel): ProjectOAuthConnectionSecretRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    provider: row.provider,
    clientId: row.clientId,
    encryptedSecret: row.encryptedSecret,
    secretIv: row.secretIv,
    secretTag: row.secretTag,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ProjectOAuthConnectionRepository
  extends EntityRepository<ProjectOAuthConnectionModel, ProjectOAuthConnectionModel>
  implements IProjectOAuthConnectionRepository
{
  protected table = projectOAuthConnections;
  protected schemaName = 'projectOAuthConnections' as const;
  protected searchFields: Array<keyof ProjectOAuthConnectionModel> = ['provider', 'clientId'];
  protected defaultSortField: keyof ProjectOAuthConnectionModel = 'provider';
  protected relations: RelationsConfig<ProjectOAuthConnectionModel> = {};

  private projectProviderFilters(
    projectId: string,
    provider?: ProjectOAuthConnectionProvider
  ): FilterCondition<ProjectOAuthConnectionModel>[] {
    const filters: FilterCondition<ProjectOAuthConnectionModel>[] = [
      { field: 'projectId', operator: 'eq', value: projectId },
    ];
    if (provider) {
      filters.push({ field: 'provider', operator: 'eq', value: provider });
    }
    return filters;
  }

  async listByProject(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectOAuthConnection[]> {
    const result = await this.query(
      {
        filters: this.projectProviderFilters(projectId),
        sort: { field: 'provider', order: SortOrder.Asc },
        limit: -1,
      },
      transaction
    );
    return result.items.map(toPublicConnection);
  }

  async getSecretByProjectAndProvider(
    projectId: string,
    provider: ProjectOAuthConnectionProvider,
    transaction?: Transaction
  ): Promise<ProjectOAuthConnectionSecretRecord | null> {
    const result = await this.query(
      { filters: this.projectProviderFilters(projectId, provider), limit: 1 },
      transaction
    );
    const row = result.items[0];
    return row ? toSecretRecord(row) : null;
  }

  async upsertConnection(
    params: {
      projectId: string;
      provider: ProjectOAuthConnectionProvider;
      clientId: string;
      encryptedSecret: string;
      secretIv: string;
      secretTag: string;
    },
    transaction?: Transaction
  ): Promise<ProjectOAuthConnection> {
    const existing = await this.getSecretByProjectAndProvider(
      params.projectId,
      params.provider,
      transaction
    );
    if (!existing) {
      const created = await this.create(
        {
          projectId: params.projectId,
          provider: params.provider,
          clientId: params.clientId,
          encryptedSecret: params.encryptedSecret,
          secretIv: params.secretIv,
          secretTag: params.secretTag,
        },
        transaction
      );
      return toPublicConnection(created);
    }

    const updated = await this.update(
      {
        id: existing.id,
        input: {
          clientId: params.clientId,
          encryptedSecret: params.encryptedSecret,
          secretIv: params.secretIv,
          secretTag: params.secretTag,
        },
      },
      transaction
    );
    return toPublicConnection(updated);
  }

  async hardDeleteById(id: string, transaction?: Transaction): Promise<void> {
    await this.hardDelete({ id }, transaction);
  }
}
