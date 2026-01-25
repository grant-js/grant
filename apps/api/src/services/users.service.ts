import { GrantAuth } from '@grantjs/core';
import { DbSchema, userAuditLogs } from '@grantjs/database';
import {
  CreateUserInput,
  MutationDeleteUserArgs,
  QueryUsersArgs,
  UpdateUserInput,
  User,
  UserPage,
} from '@grantjs/schema';

import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  DeleteParams,
  SelectedFields,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  deleteSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  createUserInputSchema,
  deleteUserArgsSchema,
  queryUsersArgsSchema,
  updateUserArgsSchema,
  userSchema,
} from './users.schemas';

export class UserService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: GrantAuth | null,
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
      throw new NotFoundError('User not found', 'errors:notFound.user');
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
      metadata: user.metadata,
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
    id: string,
    input: Omit<UpdateUserInput, 'scope'>,
    transaction?: Transaction
  ): Promise<User> {
    const context = 'UserService.updateUser';
    const validatedParams = validateInput(updateUserArgsSchema, { id, input }, context);

    const oldUser = await this.getUser(validatedParams.id);
    const updatedUser = await this.repositories.userRepository.updateUser(
      validatedParams.id,
      validatedParams.input,
      transaction
    );

    const oldValues = {
      id: oldUser.id,
      name: oldUser.name,
      metadata: oldUser.metadata,
      createdAt: oldUser.createdAt,
      updatedAt: oldUser.updatedAt,
    };

    const newValues = {
      id: updatedUser.id,
      name: updatedUser.name,
      metadata: updatedUser.metadata,
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

  public async deleteOwnUser(params: DeleteParams, transaction?: Transaction): Promise<User> {
    const context = 'UserService.deleteOwnUser';
    const validatedParams = validateInput(deleteSchema, params, context);
    const { hardDelete } = validatedParams;

    const id = this.user?.userId;

    if (!id) {
      throw new AuthenticationError('Not authenticated', 'errors:auth.unauthenticated');
    }

    return this.deleteUser({ id, hardDelete }, transaction);
  }
}
