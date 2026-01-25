import { DbSchema } from '@grantjs/database';
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
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

import { CacheHandler } from './base/cache-handler';

export class ProjectHandler extends CacheHandler {
  constructor(
    readonly cache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(cache, services);
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
              await this.services.organizationProjectTags.getOrganizationProjectTagIntersection(
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
              await this.services.accountProjectTags.getAccountProjectTagIntersection(
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
          throw new BadRequestError('Invalid scope', 'errors:validation.invalid', {
            field: 'scope',
          });
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
          throw new BadRequestError('Invalid scope', 'errors:validation.invalid', {
            field: 'scope',
          });
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) => {
            switch (scope.tenant) {
              case Tenant.Organization:
                return this.services.organizationProjectTags.addOrganizationProjectTag(
                  { organizationId: scope.id, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                );
              case Tenant.Account:
                return this.services.accountProjectTags.addAccountProjectTag(
                  { accountId: scope.id, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                );
              default:
                throw new BadRequestError('Invalid scope', 'errors:validation.invalid', {
                  field: 'scope',
                });
            }
          })
        );
      }

      this.addProjectIdToScopeCache(scope, projectId);

      return project;
    });
  }

  public async updateProject(params: MutationUpdateProjectArgs): Promise<Project> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: projectId, input } = params;
      const { scope, tagIds, primaryTagId } = input;
      let currentTagIds: string[] = [];

      if (Array.isArray(tagIds)) {
        switch (scope.tenant) {
          case Tenant.Organization:
            {
              const organizationId = scope.id;
              const currentTags =
                await this.services.organizationProjectTags.getOrganizationProjectTags(
                  { organizationId, projectId },
                  tx
                );
              currentTagIds = currentTags.map((pt) => pt.tagId);
            }
            break;
          case Tenant.Account:
            {
              const accountId = scope.id;
              const currentTags = await this.services.accountProjectTags.getAccountProjectTags(
                { accountId, projectId },
                tx
              );
              currentTagIds = currentTags.map((pt) => pt.tagId);
            }
            break;
          default:
            throw new BadRequestError('Invalid scope', 'errors:validation.invalid', {
              field: 'scope',
            });
        }
      }

      const updatedProject = await this.services.projects.updateProject(params, tx);

      if (Array.isArray(tagIds)) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        switch (scope.tenant) {
          case Tenant.Organization: {
            const organizationId = scope.id;
            await Promise.all(
              updatedTagIds.map((tagId) =>
                this.services.organizationProjectTags.updateOrganizationProjectTag(
                  { organizationId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              newTagIds.map((tagId) =>
                this.services.organizationProjectTags.addOrganizationProjectTag(
                  { organizationId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              removedTagIds.map((tagId) =>
                this.services.organizationProjectTags.removeOrganizationProjectTag(
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
                this.services.accountProjectTags.updateAccountProjectTag(
                  { accountId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              newTagIds.map((tagId) =>
                this.services.accountProjectTags.addAccountProjectTag(
                  { accountId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              removedTagIds.map((tagId) =>
                this.services.accountProjectTags.removeAccountProjectTag(
                  { accountId, projectId, tagId },
                  tx
                )
              )
            );
            break;
          }
          default:
            throw new BadRequestError('Invalid scope', 'errors:validation.invalid', {
              field: 'scope',
            });
        }
      }
      return updatedProject;
    });
  }

  public async deleteProject(params: MutationDeleteProjectArgs & DeleteParams): Promise<Project> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: projectId, scope } = params;

      // Query common project data (not tenant-specific)
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
        case Tenant.Account: {
          const accountId = scope.id;

          const accountProjectTags = await this.services.accountProjectTags.getAccountProjectTags(
            { accountId, projectId },
            tx
          );
          const accountTagIds = accountProjectTags.map((apt) => apt.tagId);

          await this.services.accountProjects.removeAccountProject({ accountId, projectId }, tx);

          await Promise.all(
            accountTagIds.map((tagId) =>
              this.services.accountProjectTags.removeAccountProjectTag(
                { accountId, projectId, tagId },
                tx
              )
            )
          );
          break;
        }
        case Tenant.Organization: {
          const organizationId = scope.id;

          const organizationProjectTags =
            await this.services.organizationProjectTags.getOrganizationProjectTags(
              { organizationId, projectId },
              tx
            );
          const organizationTagIds = organizationProjectTags.map((opt) => opt.tagId);

          await this.services.organizationProjects.removeOrganizationProject(
            { organizationId, projectId },
            tx
          );

          await Promise.all(
            organizationTagIds.map((tagId) =>
              this.services.organizationProjectTags.removeOrganizationProjectTag(
                { organizationId, projectId, tagId },
                tx
              )
            )
          );
          break;
        }
        default:
          throw new BadRequestError('Invalid scope', 'errors:validation.invalid', {
            field: 'scope',
          });
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
