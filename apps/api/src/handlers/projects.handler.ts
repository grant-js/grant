import {
  MutationCreateProjectArgs,
  MutationDeleteProjectArgs,
  MutationUpdateProjectArgs,
  Project,
  ProjectPage,
  QueryProjectsArgs,
  Tenant,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

import type {
  IAccountProjectService,
  IAccountProjectTagService,
  IOrganizationProjectService,
  IOrganizationProjectTagService,
  IProjectGroupService,
  IProjectPermissionService,
  IProjectRoleService,
  IProjectService,
  IProjectTagService,
  IProjectUserService,
  ITransactionalConnection,
} from '@grantjs/core';

export class ProjectHandler extends CacheHandler {
  constructor(
    private readonly organizationProjectTags: IOrganizationProjectTagService,
    private readonly accountProjectTags: IAccountProjectTagService,
    private readonly projects: IProjectService,
    private readonly accountProjects: IAccountProjectService,
    private readonly organizationProjects: IOrganizationProjectService,
    private readonly projectTags: IProjectTagService,
    private readonly projectPermissions: IProjectPermissionService,
    private readonly projectGroups: IProjectGroupService,
    private readonly projectRoles: IProjectRoleService,
    private readonly projectUsers: IProjectUserService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async getProjects(
    params: QueryProjectsArgs & SelectedFields<Project>
  ): Promise<ProjectPage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let projectIds = await this.getScopedProjectIds(scope);

    if (tagIds && tagIds.length > 0) {
      switch (scope.tenant) {
        case Tenant.Organization:
          {
            const organizationId = scope.id;
            const organizationProjectTags =
              await this.organizationProjectTags.getOrganizationProjectTagIntersection(
                organizationId,
                projectIds,
                tagIds
              );
            projectIds = organizationProjectTags
              .filter(
                ({ projectId, tagId }) => projectIds.includes(projectId) && tagIds.includes(tagId)
              )
              .map(({ projectId }) => projectId);
          }
          break;
        case Tenant.Account:
          {
            const accountId = scope.id;
            const accountProjectTags =
              await this.accountProjectTags.getAccountProjectTagIntersection(
                accountId,
                projectIds,
                tagIds
              );
            projectIds = accountProjectTags
              .filter(
                ({ projectId, tagId }) => projectIds.includes(projectId) && tagIds.includes(tagId)
              )
              .map(({ projectId }) => projectId);
          }
          break;
        default:
          throw new BadRequestError('Invalid scope');
      }
    }

    if (ids && ids.length > 0) {
      projectIds = ids.filter((projectId) => projectIds.includes(projectId));
    }

    if (projectIds.length === 0) {
      return {
        projects: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const projectsResult = await this.projects.getProjects({
      ids: projectIds,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return projectsResult;
  }

  public async createProject(params: MutationCreateProjectArgs): Promise<Project> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { name, description, scope, tagIds, primaryTagId } = input;

      const project = await this.projects.createProject({ name, description }, tx);
      const { id: projectId } = project;

      switch (scope.tenant) {
        case Tenant.Account:
          await this.accountProjects.addAccountProject({ accountId: scope.id, projectId }, tx);
          break;
        case Tenant.Organization:
          await this.organizationProjects.addOrganizationProject(
            { organizationId: scope.id, projectId },
            tx
          );
          break;
        default:
          throw new BadRequestError('Invalid scope');
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) => {
            switch (scope.tenant) {
              case Tenant.Organization:
                return this.organizationProjectTags.addOrganizationProjectTag(
                  { organizationId: scope.id, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                );
              case Tenant.Account:
                return this.accountProjectTags.addAccountProjectTag(
                  { accountId: scope.id, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                );
              default:
                throw new BadRequestError('Invalid scope');
            }
          })
        );
      }

      this.addProjectIdToScopeCache(scope, projectId);

      return project;
    });
  }

  public async updateProject(params: MutationUpdateProjectArgs): Promise<Project> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: projectId, input } = params;
      const { scope, tagIds, primaryTagId } = input;
      let currentTagIds: string[] = [];

      if (Array.isArray(tagIds)) {
        switch (scope.tenant) {
          case Tenant.Organization:
            {
              const organizationId = scope.id;
              const currentTags = await this.organizationProjectTags.getOrganizationProjectTags(
                { organizationId, projectId },
                tx
              );
              currentTagIds = currentTags.map((pt) => pt.tagId);
            }
            break;
          case Tenant.Account:
            {
              const accountId = scope.id;
              const currentTags = await this.accountProjectTags.getAccountProjectTags(
                { accountId, projectId },
                tx
              );
              currentTagIds = currentTags.map((pt) => pt.tagId);
            }
            break;
          default:
            throw new BadRequestError('Invalid scope');
        }
      }

      const updatedProject = await this.projects.updateProject(params, tx);

      if (Array.isArray(tagIds)) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        switch (scope.tenant) {
          case Tenant.Organization: {
            const organizationId = scope.id;
            await Promise.all(
              updatedTagIds.map((tagId) =>
                this.organizationProjectTags.updateOrganizationProjectTag(
                  { organizationId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              newTagIds.map((tagId) =>
                this.organizationProjectTags.addOrganizationProjectTag(
                  { organizationId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              removedTagIds.map((tagId) =>
                this.organizationProjectTags.removeOrganizationProjectTag(
                  { organizationId, projectId, tagId },
                  tx
                )
              )
            );
            break;
          }
          case Tenant.Account: {
            const accountId = scope.id;
            await Promise.all(
              updatedTagIds.map((tagId) =>
                this.accountProjectTags.updateAccountProjectTag(
                  { accountId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              newTagIds.map((tagId) =>
                this.accountProjectTags.addAccountProjectTag(
                  { accountId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              removedTagIds.map((tagId) =>
                this.accountProjectTags.removeAccountProjectTag({ accountId, projectId, tagId }, tx)
              )
            );
            break;
          }
          default:
            throw new BadRequestError('Invalid scope');
        }
      }
      return updatedProject;
    });
  }

  public async deleteProject(params: MutationDeleteProjectArgs & DeleteParams): Promise<Project> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: projectId, scope } = params;

      // Query common project data (not tenant-specific)
      const [projectTags, projectPermissions, projectGroups, projectRoles, projectUsers] =
        await Promise.all([
          this.projectTags.getProjectTags({ projectId }, tx),
          this.projectPermissions.getProjectPermissions({ projectId }, tx),
          this.projectGroups.getProjectGroups({ projectId }, tx),
          this.projectRoles.getProjectRoles({ projectId }, tx),
          this.projectUsers.getProjectUsers({ projectId }, tx),
        ]);

      const tagIds = projectTags.map((pt) => pt.tagId);
      const permissionIds = projectPermissions.map((pp) => pp.permissionId);
      const groupIds = projectGroups.map((pg) => pg.groupId);
      const roleIds = projectRoles.map((pr) => pr.roleId);
      const userIds = projectUsers.map((pu) => pu.userId);

      switch (scope.tenant) {
        case Tenant.Account: {
          const accountId = scope.id;

          const accountProjectTags = await this.accountProjectTags.getAccountProjectTags(
            { accountId, projectId },
            tx
          );
          const accountTagIds = accountProjectTags.map((apt) => apt.tagId);

          await this.accountProjects.removeAccountProject({ accountId, projectId }, tx);

          await Promise.all(
            accountTagIds.map((tagId) =>
              this.accountProjectTags.removeAccountProjectTag({ accountId, projectId, tagId }, tx)
            )
          );
          break;
        }
        case Tenant.Organization: {
          const organizationId = scope.id;

          const organizationProjectTags =
            await this.organizationProjectTags.getOrganizationProjectTags(
              { organizationId, projectId },
              tx
            );
          const organizationTagIds = organizationProjectTags.map((opt) => opt.tagId);

          await this.organizationProjects.removeOrganizationProject(
            { organizationId, projectId },
            tx
          );

          await Promise.all(
            organizationTagIds.map((tagId) =>
              this.organizationProjectTags.removeOrganizationProjectTag(
                { organizationId, projectId, tagId },
                tx
              )
            )
          );
          break;
        }
        default:
          throw new BadRequestError('Invalid scope');
      }

      await Promise.all([
        ...tagIds.map((tagId) => this.projectTags.removeProjectTag({ projectId, tagId }, tx)),
        ...permissionIds.map((permissionId) =>
          this.projectPermissions.removeProjectPermission({ projectId, permissionId }, tx)
        ),
        ...groupIds.map((groupId) =>
          this.projectGroups.removeProjectGroup({ projectId, groupId }, tx)
        ),
        ...roleIds.map((roleId) => this.projectRoles.removeProjectRole({ projectId, roleId }, tx)),
        ...userIds.map((userId) => this.projectUsers.removeProjectUser({ projectId, userId }, tx)),
      ]);

      this.removeProjectIdFromScopeCache(scope, projectId);

      return await this.projects.deleteProject(params, tx);
    });
  }
}
