import { AccountRoleModel, accountRoles } from '@grantjs/database';
import {
  AddAccountRoleInput,
  AccountRole,
  QueryAccountRolesInput,
  RemoveAccountRoleInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IAccountRoleRepository } from '@grantjs/core';

export class AccountRoleRepository
  extends PivotRepository<AccountRoleModel, AccountRole>
  implements IAccountRoleRepository
{
  protected table = accountRoles;
  protected uniqueIndexFields: Array<keyof AccountRoleModel> = ['accountId', 'roleId'];

  protected toEntity(dbPivot: AccountRoleModel): AccountRole {
    return dbPivot;
  }

  public async getAccountRoles(
    params: QueryAccountRolesInput,
    transaction?: Transaction
  ): Promise<AccountRole[]> {
    return this.query(params, transaction);
  }

  public async addAccountRole(
    params: AddAccountRoleInput,
    transaction?: Transaction
  ): Promise<AccountRole> {
    return this.add(params, transaction);
  }

  public async softDeleteAccountRole(
    params: RemoveAccountRoleInput,
    transaction?: Transaction
  ): Promise<AccountRole> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteAccountRole(
    params: RemoveAccountRoleInput,
    transaction?: Transaction
  ): Promise<AccountRole> {
    return this.hardDelete(params, transaction);
  }
}
