import { ProjectTag, AddProjectTagInput, RemoveProjectTagInput } from '@/graphql/generated/types';
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
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  public async getProjectTags(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<ProjectTag[]> {
    return this.query({ parentId: params.projectId }, transaction);
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
    return this.add(
      {
        parentId: params.projectId,
        relatedId: params.tagId,
      },
      transaction
    );
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
