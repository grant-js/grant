import { organizationProjects, OrganizationProjectModel } from '@logusgraphics/grant-database';
import { AddOrganizationProjectInput, OrganizationProject } from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  PivotRepository,
  BasePivotQueryArgs,
  BasePivotAddArgs,
  BasePivotRemoveArgs,
} from '@/graphql/repositories/common';

export class OrganizationProjectRepository extends PivotRepository<
  OrganizationProjectModel,
  OrganizationProject
> {
  protected table = organizationProjects;
  protected parentIdField: keyof OrganizationProjectModel = 'organizationId';
  protected relatedIdField: keyof OrganizationProjectModel = 'projectId';

  protected toEntity(dbOrganizationProject: OrganizationProjectModel): OrganizationProject {
    return {
      id: dbOrganizationProject.id,
      organizationId: dbOrganizationProject.organizationId,
      projectId: dbOrganizationProject.projectId,
      createdAt: dbOrganizationProject.createdAt,
      updatedAt: dbOrganizationProject.updatedAt,
      deletedAt: dbOrganizationProject.deletedAt,
    };
  }

  public async getOrganizationProjects(
    params: {
      organizationId: string;
    },
    transaction?: Transaction
  ): Promise<OrganizationProject[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.organizationId,
    };

    return this.query(baseParams, transaction);
  }

  public async getOrganizationProject(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const baseParams: BasePivotQueryArgs = {
      relatedId: params.projectId,
    };
    const result = await this.query(baseParams, transaction);
    return this.first(result);
  }

  public async addOrganizationProject(
    params: AddOrganizationProjectInput,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const baseParams: BasePivotAddArgs = {
      parentId: params.organizationId,
      relatedId: params.projectId,
    };

    const organizationProject = await this.add(baseParams, transaction);

    return organizationProject;
  }

  public async softDeleteOrganizationProject(
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: organizationId,
      relatedId: projectId,
    };

    const organizationProject = await this.softDelete(baseParams, transaction);

    return organizationProject;
  }

  public async hardDeleteOrganizationProject(
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: organizationId,
      relatedId: projectId,
    };

    const organizationProject = await this.hardDelete(baseParams, transaction);

    return organizationProject;
  }
}
