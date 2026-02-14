import {
  UserModel,
  accounts,
  roles,
  tags,
  userAuthenticationMethods,
  users,
} from '@grantjs/database';
import {
  Account,
  CreateUserInput,
  MutationDeleteUserArgs,
  QueryUsersArgs,
  UpdateUserInput,
  User,
  UserAuthenticationMethod,
  UserPage,
  UserRole,
  UserSearchableField,
  UserTag,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { EntityRepository, RelationsConfig } from '@/repositories/common';
import { SelectedFields } from '@/types';

import type { IUserRepository } from '@grantjs/core';

export class UserRepository extends EntityRepository<UserModel, User> implements IUserRepository {
  protected table = users;
  protected schemaName = 'users' as const;
  protected searchFields: Array<keyof UserModel> = Object.values(UserSearchableField);
  protected defaultSortField: keyof UserModel = 'createdAt';
  protected relations: RelationsConfig<User> = {
    tags: {
      field: 'tag',
      table: tags,
      extract: (v: Array<UserTag>) =>
        v.map(({ tag, isPrimary }: UserTag) => ({ ...tag, isPrimary })),
    },
    roles: {
      field: 'role',
      table: roles,
      extract: (v: Array<UserRole>) => v.map(({ role }: UserRole) => role),
    },
    accounts: {
      field: 'owner',
      table: accounts,
      extract: (v: Account) => v,
    },
    authenticationMethods: {
      field: 'user',
      table: userAuthenticationMethods,
      extract: (v: Array<UserAuthenticationMethod>) => v,
    },
  };

  public async getUsers(
    params: Omit<QueryUsersArgs, 'scope'> & SelectedFields<User>,
    transaction?: Transaction
  ): Promise<UserPage> {
    const result = await this.query(params, transaction);

    return {
      users: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createUser(
    params: Omit<CreateUserInput, 'scope' | 'roleIds' | 'tagIds'>,
    transaction?: Transaction
  ): Promise<User> {
    return this.create(params, transaction);
  }

  public async updateUser(
    id: string,
    input: Omit<UpdateUserInput, 'scope'>,
    transaction?: Transaction
  ): Promise<User> {
    return this.update(
      {
        id,
        input,
      },
      transaction
    );
  }

  public async softDeleteUser(
    params: Omit<MutationDeleteUserArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<User> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteUser(
    params: Omit<MutationDeleteUserArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<User> {
    return this.hardDelete(params, transaction);
  }
}
