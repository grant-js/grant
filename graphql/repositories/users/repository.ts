import {
  QueryUsersArgs,
  MutationCreateUserArgs,
  MutationUpdateUserArgs,
  MutationDeleteUserArgs,
  User,
  UserPage,
} from '@/graphql/generated/types';
import {
  EntityRepository,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
} from '@/graphql/repositories/common';
import { SelectedFields } from '@/graphql/services/common';

import { UserModel, users } from './schema';

export class UserRepository extends EntityRepository<UserModel, User> {
  protected table = users;
  protected schemaName = 'users' as const;
  protected searchFields: Array<keyof UserModel> = ['name', 'email'];
  protected defaultSortField: keyof UserModel = 'createdAt';

  public async getUsers(
    params: Omit<QueryUsersArgs, 'scope' | 'tagIds'> & SelectedFields<UserModel>
  ): Promise<UserPage> {
    const result = await this.query(params);

    return {
      users: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createUser(params: MutationCreateUserArgs): Promise<User> {
    const baseParams: BaseCreateArgs = {
      name: params.input.name,
      email: params.input.email,
    };

    return this.create(baseParams);
  }

  public async updateUser(params: MutationUpdateUserArgs): Promise<User> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        email: params.input.email,
      },
    };

    return this.update(baseParams);
  }

  public async softDeleteUser(params: MutationDeleteUserArgs): Promise<User> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams);
  }

  public async hardDeleteUser(params: MutationDeleteUserArgs): Promise<User> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams);
  }
}
