import type {
  IFileStorageServicePort,
  IProjectAppService,
  IProjectAppTagService,
  ITransactionalConnection,
} from '@grantjs/core';
import {
  ClearProjectAppPictureInput,
  ConfirmProjectAppPictureUploadInput,
  CreateProjectAppResult,
  MutationCreateProjectAppArgs,
  MutationDeleteProjectAppArgs,
  MutationUpdateProjectAppArgs,
  ProjectApp,
  ProjectAppPage,
  ProjectAppTag,
  QueryProjectAppsArgs,
  RequestProjectAppPictureUploadUrlInput,
  Scope,
  Tenant,
  UploadProjectAppPictureInput,
  UploadUrl,
} from '@grantjs/schema';

import { config } from '@/config';
import {
  type ProjectAppListHydrationContext,
  projectAppListHydrators,
} from '@/hydrators/project-apps.hydrators';
import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError, NotFoundError, ValidationError } from '@/lib/errors';
import { hydrateList, stripHydratedFields } from '@/lib/list-hydration/list-hydration.lib';
import { intersectScopedIds } from '@/lib/scope.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

export class ProjectAppsHandler extends CacheHandler {
  constructor(
    private readonly projectApps: IProjectAppService,
    private readonly projectAppTags: IProjectAppTagService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>,
    private readonly fileStorage: IFileStorageServicePort
  ) {
    super(cache, scopeServices);
  }

  public async getProjectApps(
    params: QueryProjectAppsArgs & SelectedFields<ProjectApp>
  ): Promise<ProjectAppPage> {
    const { scope, page, limit, search, sort, ids, tagIds, requestedFields } = params;
    if (scope.tenant !== Tenant.AccountProject && scope.tenant !== Tenant.OrganizationProject) {
      throw new BadRequestError(
        'projectApps requires scope tenant accountProject or organizationProject'
      );
    }

    let projectAppIds = await this.getScopedProjectAppIds(scope);

    if (tagIds && tagIds.length > 0) {
      const intersection = await this.projectAppTags.getProjectAppTagIntersection({
        projectAppIds,
        tagIds,
      });
      projectAppIds = intersection
        .filter(
          ({ projectAppId, tagId }) =>
            projectAppIds.includes(projectAppId) && tagIds.includes(tagId)
        )
        .map(({ projectAppId }) => projectAppId);
      projectAppIds = [...new Set(projectAppIds)];
    }

    projectAppIds = intersectScopedIds(projectAppIds, ids);

    if (projectAppIds.length === 0) {
      return {
        projectApps: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const projectId = this.extractProjectIdFromScope(scope);
    const repositoryRequestedFields = stripHydratedFields<ProjectApp>(
      requestedFields,
      projectAppListHydrators
    );
    const projectAppsResult = await this.projectApps.getProjectApps({
      projectId,
      ids: projectAppIds,
      page,
      limit,
      search,
      sort,
      requestedFields: repositoryRequestedFields,
    });

    return hydrateList({
      context: this.createProjectAppListHydrationContext(scope),
      hydrators: projectAppListHydrators,
      itemsKey: 'projectApps',
      page: projectAppsResult,
      requestedFields,
    });
  }

  private createProjectAppListHydrationContext(scope: Scope): ProjectAppListHydrationContext {
    return {
      loadScopedTags: async (projectAppIds) => {
        const pivots = await this.projectAppTags.getProjectAppTagsByProjectAppIds(projectAppIds);
        return this.hydrateScopedTagsForOwners({
          scope,
          ownerIds: projectAppIds,
          pivots,
          getOwnerId: (pivot) => pivot.projectAppId,
        });
      },
    };
  }

  public async createProjectApp(
    params: MutationCreateProjectAppArgs
  ): Promise<CreateProjectAppResult> {
    const { input } = params;
    const {
      scope,
      name,
      redirectUris,
      scopes,
      enabledProviders,
      allowSignUp,
      signUpRoleId,
      tagIds,
      primaryTagId,
    } = input;
    const { tenant } = scope;
    if (tenant !== Tenant.AccountProject && tenant !== Tenant.OrganizationProject) {
      throw new BadRequestError(
        'createProjectApp requires scope tenant accountProject or organizationProject'
      );
    }
    const projectId = this.extractProjectIdFromScope(scope);
    if (allowSignUp !== false) {
      if (!signUpRoleId) {
        throw new ValidationError(
          'signUpRoleId is required when allowSignUp is enabled. Select a role from the project.'
        );
      }
      const projectRoles = await this.scopeServices.projectRoles.getProjectRoles({ projectId });
      const projectRoleIds = new Set(projectRoles.map((pr) => pr.roleId));
      if (!projectRoleIds.has(signUpRoleId)) {
        throw new ValidationError(
          'signUpRoleId must be a role that exists in this project (project_roles).'
        );
      }
    }
    if (scopes != null && scopes.length > 0) {
      const allowed =
        await this.scopeServices.projectPermissions.getAllowedScopeSlugsForProject(projectId);
      const allowedSet = new Set(allowed);
      const invalid = scopes.filter((s) => !allowedSet.has(s));
      if (invalid.length > 0) {
        throw new ValidationError(
          `Scope(s) are not project permissions: ${invalid.join(', ')}. Allowed format: resource:action (e.g. user:read).`
        );
      }
    }
    return this.db.withTransaction(async (tx) => {
      const result = await this.projectApps.createProjectApp(
        {
          projectId,
          name,
          redirectUris,
          scopes,
          enabledProviders,
          allowSignUp,
          signUpRoleId,
        },
        tx
      );
      if (tagIds?.length) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.projectAppTags.addProjectAppTag(
              {
                projectAppId: result.id,
                tagId,
                isPrimary: tagId === primaryTagId,
              },
              tx
            )
          )
        );
      }
      await this.addProjectAppIdToScopeCache(scope, result.id);
      return result;
    });
  }

  public async updateProjectApp(params: MutationUpdateProjectAppArgs): Promise<ProjectApp> {
    const { id, input } = params;
    const {
      scope,
      name,
      redirectUris,
      scopes,
      enabledProviders,
      allowSignUp,
      signUpRoleId,
      primaryColor,
      showHelpPanel,
      themeMode,
      tagIds,
      primaryTagId,
    } = input;
    const { tenant } = scope;
    if (tenant !== Tenant.AccountProject && tenant !== Tenant.OrganizationProject) {
      throw new BadRequestError(
        'updateProjectApp requires scope tenant accountProject or organizationProject'
      );
    }
    const projectId = this.extractProjectIdFromScope(scope);
    const projectIds = await this.getScopedProjectIds(scope);
    if (!projectIds.includes(projectId)) {
      throw new BadRequestError('Project not in scope');
    }
    const existing = await this.projectApps.getProjectAppById(id);
    if (!existing) {
      throw new NotFoundError('ProjectApp');
    }
    const effectiveAllowSignUp = allowSignUp ?? existing.allowSignUp;
    const effectiveSignUpRoleId = signUpRoleId !== undefined ? signUpRoleId : existing.signUpRoleId;
    if (effectiveAllowSignUp !== false) {
      if (!effectiveSignUpRoleId) {
        throw new ValidationError(
          'signUpRoleId is required when allowSignUp is enabled. Select a role from the project.'
        );
      }
      const projectRoles = await this.scopeServices.projectRoles.getProjectRoles({ projectId });
      const projectRoleIds = new Set(projectRoles.map((pr) => pr.roleId));
      if (!projectRoleIds.has(effectiveSignUpRoleId)) {
        throw new ValidationError(
          'signUpRoleId must be a role that exists in this project (project_roles).'
        );
      }
    }
    if (scopes != null && scopes.length > 0) {
      const allowed =
        await this.scopeServices.projectPermissions.getAllowedScopeSlugsForProject(projectId);
      const allowedSet = new Set(allowed);
      const invalid = scopes.filter((s) => !allowedSet.has(s));
      if (invalid.length > 0) {
        throw new ValidationError(
          `Scope(s) are not project permissions: ${invalid.join(', ')}. Allowed format: resource:action (e.g. user:read).`
        );
      }
    }
    return this.db.withTransaction(async (tx) => {
      const updated = await this.projectApps.updateProjectApp(
        {
          id,
          projectId,
          name,
          redirectUris,
          scopes,
          enabledProviders,
          allowSignUp,
          signUpRoleId,
          primaryColor,
          showHelpPanel,
          themeMode,
        },
        tx
      );
      if (Array.isArray(tagIds)) {
        const current = await this.projectAppTags.getProjectAppTags({ projectAppId: id }, tx);
        const currentTagIds = new Set(current.map((pt) => pt.tagId));
        const desiredTagIds = new Set(tagIds);
        const toAdd = tagIds.filter((tagId) => !currentTagIds.has(tagId));
        const toRemove = current.filter((pt) => !desiredTagIds.has(pt.tagId));
        for (const tagId of toAdd) {
          await this.projectAppTags.addProjectAppTag(
            { projectAppId: id, tagId, isPrimary: tagId === primaryTagId },
            tx
          );
        }
        for (const pt of toRemove) {
          await this.projectAppTags.removeProjectAppTag({ projectAppId: id, tagId: pt.tagId }, tx);
        }
        const afterAddRemove = await this.projectAppTags.getProjectAppTags(
          { projectAppId: id },
          tx
        );
        for (const pt of afterAddRemove) {
          const shouldBePrimary = pt.tagId === primaryTagId;
          if (pt.isPrimary !== shouldBePrimary) {
            await this.projectAppTags.updateProjectAppTag(
              { projectAppId: id, tagId: pt.tagId, isPrimary: shouldBePrimary },
              tx
            );
          }
        }
      } else if (primaryTagId !== undefined) {
        const current = await this.projectAppTags.getProjectAppTags({ projectAppId: id }, tx);
        if (primaryTagId && !current.some((pt) => pt.tagId === primaryTagId)) {
          throw new BadRequestError('Primary tag must be one of the project app assigned tags');
        }
        await Promise.all(
          current.map((pt) =>
            this.projectAppTags.updateProjectAppTag(
              {
                projectAppId: id,
                tagId: pt.tagId,
                isPrimary: primaryTagId ? pt.tagId === primaryTagId : false,
              },
              tx
            )
          )
        );
      }
      return updated;
    });
  }

  public async getProjectAppTags(params: { projectAppId: string }): Promise<ProjectAppTag[]> {
    return this.projectAppTags.getProjectAppTags(params);
  }

  public async deleteProjectApp(params: MutationDeleteProjectAppArgs): Promise<ProjectApp> {
    const { scope, id } = params;
    const { tenant } = scope;
    if (tenant !== Tenant.AccountProject && tenant !== Tenant.OrganizationProject) {
      throw new BadRequestError(
        'deleteProjectApp requires scope tenant accountProject or organizationProject'
      );
    }
    const projectId = this.extractProjectIdFromScope(scope);
    const projectIds = await this.getScopedProjectIds(scope);
    if (!projectIds.includes(projectId)) {
      throw new BadRequestError('Project not in scope');
    }
    const deleted = await this.db.withTransaction((tx) =>
      this.projectApps.deleteProjectApp({ id, projectId }, tx)
    );
    await this.removeProjectAppIdFromScopeCache(scope, id);
    return deleted;
  }

  private async assertProjectAppPictureScope(
    projectAppId: string,
    scope: UploadProjectAppPictureInput['scope']
  ): Promise<void> {
    if (scope.tenant !== Tenant.AccountProject && scope.tenant !== Tenant.OrganizationProject) {
      throw new ValidationError(
        'project-app pictures require accountProject or organizationProject scope'
      );
    }
    const projectId = this.extractProjectIdFromScope(scope);
    const app = await this.projectApps.getProjectAppById(projectAppId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
    if (app.projectId !== projectId) {
      throw new ValidationError('projectAppId must belong to the scoped project');
    }
  }

  private projectAppPicturePath(projectAppId: string, filename: string): string {
    return this.fileStorage.sanitizeExtensionAndGeneratePath(
      filename,
      `project-apps/${projectAppId}/picture`
    );
  }

  public async requestProjectAppPictureUploadUrl(
    params: RequestProjectAppPictureUploadUrlInput
  ): Promise<UploadUrl> {
    const { projectAppId, filename, contentType, contentLength, scope } = params;
    await this.assertProjectAppPictureScope(projectAppId, scope);
    this.fileStorage.validateUploadRequest({ contentType, filename, contentLength });
    const minted = await this.fileStorage.getUploadUrl(
      this.projectAppPicturePath(projectAppId, filename),
      {
        contentType,
        contentLength,
        expiresInSeconds: config.storage.upload.urlExpirySeconds,
      }
    );
    return {
      url: minted.url,
      method: minted.method,
      expiresAt: minted.expiresAt,
      headers: Object.entries(minted.headers).map(([name, value]) => ({ name, value })),
    };
  }

  public async confirmProjectAppPictureUpload(
    params: ConfirmProjectAppPictureUploadInput
  ): Promise<{ url: string; path: string }> {
    const { projectAppId, filename, scope } = params;
    await this.assertProjectAppPictureScope(projectAppId, scope);
    const storagePath = this.projectAppPicturePath(projectAppId, filename);
    await this.fileStorage.assertStoredWithinPolicy(storagePath);
    return await this.db.withTransaction(async (tx: Transaction) => {
      const url = await this.fileStorage.getUrl(storagePath);
      await this.projectApps.setProjectAppPicture(projectAppId, { picturePath: storagePath }, tx);
      return { url, path: storagePath };
    });
  }

  public async uploadProjectAppPicture(
    params: UploadProjectAppPictureInput
  ): Promise<{ url: string; path: string }> {
    const { projectAppId, file, contentType, filename, scope } = params;
    await this.assertProjectAppPictureScope(projectAppId, scope);
    const fileBuffer = this.fileStorage.validateAndDecodeUpload({ file, contentType, filename });
    const storagePath = this.projectAppPicturePath(projectAppId, filename);
    return await this.db.withTransaction(async (tx: Transaction) => {
      const result = await this.fileStorage.upload(fileBuffer, storagePath, {
        contentType,
        public: true,
      });
      await this.projectApps.setProjectAppPicture(projectAppId, { picturePath: result.path }, tx);
      return { url: result.url, path: result.path };
    });
  }

  public async clearProjectAppPicture(params: ClearProjectAppPictureInput): Promise<ProjectApp> {
    await this.assertProjectAppPictureScope(params.projectAppId, params.scope);
    return await this.db.withTransaction(async (tx: Transaction) => {
      return this.projectApps.setProjectAppPicture(
        params.projectAppId,
        { picturePath: null, pictureUrl: null },
        tx
      );
    });
  }
}
