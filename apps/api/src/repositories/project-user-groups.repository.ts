import type { IProjectUserGroupRepository } from '@grantjs/core';
import { ProjectUserGroupModel, projectUserGroups } from '@grantjs/database';
import {
  AddProjectUserGroupInput,
  ProjectUserGroup,
  QueryProjectUserGroupsInput,
  RemoveProjectUserGroupInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class ProjectUserGroupRepository
  extends PivotRepository<ProjectUserGroupModel, ProjectUserGroup>
  implements IProjectUserGroupRepository
{
  protected table = projectUserGroups;
  protected uniqueIndexFields: Array<keyof ProjectUserGroupModel> = [
    'projectId',
    'userId',
    'groupId',
  ];

  protected toEntity(dbPivot: ProjectUserGroupModel): ProjectUserGroup {
    return dbPivot;
  }

  public async getProjectUserGroups(
    params: QueryProjectUserGroupsInput,
    transaction?: Transaction
  ): Promise<ProjectUserGroup[]> {
    return this.query(params, transaction);
  }

  public async addProjectUserGroup(
    params: AddProjectUserGroupInput,
    transaction?: Transaction
  ): Promise<ProjectUserGroup> {
    return this.add(params, transaction);
  }

  public async softDeleteProjectUserGroup(
    params: RemoveProjectUserGroupInput,
    transaction?: Transaction
  ): Promise<ProjectUserGroup> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectUserGroup(
    params: RemoveProjectUserGroupInput,
    transaction?: Transaction
  ): Promise<ProjectUserGroup> {
    return this.hardDelete(params, transaction);
  }
}
