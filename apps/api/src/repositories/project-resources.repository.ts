import { ProjectResourceModel, projectResources } from '@grantjs/database';
import {
  AddProjectResourceInput,
  ProjectResource,
  QueryProjectResourcesInput,
  RemoveProjectResourceInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IProjectResourceRepository } from '@grantjs/core';

export class ProjectResourceRepository
  extends PivotRepository<ProjectResourceModel, ProjectResource>
  implements IProjectResourceRepository
{
  protected table = projectResources;
  protected uniqueIndexFields: Array<keyof ProjectResourceModel> = ['projectId', 'resourceId'];

  protected toEntity(dbPivot: ProjectResourceModel): ProjectResource {
    return dbPivot;
  }

  public async getProjectResources(
    params: QueryProjectResourcesInput,
    transaction?: Transaction
  ): Promise<ProjectResource[]> {
    return this.query(params, transaction);
  }

  public async addProjectResource(
    params: AddProjectResourceInput,
    transaction?: Transaction
  ): Promise<ProjectResource> {
    return this.add(params, transaction);
  }

  public async softDeleteProjectResource(
    params: RemoveProjectResourceInput,
    transaction?: Transaction
  ): Promise<ProjectResource> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectResource(
    params: RemoveProjectResourceInput,
    transaction?: Transaction
  ): Promise<ProjectResource> {
    return this.hardDelete(params, transaction);
  }
}
