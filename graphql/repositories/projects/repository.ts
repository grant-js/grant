import {
  QueryProjectsArgs,
  MutationCreateProjectArgs,
  MutationUpdateProjectArgs,
  MutationDeleteProjectArgs,
  Project,
  ProjectPage,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  EntityRepository,
  BaseQueryArgs,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
} from '@/graphql/repositories/common';

import { ProjectModel, projects } from './schema';

export class ProjectRepository extends EntityRepository<ProjectModel, Project> {
  protected table = projects;
  protected searchFields: Array<keyof ProjectModel> = ['name', 'slug', 'description'];
  protected defaultSortField: keyof ProjectModel = 'createdAt';

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  public async getProjects(
    params: Omit<QueryProjectsArgs, 'scope'> & { requestedFields?: Array<keyof ProjectModel> }
  ): Promise<ProjectPage> {
    const baseParams: BaseQueryArgs<ProjectModel> = {
      ids: params.ids || undefined,
      page: params.page || undefined,
      limit: params.limit || undefined,
      search: params.search || undefined,
      sort: params.sort
        ? {
            field: params.sort.field as keyof ProjectModel,
            order: params.sort.order,
          }
        : undefined,
      requestedFields: params.requestedFields as Array<keyof ProjectModel> | undefined,
    };

    const result = await this.query(baseParams);

    return {
      projects: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async getProjectById(id: string): Promise<Project | null> {
    try {
      const result = await this.query({
        ids: [id],
        limit: 1,
      });

      return result.items.length > 0 ? result.items[0] : null;
    } catch (error) {
      console.error('Get project by ID error:', error);
      return null;
    }
  }

  public async createProject(
    params: MutationCreateProjectArgs,
    transaction?: Transaction
  ): Promise<Project> {
    const baseParams: BaseCreateArgs = {
      name: params.input.name,
      slug: this.generateSlug(params.input.name),
      description: params.input.description,
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
      },
    };

    return this.update(baseParams, transaction);
  }

  public async softDeleteProject(
    params: MutationDeleteProjectArgs,
    transaction?: Transaction
  ): Promise<Project> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams, transaction);
  }

  public async hardDeleteProject(
    params: MutationDeleteProjectArgs,
    transaction?: Transaction
  ): Promise<Project> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams, transaction);
  }
}
