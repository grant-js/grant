import type { IProjectRolePermissionRepository } from '@grantjs/core';
import { ProjectRolePermissionModel, projectRolePermissions } from '@grantjs/database';
import {
  AddProjectRolePermissionInput,
  ProjectRolePermission,
  QueryProjectRolePermissionsInput,
  RemoveProjectRolePermissionInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class ProjectRolePermissionRepository
  extends PivotRepository<ProjectRolePermissionModel, ProjectRolePermission>
  implements IProjectRolePermissionRepository
{
  protected table = projectRolePermissions;
  protected uniqueIndexFields: Array<keyof ProjectRolePermissionModel> = [
    'projectId',
    'roleId',
    'permissionId',
  ];

  protected toEntity(dbPivot: ProjectRolePermissionModel): ProjectRolePermission {
    return dbPivot;
  }

  public async getProjectRolePermissions(
    params: QueryProjectRolePermissionsInput,
    transaction?: Transaction
  ): Promise<ProjectRolePermission[]> {
    return this.query(params, transaction);
  }

  public async addProjectRolePermission(
    params: AddProjectRolePermissionInput,
    transaction?: Transaction
  ): Promise<ProjectRolePermission> {
    return this.add(params, transaction);
  }

  public async softDeleteProjectRolePermission(
    params: RemoveProjectRolePermissionInput,
    transaction?: Transaction
  ): Promise<ProjectRolePermission> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectRolePermission(
    params: RemoveProjectRolePermissionInput,
    transaction?: Transaction
  ): Promise<ProjectRolePermission> {
    return this.hardDelete(params, transaction);
  }
}
