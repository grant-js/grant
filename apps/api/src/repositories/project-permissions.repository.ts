import { ProjectPermissionModel, projectPermissions } from '@grantjs/database';
import {
  AddProjectPermissionInput,
  ProjectPermission,
  QueryProjectPermissionsInput,
  RemoveProjectPermissionInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class ProjectPermissionRepository extends PivotRepository<
  ProjectPermissionModel,
  ProjectPermission
> {
  protected table = projectPermissions;
  protected uniqueIndexFields: Array<keyof ProjectPermissionModel> = ['projectId', 'permissionId'];

  protected toEntity(dbPivot: ProjectPermissionModel): ProjectPermission {
    return dbPivot;
  }

  public async getProjectPermissions(
    params: QueryProjectPermissionsInput,
    transaction?: Transaction
  ): Promise<ProjectPermission[]> {
    return this.query(params, transaction);
  }

  public async addProjectPermission(
    params: AddProjectPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectPermission> {
    return this.add(params, transaction);
  }

  public async softDeleteProjectPermission(
    params: RemoveProjectPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectPermission> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectPermission(
    params: RemoveProjectPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectPermission> {
    return this.hardDelete(params, transaction);
  }
}
