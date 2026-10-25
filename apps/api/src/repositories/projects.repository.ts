import type { IProjectRepository, OptionalListScope } from '@grantjs/core';
import {
  accountProjectTags,
  projectGroups,
  ProjectModel,
  projectPermissions,
  projectResources,
  projectRoles,
  projects,
  projectTags,
  projectUsers,
} from '@grantjs/database';
import { organizationProjectTags } from '@grantjs/database/src/schemas/organization-project-tags.schema';
import {
  AccountProjectTag,
  CreateProjectInput,
  MutationDeleteProjectArgs,
  MutationUpdateProjectArgs,
  OrganizationProjectTag,
  Project,
  ProjectGroup,
  ProjectPage,
  ProjectPermission,
  ProjectResource,
  ProjectRole,
  ProjectSearchableField,
  ProjectTag,
  ProjectUser,
  QueryProjectsArgs,
  Tenant,
} from '@grantjs/schema';

import { BadRequestError } from '@/lib/errors';
import { slugifySafe } from '@/lib/slugify.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import {
  accountProjectTagExistsSql,
  BaseCreateArgs,
  BaseDeleteArgs,
  BaseUpdateArgs,
  EntityRepository,
  organizationProjectTagExistsSql,
  RelationsConfig,
  requireAccessibleIdSource,
} from '@/repositories/common';
import { SelectedFields } from '@/types';

export class ProjectRepository
  extends EntityRepository<ProjectModel, Project>
  implements IProjectRepository
{
  protected table = projects;
  protected schemaName = 'projects' as const;
  protected searchFields: Array<keyof ProjectModel> = Object.values(ProjectSearchableField);
  protected defaultSortField: keyof ProjectModel = 'createdAt';
  protected relations: RelationsConfig<Project> = {
    tags: {
      field: 'tag',
      extract: (v: ProjectTag[]) => v.map(({ tag, isPrimary }) => ({ ...tag, isPrimary })),
      table: projectTags,
    },
    organizationTags: {
      field: 'tag',
      extract: (v: OrganizationProjectTag[]) =>
        v.map(({ tag, isPrimary }) => ({ ...tag, isPrimary })),
      table: organizationProjectTags,
    },
    accountTags: {
      field: 'tag',
      extract: (v: AccountProjectTag[]) => v.map(({ tag, isPrimary }) => ({ ...tag, isPrimary })),
      table: accountProjectTags,
    },
    users: {
      field: 'user',
      extract: (v: ProjectUser[]) => v.map(({ user }) => user),
      table: projectUsers,
    },
    roles: {
      field: 'role',
      extract: (v: ProjectRole[]) => v.map(({ role }) => role),
      table: projectRoles,
    },
    groups: {
      field: 'group',
      extract: (v: ProjectGroup[]) => v.map(({ group }) => group),
      table: projectGroups,
    },
    permissions: {
      field: 'permission',
      extract: (v: ProjectPermission[]) => v.map(({ permission }) => permission),
      table: projectPermissions,
    },
    resources: {
      field: 'resource',
      extract: (v: ProjectResource[]) => v.map(({ resource }) => resource),
      table: projectResources,
    },
  };

  private generateSlug(name: string): string {
    return slugifySafe(name);
  }

  public async getProjects(
    params: Omit<QueryProjectsArgs, 'scope'> & OptionalListScope & SelectedFields<Project>,
    transaction?: Transaction
  ): Promise<ProjectPage> {
    const extraConditions = [];
    let accessibleIdSource;
    if (params.scope) {
      accessibleIdSource = requireAccessibleIdSource('projects', params.scope);
      if (params.tagIds?.length) {
        if (params.scope.tenant === Tenant.Organization) {
          extraConditions.push(
            organizationProjectTagExistsSql(this.table.id, params.scope.id, params.tagIds)
          );
        } else if (params.scope.tenant === Tenant.Account) {
          extraConditions.push(
            accountProjectTagExistsSql(this.table.id, params.scope.id, params.tagIds)
          );
        } else {
          throw new BadRequestError('Invalid scope');
        }
      }
    }
    const result = await this.query(
      { ...params, accessibleIdSource, extraConditions },
      transaction
    );

    return {
      projects: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createProject(
    params: Omit<CreateProjectInput, 'scope' | 'tagIds'>,
    transaction?: Transaction
  ): Promise<Project> {
    const baseParams: BaseCreateArgs = {
      name: params.name,
      slug: this.generateSlug(params.name),
      description: params.description,
    };

    return this.create(baseParams, transaction);
  }

  public async updateProject(
    params: MutationUpdateProjectArgs,
    transaction?: Transaction
  ): Promise<Project> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        slug: params.input.name ? this.generateSlug(params.input.name) : undefined,
        description: params.input.description,
        primaryColor: params.input.primaryColor,
        showHelpPanel: params.input.showHelpPanel,
      },
    };

    return this.update(baseParams, transaction);
  }

  public async setProjectPicture(
    projectId: string,
    input: { picturePath?: string | null; pictureUrl?: string | null },
    transaction?: Transaction
  ): Promise<Project> {
    const baseParams: BaseUpdateArgs = {
      id: projectId,
      input,
    };
    return this.update(baseParams, transaction);
  }

  public async softDeleteProject(
    params: Omit<MutationDeleteProjectArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Project> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams, transaction);
  }

  public async hardDeleteProject(
    params: Omit<MutationDeleteProjectArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Project> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams, transaction);
  }
}
