import {
  ProjectTag,
  AddProjectTagInput,
  RemoveProjectTagInput,
  UpdateProjectTagInput,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { PivotRepository } from '@/graphql/repositories/common';

import { ProjectTagModel, projectTags } from './schema';

export class ProjectTagRepository extends PivotRepository<ProjectTagModel, ProjectTag> {
  protected table = projectTags;
  protected parentIdField: keyof ProjectTagModel = 'projectId';
  protected relatedIdField: keyof ProjectTagModel = 'tagId';

  protected toEntity(dbPivot: ProjectTagModel): ProjectTag {
    return {
      id: dbPivot.id,
      projectId: dbPivot.projectId,
      tagId: dbPivot.tagId,
      isPrimary: dbPivot.isPrimary,
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  public async getProjectTags(
    params: { projectId: string; tagId?: string },
    transaction?: Transaction
  ): Promise<ProjectTag[]> {
    return this.query({ parentId: params.projectId, relatedId: params.tagId }, transaction);
  }

  public async getProjectTag(
    params: { projectId: string; tagId: string },
    transaction?: Transaction
  ): Promise<ProjectTag> {
    const result = await this.getProjectTags(params, transaction);
    return this.first(result);
  }

  public async getProjectTagIntersection(
    projectIds: string[],
    tagIds: string[]
  ): Promise<ProjectTag[]> {
    return this.queryIntersection({ parentIds: projectIds, relatedIds: tagIds });
  }

  public async addProjectTag(
    params: AddProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    const { projectId, tagId, ...rest } = params;
    return this.add({ parentId: projectId, relatedId: tagId, ...rest }, transaction);
  }

  public async updateProjectTag(
    params: UpdateProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    const { projectId, tagId, isPrimary } = params;
    return this.update(projectId, tagId, { isPrimary }, transaction);
  }

  public async softDeleteProjectTag(
    params: RemoveProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    return this.softDelete(
      {
        parentId: params.projectId,
        relatedId: params.tagId,
      },
      transaction
    );
  }

  public async hardDeleteProjectTag(
    params: RemoveProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    return this.hardDelete(
      {
        parentId: params.projectId,
        relatedId: params.tagId,
      },
      transaction
    );
  }
}
