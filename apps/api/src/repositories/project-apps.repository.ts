import type { IProjectAppRepository } from '@grantjs/core';
import type { ProjectAppModel } from '@grantjs/database';
import { projectApps, projectAppTags } from '@grantjs/database';
import {
  type CreateProjectAppInput,
  type CreateProjectAppResult,
  type MutationDeleteProjectAppArgs,
  type ProjectApp,
  type ProjectAppPage,
  ProjectAppSearchableField,
  ProjectAppSortableField,
  type QueryProjectAppsArgs,
  Tag,
  type UpdateProjectAppInput,
} from '@grantjs/schema';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import {
  BaseCreateArgs,
  BaseDeleteArgs,
  BaseUpdateArgs,
  EntityRepository,
  FilterCondition,
  RelationsConfig,
} from '@/repositories/common';
import { SelectedFields } from '@/types';

function toProjectApp(row: ProjectAppModel & { tags?: ProjectApp['tags'] }): ProjectApp {
  return {
    id: row.id,
    projectId: row.projectId,
    clientId: row.clientId,
    name: row.name ?? undefined,
    pictureUrl: row.pictureUrl ?? undefined,
    // Hydrate reads path then strips it before the client sees the app.
    picturePath: row.picturePath ?? undefined,
    primaryColor: row.primaryColor ?? undefined,
    showHelpPanel: row.showHelpPanel ?? undefined,
    themeMode: row.themeMode ?? undefined,
    redirectUris: (row.redirectUris as string[]) ?? [],
    scopes: (row.scopes as string[] | null) ?? null,
    enabledProviders: (row.enabledProviders as string[] | null) ?? null,
    allowSignUp: row.allowSignUp ?? true,
    signUpRoleId: (row as { signUpRoleId?: string | null }).signUpRoleId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? undefined,
    ...(row.tags !== undefined && { tags: row.tags }),
  } as ProjectApp;
}

export class ProjectAppRepository
  extends EntityRepository<ProjectAppModel, ProjectApp>
  implements IProjectAppRepository
{
  protected table = projectApps;
  protected schemaName = 'projectApps' as const;
  protected searchFields: Array<keyof ProjectAppModel> = Object.values(ProjectAppSearchableField);
  protected defaultSortField: keyof ProjectAppModel = ProjectAppSortableField.CreatedAt;
  protected relations: RelationsConfig<ProjectApp> = {
    tags: {
      field: 'tag',
      table: projectAppTags,
      extract: (v: Array<{ tag: Tag; isPrimary: boolean }>) =>
        v.map(({ tag, isPrimary }) => ({ ...tag, isPrimary })),
    },
  };

  public async getProjectApps(
    params: Omit<QueryProjectAppsArgs, 'scope'> & {
      projectId: string;
    } & SelectedFields<ProjectApp>,
    transaction?: Transaction
  ): Promise<ProjectAppPage> {
    const projectIdFilter: FilterCondition<ProjectAppModel> = {
      field: 'projectId',
      operator: 'eq',
      value: params.projectId,
    };

    const result = await this.query(
      {
        ids: params.ids ?? undefined,
        search: params.search ?? undefined,
        sort: params.sort ?? undefined,
        page: params.page,
        limit: params.limit ?? undefined,
        requestedFields: params.requestedFields ?? undefined,
        filters: projectIdFilter,
      },
      transaction
    );

    return {
      projectApps: result.items.map((row) =>
        toProjectApp(row as ProjectAppModel & { tags?: ProjectApp['tags'] })
      ),
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createProjectApp(
    params: Omit<CreateProjectAppInput, 'scope'> & {
      projectId: string;
      clientSecretHash?: string | null;
    },
    transaction?: Transaction
  ): Promise<CreateProjectAppResult> {
    const clientId = crypto.randomUUID();
    const data: BaseCreateArgs = {
      projectId: params.projectId,
      clientId,
      name: params.name ?? null,
      redirectUris: params.redirectUris,
      scopes: params.scopes ?? null,
      enabledProviders: params.enabledProviders ?? null,
      allowSignUp: params.allowSignUp ?? true,
      signUpRoleId: params.signUpRoleId ?? null,
      ...(params.clientSecretHash != null && { clientSecretHash: params.clientSecretHash }),
    };

    const entity = (await this.create(data, transaction)) as ProjectApp;

    const row = entity as ProjectAppModel;
    return {
      id: row.id,
      clientId: row.clientId,
      clientSecret: undefined,
      name: row.name ?? undefined,
      redirectUris: row.redirectUris,
      allowSignUp: row.allowSignUp ?? true,
      signUpRoleId: row.signUpRoleId ?? undefined,
      createdAt: row.createdAt,
    };
  }

  public async getProjectAppById(
    id: string,
    transaction?: Transaction
  ): Promise<ProjectApp | null> {
    const result = await this.query({ ids: [id], limit: 1 }, transaction);
    const row = this.first(result.items);
    return row ? toProjectApp(row as ProjectAppModel & { tags?: ProjectApp['tags'] }) : null;
  }

  public async getProjectAppByClientId(
    clientId: string,
    transaction?: Transaction
  ): Promise<ProjectApp | null> {
    const filters: FilterCondition<ProjectAppModel>[] = [
      { field: 'clientId', operator: 'eq', value: clientId },
    ];
    const result = await this.query({ filters, limit: 1 }, transaction);
    const row = this.first(result.items);
    return row ? toProjectApp(row as ProjectAppModel & { tags?: ProjectApp['tags'] }) : null;
  }

  public async updateProjectApp(
    params: { id: string; projectId: string } & Omit<UpdateProjectAppInput, 'scope'>,
    transaction?: Transaction
  ): Promise<ProjectApp> {
    const input: Record<string, unknown> = {};
    if (params.name !== undefined) input.name = params.name ?? null;
    if (params.redirectUris !== undefined && params.redirectUris !== null) {
      input.redirectUris = params.redirectUris;
    }
    if (params.scopes !== undefined) input.scopes = params.scopes ?? null;
    if (params.enabledProviders !== undefined)
      input.enabledProviders = params.enabledProviders ?? null;
    if (params.allowSignUp !== undefined) input.allowSignUp = params.allowSignUp;
    if (params.signUpRoleId !== undefined) input.signUpRoleId = params.signUpRoleId ?? null;
    if (params.primaryColor !== undefined) input.primaryColor = params.primaryColor ?? null;
    if (params.showHelpPanel !== undefined) input.showHelpPanel = params.showHelpPanel ?? null;
    if (params.themeMode !== undefined) input.themeMode = params.themeMode ?? null;

    const baseParams: BaseUpdateArgs = { id: params.id, input };
    const updated = await this.update(baseParams, transaction);
    if (!updated) {
      throw new NotFoundError('ProjectApp');
    }
    return toProjectApp(updated as ProjectAppModel);
  }

  public async setProjectAppPicture(
    projectAppId: string,
    input: { picturePath?: string | null; pictureUrl?: string | null },
    transaction?: Transaction
  ): Promise<ProjectApp> {
    const updated = await this.update({ id: projectAppId, input }, transaction);
    if (!updated) {
      throw new NotFoundError('ProjectApp');
    }
    return toProjectApp(updated as ProjectAppModel);
  }

  public async softDeleteProjectApp(
    params: Omit<MutationDeleteProjectAppArgs, 'scope'> & { projectId: string },
    transaction?: Transaction
  ): Promise<ProjectApp> {
    const baseParams: BaseDeleteArgs = { id: params.id };
    const deleted = await this.softDelete(baseParams, transaction);
    if (!deleted) {
      throw new NotFoundError('ProjectApp');
    }
    return toProjectApp(deleted as ProjectAppModel);
  }
}
