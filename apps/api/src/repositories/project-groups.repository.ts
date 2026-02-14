import { ProjectGroupModel, projectGroups } from '@grantjs/database';
import {
  AddProjectGroupInput,
  ProjectGroup,
  QueryProjectGroupsInput,
  RemoveProjectGroupInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IProjectGroupRepository } from '@grantjs/core';

export class ProjectGroupRepository
  extends PivotRepository<ProjectGroupModel, ProjectGroup>
  implements IProjectGroupRepository
{
  protected table = projectGroups;
  protected uniqueIndexFields: Array<keyof ProjectGroupModel> = ['projectId', 'groupId'];

  protected toEntity(dbPivot: ProjectGroupModel): ProjectGroup {
    return dbPivot;
  }

  public async getProjectGroups(
    params: QueryProjectGroupsInput,
    transaction?: Transaction
  ): Promise<ProjectGroup[]> {
    return this.query(params, transaction);
  }

  public async addProjectGroup(
    params: AddProjectGroupInput,
    transaction?: Transaction
  ): Promise<ProjectGroup> {
    return this.add(params, transaction);
  }

  public async softDeleteProjectGroup(
    params: RemoveProjectGroupInput,
    transaction?: Transaction
  ): Promise<ProjectGroup> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectGroup(
    params: RemoveProjectGroupInput,
    transaction?: Transaction
  ): Promise<ProjectGroup> {
    return this.hardDelete(params, transaction);
  }
}
