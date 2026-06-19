import type { IProjectAppTagRepository } from '@grantjs/core';
import { ProjectAppTagModel, projectAppTags } from '@grantjs/database';
import {
  AddProjectAppTagInput,
  ProjectAppTag,
  QueryProjectAppTagsInput,
  RemoveProjectAppTagInput,
  UpdateProjectAppTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

function toEntity(dbPivot: ProjectAppTagModel): ProjectAppTag {
  return {
    id: dbPivot.id,
    projectAppId: dbPivot.projectAppId,
    tagId: dbPivot.tagId,
    isPrimary: dbPivot.isPrimary,
    createdAt: dbPivot.createdAt,
    updatedAt: dbPivot.updatedAt,
    deletedAt: dbPivot.deletedAt ?? undefined,
  };
}

export class ProjectAppTagRepository
  extends PivotRepository<ProjectAppTagModel, ProjectAppTag>
  implements IProjectAppTagRepository
{
  protected table = projectAppTags;
  protected uniqueIndexFields: Array<keyof ProjectAppTagModel> = ['projectAppId', 'tagId'];

  protected toEntity(dbPivot: ProjectAppTagModel): ProjectAppTag {
    return toEntity(dbPivot);
  }

  public async getProjectAppTags(
    params: QueryProjectAppTagsInput,
    transaction?: Transaction
  ): Promise<ProjectAppTag[]> {
    return this.query(params as Record<string, unknown>, transaction);
  }

  public async getProjectAppTagsByProjectAppIds(
    projectAppIds: string[],
    transaction?: Transaction
  ): Promise<ProjectAppTag[]> {
    return this.queryByFieldValues('projectAppId', projectAppIds, transaction);
  }

  public async getProjectAppTagIntersection(
    projectAppIds: string[],
    tagIds: string[],
    transaction?: Transaction
  ): Promise<ProjectAppTag[]> {
    return this.queryIntersection({ projectAppId: projectAppIds, tagId: tagIds }, transaction);
  }

  public async addProjectAppTag(
    params: AddProjectAppTagInput,
    transaction?: Transaction
  ): Promise<ProjectAppTag> {
    return this.add(
      {
        projectAppId: params.projectAppId,
        tagId: params.tagId,
        isPrimary: params.isPrimary ?? false,
      },
      transaction
    );
  }

  public async updateProjectAppTag(
    params: UpdateProjectAppTagInput,
    transaction?: Transaction
  ): Promise<ProjectAppTag> {
    const { projectAppId, tagId, isPrimary } = params;
    return this.update({ projectAppId, tagId }, { isPrimary }, transaction);
  }

  public async softDeleteProjectAppTag(
    params: RemoveProjectAppTagInput,
    transaction?: Transaction
  ): Promise<ProjectAppTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectAppTag(
    params: RemoveProjectAppTagInput,
    transaction?: Transaction
  ): Promise<ProjectAppTag> {
    return this.hardDelete(params, transaction);
  }
}
