import { DbSchema } from '@logusgraphics/grant-database';
import {
  MutationCreateProjectArgs,
  MutationDeleteProjectArgs,
  MutationUpdateProjectArgs,
  Project,
  ProjectPage,
  QueryProjectsArgs,
  Tenant,
} from '@logusgraphics/grant-schema';

import { ScopeHandler } from './base/scope-handler';

import { IEntityCacheAdapter } from '@/lib/cache';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

export class ProjectHandler extends ScopeHandler {
  constructor(
    readonly scopeCache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getProjects(
    params: QueryProjectsArgs & SelectedFields<Project>
  ): Promise<ProjectPage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let projectIds = await this.getScopedProjectIds(scope);

    if (tagIds && tagIds.length > 0) {
      const projectTags = await this.services.projectTags.getProjectTagIntersection(
        projectIds,
        tagIds
      );
      projectIds = projectTags
        .filter(({ projectId, tagId }) => projectIds.includes(projectId) && tagIds.includes(tagId))
        .map(({ projectId }) => projectId);
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

    const projectsResult = await this.services.projects.getProjects({
      ids: projectIds,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    if (Array.isArray(requestedFields) && requestedFields.includes('tags')) {
      const scopedTagIds = await this.getScopedTagIds(scope);
      return {
        ...projectsResult,
        projects: projectsResult.projects.map((project) => {
          if (Array.isArray(project.tags)) {
            return {
              ...project,
              tags: project.tags.filter((tag) => scopedTagIds.includes(tag.id)),
            };
          }
          return project;
        }),
      };
    }

    return projectsResult;
  }

  public async createProject(params: MutationCreateProjectArgs): Promise<Project> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { name, description, scope, tagIds, primaryTagId } = input;

      const project = await this.services.projects.createProject({ name, description }, tx);
      const { id: projectId } = project;

      switch (scope.tenant) {
        case Tenant.Account:
          await this.services.accountProjects.addAccountProject(
            { accountId: scope.id, projectId },
            tx
          );
          break;
        case Tenant.Organization:
          await this.services.organizationProjects.addOrganizationProject(
            { organizationId: scope.id, projectId },
            tx
          );
          break;
        default:
          throw new Error('Invalid scope');
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.services.projectTags.addProjectTag(
              { projectId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      }

      this.addProjectIdToScopeCache(scope, projectId);

      return project;
    });
  }

  public async updateProject(params: MutationUpdateProjectArgs): Promise<Project> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: projectId, input } = params;
      const { tagIds, primaryTagId } = input;
      let currentTagIds: string[] = [];
      if (tagIds && tagIds.length > 0) {
        const currentTags = await this.services.projectTags.getProjectTags({ projectId }, tx);
        currentTagIds = currentTags.map((pt) => pt.tagId);
      }
      const updatedProject = await this.services.projects.updateProject(params, tx);
      if (tagIds && tagIds.length > 0) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        await Promise.all(
          updatedTagIds.map((tagId) =>
            this.services.projectTags.updateProjectTag(
              { projectId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
        await Promise.all(
          newTagIds.map((tagId) =>
            this.services.projectTags.addProjectTag(
              { projectId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
        await Promise.all(
          removedTagIds.map((tagId) =>
            this.services.projectTags.removeProjectTag({ projectId, tagId }, tx)
          )
        );
      }
      return updatedProject;
    });
  }

  public async deleteProject(params: MutationDeleteProjectArgs & DeleteParams): Promise<Project> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: projectId, scope } = params;
      const organizationId = scope.id;
      const [projectTags, projectPermissions, projectGroups, projectRoles, projectUsers] =
        await Promise.all([
          this.services.projectTags.getProjectTags({ projectId }, tx),
          this.services.projectPermissions.getProjectPermissions({ projectId }, tx),
          this.services.projectGroups.getProjectGroups({ projectId }, tx),
          this.services.projectRoles.getProjectRoles({ projectId }, tx),
          this.services.projectUsers.getProjectUsers({ projectId }, tx),
        ]);

      const tagIds = projectTags.map((pt) => pt.tagId);
      const permissionIds = projectPermissions.map((pp) => pp.permissionId);
      const groupIds = projectGroups.map((pg) => pg.groupId);
      const roleIds = projectRoles.map((pr) => pr.roleId);
      const userIds = projectUsers.map((pu) => pu.userId);
      switch (scope.tenant) {
        case Tenant.Account:
          await this.services.accountProjects.removeAccountProject(
            { accountId: scope.id, projectId },
            tx
          );
          break;
        case Tenant.Organization:
          await this.services.organizationProjects.removeOrganizationProject(
            { organizationId, projectId },
            tx
          );
          break;
        default:
          throw new Error('Invalid scope');
      }
      await Promise.all([
        ...tagIds.map((tagId) =>
          this.services.projectTags.removeProjectTag({ projectId, tagId }, tx)
        ),
        ...permissionIds.map((permissionId) =>
          this.services.projectPermissions.removeProjectPermission({ projectId, permissionId }, tx)
        ),
        ...groupIds.map((groupId) =>
          this.services.projectGroups.removeProjectGroup({ projectId, groupId }, tx)
        ),
        ...roleIds.map((roleId) =>
          this.services.projectRoles.removeProjectRole({ projectId, roleId }, tx)
        ),
        ...userIds.map((userId) =>
          this.services.projectUsers.removeProjectUser({ projectId, userId }, tx)
        ),
      ]);

      this.removeProjectIdFromScopeCache(scope, projectId);

      return await this.services.projects.deleteProject(params, tx);
    });
  }
}
