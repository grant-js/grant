import { ProjectTagModel, projectTags } from '@grantjs/database';
import {
  AddProjectTagInput,
  ProjectTag,
  QueryProjectTagsInput,
  RemoveProjectTagInput,
  UpdateProjectTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IProjectTagRepository } from '@grantjs/core';

export class ProjectTagRepository
  extends PivotRepository<ProjectTagModel, ProjectTag>
  implements IProjectTagRepository
{
  protected table = projectTags;
  protected uniqueIndexFields: Array<keyof ProjectTagModel> = ['projectId', 'tagId'];

  protected toEntity(dbPivot: ProjectTagModel): ProjectTag {
    return dbPivot;
  }

  public async getProjectTags(
    params: QueryProjectTagsInput,
    transaction?: Transaction
  ): Promise<ProjectTag[]> {
    return this.query(params, transaction);
  }

  public async getProjectTag(
    params: QueryProjectTagsInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    const result = await this.getProjectTags(params, transaction);
    return this.first(result);
  }

  public async getProjectTagIntersection(
    projectIds: string[],
    tagIds: string[]
  ): Promise<ProjectTag[]> {
    return this.queryIntersection({ projectId: projectIds, tagId: tagIds });
  }

  public async addProjectTag(
    params: AddProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    return this.add(params, transaction);
  }

  public async updateProjectTag(
    params: UpdateProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    const { projectId, tagId, isPrimary } = params;
    return this.update({ projectId, tagId }, { isPrimary }, transaction);
  }

  public async softDeleteProjectTag(
    params: RemoveProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectTag(
    params: RemoveProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    return this.hardDelete(params, transaction);
  }
}
