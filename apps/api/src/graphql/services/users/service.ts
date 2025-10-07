import { DbSchema } from '@logusgraphics/grant-database';
import { userAuditLogs } from '@logusgraphics/grant-database';
import {
  QueryUsersArgs,
  MutationUpdateUserArgs,
  MutationDeleteUserArgs,
  User,
  UserPage,
  CreateUserInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  SelectedFields,
  DeleteParams,
} from '../common';

import {
  userSchema,
  queryUsersArgsSchema,
  createUserInputSchema,
  updateUserArgsSchema,
  deleteUserArgsSchema,
} from './schemas';

export class UserService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(userAuditLogs, 'userId', user, db);
  }

  private async getUser(userId: string): Promise<User> {
    const existingUsers = await this.repositories.userRepository.getUsers({
      ids: [userId],
      limit: 1,
    });

    if (existingUsers.users.length === 0) {
      throw new Error('User not found');
    }

    return existingUsers.users[0];
  }

  public async getUsers(
    params: Omit<QueryUsersArgs, 'scope'> & SelectedFields<User>,
    transaction?: Transaction
  ): Promise<UserPage> {
    const context = 'UserService.getUsers';
    validateInput(queryUsersArgsSchema, params, context);
    const result = await this.repositories.userRepository.getUsers(params, transaction);

    const transformedResult = {
      items: result.users,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    validateOutput(
      createDynamicPaginatedSchema(userSchema, params.requestedFields),
      transformedResult,
      context
    );

    return result;
  }

  public async createUser(
    params: Omit<CreateUserInput, 'scope' | 'roleIds' | 'tagIds'>,
    transaction?: Transaction
  ): Promise<User> {
    const context = 'UserService.createUser';
    validateInput(createUserInputSchema, params, context);
    const user = await this.repositories.userRepository.createUser(params, transaction);

    const newValues = {
      id: user.id,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(user.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(userSchema), user, context);
  }

  public async updateUser(
    params: MutationUpdateUserArgs,
    transaction?: Transaction
  ): Promise<User> {
    const context = 'UserService.updateUser';
    const validatedParams = validateInput(updateUserArgsSchema, params, context);

    const oldUser = await this.getUser(validatedParams.id);
    const updatedUser = await this.repositories.userRepository.updateUser(
      validatedParams,
      transaction
    );

    const oldValues = {
      id: oldUser.id,
      name: oldUser.name,
      createdAt: oldUser.createdAt,
      updatedAt: oldUser.updatedAt,
    };

    const newValues = {
      id: updatedUser.id,
      name: updatedUser.name,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logUpdate(updatedUser.id, oldValues, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(userSchema), updatedUser, context);
  }

  public async deleteUser(
    params: Omit<MutationDeleteUserArgs, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<User> {
    const context = 'UserService.deleteUser';
    const validatedParams = validateInput(deleteUserArgsSchema, params, context);
    const { id, hardDelete } = validatedParams;

    const oldUser = await this.getUser(id);
    const isHardDelete = hardDelete === true;

    const deletedUser = isHardDelete
      ? await this.repositories.userRepository.hardDeleteUser(validatedParams, transaction)
      : await this.repositories.userRepository.softDeleteUser(validatedParams, transaction);

    const oldValues = {
      id: oldUser.id,
      name: oldUser.name,
      createdAt: oldUser.createdAt,
      updatedAt: oldUser.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(deletedUser.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedUser.deletedAt,
      };
      await this.logSoftDelete(deletedUser.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(userSchema), deletedUser, context);
  }
}
