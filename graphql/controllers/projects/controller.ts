import {
  QueryProjectsArgs,
  MutationCreateProjectArgs,
  MutationUpdateProjectArgs,
  MutationDeleteProjectArgs,
  Project,
  ProjectPage,
  Tenant,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Transaction, TransactionManager } from '@/graphql/lib/transactions/TransactionManager';
import { ProjectModel } from '@/graphql/repositories/projects/schema';
import { Services } from '@/graphql/services';
import { DeleteParams, SelectedFields } from '@/graphql/services/common';

import { ScopeController } from '../base/ScopeController';

export class ProjectController extends ScopeController {
  constructor(
    readonly scopeCache: EntityCache,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getProjects(
    params: QueryProjectsArgs & SelectedFields<ProjectModel>
  ): Promise<ProjectPage> {
    const { organizationId, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    const scope = { tenant: Tenant.Organization, id: organizationId };

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

    return projectsResult;
  }

  public async createProject(params: MutationCreateProjectArgs): Promise<Project> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { name, description, organizationId, tagIds } = input;

      const project = await this.services.projects.createProject({ name, description }, tx);
      const { id: projectId } = project;

      await this.services.organizationProjects.addOrganizationProject(
        { organizationId, projectId },
        tx
      );

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) => this.services.projectTags.addProjectTag({ projectId, tagId }, tx))
        );
      }

      return project;
    });
  }

  public async updateProject(params: MutationUpdateProjectArgs): Promise<Project> {
    const { id: projectId, input } = params;
    const { tagIds } = input;
    let currentTagIds: string[] = [];
    if (tagIds && tagIds.length > 0) {
      const currentTags = await this.services.projectTags.getProjectTags({
        projectId,
      });
      currentTagIds = currentTags.map((pt) => pt.tagId);
    }
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const updatedProject = await this.services.projects.updateProject(params, tx);
      if (tagIds && tagIds.length > 0) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        ``;
        await Promise.all(
          newTagIds.map((tagId) =>
            this.services.projectTags.addProjectTag({ projectId, tagId }, tx)
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
    const projectId = params.id;
    const organizationId = params.organizationId;
    const [projectTags, projectPermissions, projectGroups, projectRoles, projectUsers] =
      await Promise.all([
        this.services.projectTags.getProjectTags({ projectId }),
        this.services.projectPermissions.getProjectPermissions({ projectId }),
        this.services.projectGroups.getProjectGroups({ projectId }),
        this.services.projectRoles.getProjectRoles({ projectId }),
        this.services.projectUsers.getProjectUsers({ projectId }),
      ]);

    const tagIds = projectTags.map((pt) => pt.tagId);
    const permissionIds = projectPermissions.map((pp) => pp.permissionId);
    const groupIds = projectGroups.map((pg) => pg.groupId);
    const roleIds = projectRoles.map((pr) => pr.roleId);
    const userIds = projectUsers.map((pu) => pu.userId);

    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      await this.services.organizationProjects.removeOrganizationProject(
        { organizationId, projectId },
        tx
      );
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

      return await this.services.projects.deleteProject(params, tx);
    });
  }
}
