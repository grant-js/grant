import { AccountProjectModel, accountProjects } from '@grantjs/database';
import {
  AccountProject,
  AddAccountProjectInput,
  QueryAccountProjectInput,
  QueryAccountProjectsInput,
  RemoveAccountProjectInput,
} from '@grantjs/schema';
import { and, eq, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

import { PivotRepository } from './common/PivotRepository';

import type { IAccountProjectRepository } from '@grantjs/core';

export class AccountProjectRepository
  extends PivotRepository<AccountProjectModel, AccountProject>
  implements IAccountProjectRepository
{
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

  /** Resolve project to account-project scope (for signing key lookup). Returns first match or null. */
  async getFirstByProjectId(
    projectId: string,
    transaction?: Transaction
  ): Promise<AccountProject | null> {
    const client = transaction ?? this.db;
    const rows = await client
      .select()
      .from(accountProjects)
      .where(and(eq(accountProjects.projectId, projectId), isNull(accountProjects.deletedAt)))
      .limit(1);
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }
}
