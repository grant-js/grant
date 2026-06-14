import type { IProjectUserPermissionRepository } from '@grantjs/core';
import { ProjectUserPermissionModel, projectUserPermissions } from '@grantjs/database';
import {
  AddProjectUserPermissionInput,
  ProjectUserPermission,
  QueryProjectUserPermissionsInput,
  RemoveProjectUserPermissionInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class ProjectUserPermissionRepository
  extends PivotRepository<ProjectUserPermissionModel, ProjectUserPermission>
  implements IProjectUserPermissionRepository
{
  protected table = projectUserPermissions;
  protected uniqueIndexFields: Array<keyof ProjectUserPermissionModel> = [
    'projectId',
    'userId',
    'permissionId',
  ];

  protected toEntity(dbPivot: ProjectUserPermissionModel): ProjectUserPermission {
    return dbPivot;
  }

  public async getProjectUserPermissions(
    params: QueryProjectUserPermissionsInput,
    transaction?: Transaction
  ): Promise<ProjectUserPermission[]> {
    return this.query(params, transaction);
  }

  public async addProjectUserPermission(
    params: AddProjectUserPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectUserPermission> {
    return this.add(params, transaction);
  }

  public async softDeleteProjectUserPermission(
    params: RemoveProjectUserPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectUserPermission> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectUserPermission(
    params: RemoveProjectUserPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectUserPermission> {
    return this.hardDelete(params, transaction);
  }
}
