import { AccountProjectModel, accountProjects } from '@logusgraphics/grant-database';
import {
  AccountProject,
  AddAccountProjectInput,
  QueryAccountProjectInput,
  QueryAccountProjectsInput,
  RemoveAccountProjectInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/lib/transaction-manager.lib';

import { PivotRepository } from './common/PivotRepository';

export class AccountProjectRepository extends PivotRepository<AccountProjectModel, AccountProject> {
  protected table = accountProjects;
  protected uniqueIndexFields: Array<keyof AccountProjectModel> = ['accountId', 'projectId'];

  protected toEntity(dbPivot: AccountProjectModel): AccountProject {
    return {
      id: dbPivot.id,
      accountId: dbPivot.accountId,
      projectId: dbPivot.projectId,
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  async getAccountProjects(
    params: QueryAccountProjectsInput,
    transaction?: Transaction
  ): Promise<AccountProject[]> {
    return this.query(params, transaction);
  }

  async getAccountProject(
    params: QueryAccountProjectInput,
    transaction?: Transaction
  ): Promise<AccountProject> {
    const result = await this.query(params, transaction);
    return this.first(result);
  }

  async addAccountProject(
    params: AddAccountProjectInput,
    transaction?: Transaction
  ): Promise<AccountProject> {
    return this.add(params, transaction);
  }

  async softDeleteAccountProject(
    params: RemoveAccountProjectInput,
    transaction?: Transaction
  ): Promise<AccountProject> {
    return this.softDelete(params, transaction);
  }

  async hardDeleteAccountProject(
    params: RemoveAccountProjectInput,
    transaction?: Transaction
  ): Promise<AccountProject> {
    return this.hardDelete(params, transaction);
  }
}
