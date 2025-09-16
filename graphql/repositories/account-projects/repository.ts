import { AddAccountProjectInput, RemoveAccountProjectInput } from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

import {
  BasePivotAddArgs,
  BasePivotQueryArgs,
  BasePivotRemoveArgs,
  PivotRepository,
} from '../common/PivotRepository';

import { accountProjects, AccountProjectModel } from './schema';

// Define the GraphQL AccountProject type interface
interface AccountProject {
  id: string;
  accountId: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  [key: string]: unknown;
}

export class AccountProjectRepository extends PivotRepository<AccountProjectModel, AccountProject> {
  protected table = accountProjects;
  protected parentIdField: keyof AccountProjectModel = 'accountId';
  protected relatedIdField: keyof AccountProjectModel = 'projectId';

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
    params: { accountId: string },
    transaction?: Transaction
  ): Promise<AccountProject[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.accountId,
    };

    return this.query(baseParams, transaction);
  }

  async getAccountProject(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<AccountProject> {
    const baseParams: BasePivotQueryArgs = {
      relatedId: params.projectId,
    };
    const result = await this.query(baseParams, transaction);
    return this.first(result);
  }

  async addAccountProject(
    params: AddAccountProjectInput,
    transaction?: Transaction
  ): Promise<AccountProject> {
    const baseParams: BasePivotAddArgs = {
      parentId: params.accountId,
      relatedId: params.projectId,
    };
    return this.add(baseParams, transaction);
  }

  async softDeleteAccountProject(
    params: RemoveAccountProjectInput,
    transaction?: Transaction
  ): Promise<AccountProject> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.accountId,
      relatedId: params.projectId,
    };
    return this.softDelete(baseParams, transaction);
  }

  async hardDeleteAccountProject(
    params: RemoveAccountProjectInput,
    transaction?: Transaction
  ): Promise<AccountProject> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.accountId,
      relatedId: params.projectId,
    };
    return this.hardDelete(baseParams, transaction);
  }
}
