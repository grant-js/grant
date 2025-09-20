import {
  CreateUserAuthenticationMethodInput,
  MutationDeleteUserAuthenticationMethodArgs,
  MutationUpdateUserAuthenticationMethodArgs,
  QueryUserAuthenticationMethodsArgs,
  UserAuthenticationMethod,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { SelectedFields } from '@/graphql/services/common';

import { EntityRepository, RelationsConfig, FilterCondition } from '../common/EntityRepository';
import { users } from '../users/schema';

import { userAuthenticationMethods, UserAuthenticationMethodModel } from './schema';

export class UserAuthenticationMethodRepository extends EntityRepository<
  UserAuthenticationMethodModel,
  UserAuthenticationMethod
> {
  protected table = userAuthenticationMethods;
  protected schemaName = 'userAuthenticationMethods' as const;
  protected searchFields: Array<keyof UserAuthenticationMethodModel> = ['provider', 'providerId'];
  protected defaultSortField: keyof UserAuthenticationMethodModel = 'createdAt';
  protected relations: RelationsConfig<UserAuthenticationMethod> = {
    user: {
      field: 'user',
      table: users,
      extract: (v: Array<UserAuthenticationMethod>) =>
        v.map(({ user }: UserAuthenticationMethod) => user),
    },
  };

  async getUserAuthenticationMethods(
    params: QueryUserAuthenticationMethodsArgs & SelectedFields<UserAuthenticationMethod>,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod[]> {
    const { userId, requestedFields } = params;

    const filters: FilterCondition<UserAuthenticationMethodModel>[] = [
      {
        field: 'userId',
        operator: 'eq',
        value: userId,
      },
    ];

    const result = await this.query(
      {
        filters,
        requestedFields,
        limit: -1,
      },
      transaction
    );

    return result.items;
  }

  async getUserAuthenticationMethod(
    id: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const result = await this.query({ ids: [id], limit: 1 }, transaction);
    return result.items[0] as UserAuthenticationMethod;
  }

  async createUserAuthenticationMethod(
    params: CreateUserAuthenticationMethodInput,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    return this.create(params, transaction);
  }

  async updateUserAuthenticationMethod(
    params: MutationUpdateUserAuthenticationMethodArgs,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    return this.update(params, transaction);
  }

  async softDeleteUserAuthenticationMethod(
    params: MutationDeleteUserAuthenticationMethodArgs,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    return this.softDelete(params, transaction);
  }

  async hardDeleteUserAuthenticationMethod(
    params: MutationDeleteUserAuthenticationMethodArgs,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    return this.hardDelete(params, transaction);
  }
}
