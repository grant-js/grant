import {
  ProjectRole,
  RemoveProjectRoleInput,
  AddProjectRoleInput,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { PivotRepository } from '@/graphql/repositories/common';

import { ProjectRoleModel, projectRoles } from './schema';

export class ProjectRoleRepository extends PivotRepository<ProjectRoleModel, ProjectRole> {
  protected table = projectRoles;
  protected parentIdField: keyof ProjectRoleModel = 'projectId';
  protected relatedIdField: keyof ProjectRoleModel = 'roleId';

  protected toEntity(dbPivot: ProjectRoleModel): ProjectRole {
    return {
      id: dbPivot.id,
      projectId: dbPivot.projectId,
      roleId: dbPivot.roleId,
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  public async getProjectRoles(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<ProjectRole[]> {
    return this.query({ parentId: params.projectId }, transaction);
  }

  public async addProjectRole(
    params: AddProjectRoleInput,
    transaction?: Transaction
  ): Promise<ProjectRole> {
    return this.add(
      {
        parentId: params.projectId,
        relatedId: params.roleId,
      },
      transaction
    );
  }

  public async softDeleteProjectRole(
    params: RemoveProjectRoleInput,
    transaction?: Transaction
  ): Promise<ProjectRole> {
    return this.softDelete(
      {
        parentId: params.projectId,
        relatedId: params.roleId,
      },
      transaction
    );
  }

  public async hardDeleteProjectRole(
    params: RemoveProjectRoleInput,
    transaction?: Transaction
  ): Promise<ProjectRole> {
    return this.hardDelete(
      {
        parentId: params.projectId,
        relatedId: params.roleId,
      },
      transaction
    );
  }
}
