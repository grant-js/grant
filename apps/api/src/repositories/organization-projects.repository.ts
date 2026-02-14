import { OrganizationProjectModel, organizationProjects } from '@grantjs/database';
import {
  AddOrganizationProjectInput,
  OrganizationProject,
  QueryOrganizationProjectsInput,
  RemoveOrganizationProjectInput,
} from '@grantjs/schema';
import { and, eq, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IOrganizationProjectRepository } from '@grantjs/core';

export class OrganizationProjectRepository
  extends PivotRepository<OrganizationProjectModel, OrganizationProject>
  implements IOrganizationProjectRepository
{
  protected table = organizationProjects;
  protected uniqueIndexFields: Array<keyof OrganizationProjectModel> = [
    'organizationId',
    'projectId',
  ];

  protected toEntity(dbOrganizationProject: OrganizationProjectModel): OrganizationProject {
    return dbOrganizationProject;
  }

  public async getOrganizationProjects(
    params: QueryOrganizationProjectsInput,
    transaction?: Transaction
  ): Promise<OrganizationProject[]> {
    return this.query(params, transaction);
  }

  public async getOrganizationProject(
    params: QueryOrganizationProjectsInput,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const result = await this.query(params, transaction);
    return this.first(result);
  }

  public async addOrganizationProject(
    params: AddOrganizationProjectInput,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    return this.add(params, transaction);
  }

  public async softDeleteOrganizationProject(
    params: RemoveOrganizationProjectInput,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteOrganizationProject(
    params: RemoveOrganizationProjectInput,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    return this.hardDelete(params, transaction);
  }

  /** Resolve project to organization-project scope (for signing key lookup). Returns first match or null. */
  async getFirstByProjectId(
    projectId: string,
    transaction?: Transaction
  ): Promise<OrganizationProject | null> {
    const client = transaction ?? this.db;
    const rows = await client
      .select()
      .from(organizationProjects)
      .where(
        and(eq(organizationProjects.projectId, projectId), isNull(organizationProjects.deletedAt))
      )
      .limit(1);
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }
}
