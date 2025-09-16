import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import {
  MutationDeleteAccountArgs,
  QueryAccountsArgs,
  AccountPage,
  Account,
  MutationUpdateAccountArgs,
  CreateAccountInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Transaction, TransactionManager } from '@/graphql/lib/transactions/TransactionManager';
import { Services } from '@/graphql/services';
import { DeleteParams, SelectedFields } from '@/graphql/services/common';

import { ScopeController } from '../base/ScopeController';

export class AccountController extends ScopeController {
  constructor(
    readonly scopeCache: EntityCache,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getAccounts(
    params: QueryAccountsArgs & SelectedFields<Account>
  ): Promise<AccountPage> {
    const { page, limit, sort, search, ids, requestedFields } = params;

    const accountsResult = await this.services.accounts.getAccounts({
      ids,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return accountsResult;
  }

  public async createAccount(params: Omit<CreateAccountInput, 'ownerId'>): Promise<Account> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { name, type } = params;

      const user = await this.services.users.createUser({ name }, tx);

      const account = await this.services.accounts.createAccount(
        { name, type, ownerId: user.id },
        tx
      );

      return account;
    });
  }

  public async updateAccount(params: MutationUpdateAccountArgs): Promise<Account> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const updatedAccount = await this.services.accounts.updateAccount(params, tx);
      return updatedAccount;
    });
  }

  public async deleteAccount(params: MutationDeleteAccountArgs & DeleteParams): Promise<Account> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: accountId } = params;
      const [accountProjects] = await Promise.all([
        this.services.accountProjects.getAccountProjects({ accountId }, tx),
      ]);
      await Promise.all([
        ...accountProjects.map((ap) =>
          this.services.accountProjects.removeAccountProject(
            { accountId, projectId: ap.projectId },
            tx
          )
        ),
      ]);

      return await this.services.accounts.deleteAccount(params, tx);
    });
  }
}
