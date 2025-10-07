import { projectUsers, ProjectUserModel } from '@logusgraphics/grant-database';
import {
  AddProjectUserInput,
  ProjectUser,
  RemoveProjectUserInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  PivotRepository,
  BasePivotQueryArgs,
  BasePivotAddArgs,
  BasePivotRemoveArgs,
} from '@/graphql/repositories/common';

export class ProjectUserRepository extends PivotRepository<ProjectUserModel, ProjectUser> {
  protected table = projectUsers;
  protected parentIdField: keyof ProjectUserModel = 'projectId';
  protected relatedIdField: keyof ProjectUserModel = 'userId';

  protected toEntity(dbProjectUser: ProjectUserModel): ProjectUser {
    return {
      id: dbProjectUser.id,
      projectId: dbProjectUser.projectId,
      userId: dbProjectUser.userId,
      createdAt: dbProjectUser.createdAt,
      updatedAt: dbProjectUser.updatedAt,
      deletedAt: dbProjectUser.deletedAt,
    };
  }

  public async getProjectUsers(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<ProjectUser[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.projectId,
    };

    return this.query(baseParams, transaction);
  }

  public async addProjectUser(
    params: AddProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const baseParams: BasePivotAddArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
    };

    const projectUser = await this.add(baseParams, transaction);

    return projectUser;
  }

  public async softDeleteProjectUser(
    params: RemoveProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
    };

    const projectUser = await this.softDelete(baseParams, transaction);

    return projectUser;
  }

  public async hardDeleteProjectUser(
    params: RemoveProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
    };

    const projectUser = await this.hardDelete(baseParams, transaction);

    return projectUser;
  }
}
