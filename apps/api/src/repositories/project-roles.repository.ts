import { ProjectRoleModel, projectRoles } from '@logusgraphics/grant-database';
import {
  AddProjectRoleInput,
  ProjectRole,
  QueryProjectRolesInput,
  RemoveProjectRoleInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class ProjectRoleRepository extends PivotRepository<ProjectRoleModel, ProjectRole> {
  protected table = projectRoles;
  protected uniqueIndexFields: Array<keyof ProjectRoleModel> = ['projectId', 'roleId'];

  protected toEntity(dbPivot: ProjectRoleModel): ProjectRole {
    return dbPivot;
  }

  public async getProjectRoles(
    params: QueryProjectRolesInput,
    transaction?: Transaction
  ): Promise<ProjectRole[]> {
    return this.query(params, transaction);
  }

  public async addProjectRole(
    params: AddProjectRoleInput,
    transaction?: Transaction
  ): Promise<ProjectRole> {
    return this.add(params, transaction);
  }

  public async softDeleteProjectRole(
    params: RemoveProjectRoleInput,
    transaction?: Transaction
  ): Promise<ProjectRole> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectRole(
    params: RemoveProjectRoleInput,
    transaction?: Transaction
  ): Promise<ProjectRole> {
    return this.hardDelete(params, transaction);
  }
}
