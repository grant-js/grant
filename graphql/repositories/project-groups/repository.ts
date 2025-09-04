import {
  ProjectGroup,
  RemoveProjectGroupInput,
  AddProjectGroupInput,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { PivotRepository } from '@/graphql/repositories/common';

import { ProjectGroupModel, projectGroups } from './schema';

export class ProjectGroupRepository extends PivotRepository<ProjectGroupModel, ProjectGroup> {
  protected table = projectGroups;
  protected parentIdField: keyof ProjectGroupModel = 'projectId';
  protected relatedIdField: keyof ProjectGroupModel = 'groupId';

  protected toEntity(dbPivot: ProjectGroupModel): ProjectGroup {
    return {
      id: dbPivot.id,
      projectId: dbPivot.projectId,
      groupId: dbPivot.groupId,
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  public async getProjectGroups(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<ProjectGroup[]> {
    return this.query({ parentId: params.projectId }, transaction);
  }

  public async addProjectGroup(
    params: AddProjectGroupInput,
    transaction?: Transaction
  ): Promise<ProjectGroup> {
    return this.add(
      {
        parentId: params.projectId,
        relatedId: params.groupId,
      },
      transaction
    );
  }

  public async softDeleteProjectGroup(
    params: RemoveProjectGroupInput,
    transaction?: Transaction
  ): Promise<ProjectGroup> {
    return this.softDelete(
      {
        parentId: params.projectId,
        relatedId: params.groupId,
      },
      transaction
    );
  }

  public async hardDeleteProjectGroup(
    params: RemoveProjectGroupInput,
    transaction?: Transaction
  ): Promise<ProjectGroup> {
    return this.hardDelete(
      {
        parentId: params.projectId,
        relatedId: params.groupId,
      },
      transaction
    );
  }
}
