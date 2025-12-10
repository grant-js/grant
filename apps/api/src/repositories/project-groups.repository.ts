import { ProjectGroupModel, projectGroups } from '@logusgraphics/grant-database';
import {
  AddProjectGroupInput,
  ProjectGroup,
  QueryProjectGroupsInput,
  RemoveProjectGroupInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class ProjectGroupRepository extends PivotRepository<ProjectGroupModel, ProjectGroup> {
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
