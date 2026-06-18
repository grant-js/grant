import type {
  IProjectAppService,
  IProjectAppTagService,
  ITransactionalConnection,
} from '@grantjs/core';
import {
  CreateProjectAppResult,
  MutationCreateProjectAppArgs,
  MutationDeleteProjectAppArgs,
  MutationUpdateProjectAppArgs,
  ProjectApp,
  ProjectAppPage,
  ProjectAppTag,
  QueryProjectAppsArgs,
  Tenant,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError, NotFoundError, ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

export class ProjectAppsHandler extends CacheHandler {
  constructor(
    private readonly projectApps: IProjectAppService,
    private readonly projectAppTags: IProjectAppTagService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
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

    if (ids && ids.length > 0) {
      projectAppIds = ids.filter((id) => projectAppIds.includes(id));
    }

    if (projectAppIds.length === 0) {
      return {
        projectApps: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const projectId = this.extractProjectIdFromScope(scope);
    return this.projectApps.getProjectApps({
      projectId,
      ids: projectAppIds,
      page,
      limit,
      search,
      sort,
      requestedFields,
    });
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
}
