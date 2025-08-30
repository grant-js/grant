import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  QueryUsersArgs,
  MutationCreateUserArgs,
  MutationUpdateUserArgs,
  MutationDeleteUserArgs,
  User,
  UserPage,
} from '@/graphql/generated/types';
import { Repositories } from '@/graphql/repositories';
import { userAuditLogs } from '@/graphql/repositories/users/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
} from '../common';

import { IUserService } from './interface';
import {
  getUsersParamsSchema,
  createUserParamsSchema,
  updateUserParamsSchema,
  deleteUserParamsSchema,
  userSchema,
} from './schemas';

export class UserService extends AuditService implements IUserService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    private readonly db: PostgresJsDatabase
  ) {
    super(userAuditLogs, 'userId', user);
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
    params: Omit<QueryUsersArgs, 'scope'> & { requestedFields?: string[] }
  ): Promise<UserPage> {
    const validatedParams = validateInput(getUsersParamsSchema, params, 'getUsers method');
    const result = await this.repositories.userRepository.getUsers(validatedParams as any);

    // Transform repository result to standard format for validation
    const transformedResult = {
      items: result.users,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    const validatedResult = validateOutput(
      createDynamicPaginatedSchema(userSchema, params.requestedFields),
      transformedResult,
      'getUsers method'
    ) as any;

    return {
      users: validatedResult.items,
      hasNextPage: validatedResult.hasNextPage,
      totalCount: validatedResult.totalCount,
    };
  }

  public async createUser(params: MutationCreateUserArgs): Promise<User> {
    const validatedParams = validateInput(createUserParamsSchema, params, 'createUser method');
    const user = await this.repositories.userRepository.createUser(validatedParams);

    const newValues = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const metadata = {
      source: 'create_user_mutation',
    };

    await this.logCreate(user.id, newValues, metadata);

    return validateOutput(createDynamicSingleSchema(userSchema), user, 'createUser method');
  }

  public async updateUser(params: MutationUpdateUserArgs): Promise<User> {
    const validatedParams = validateInput(updateUserParamsSchema, params, 'updateUser method');

    const oldUser = await this.getUser(validatedParams.id);
    const updatedUser = await this.repositories.userRepository.updateUser(validatedParams);

    const oldValues = {
      id: oldUser.id,
      name: oldUser.name,
      email: oldUser.email,
      createdAt: oldUser.createdAt,
      updatedAt: oldUser.updatedAt,
    };

    const newValues = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    const metadata = {
      source: 'update_user_mutation',
    };

    await this.logUpdate(updatedUser.id, oldValues, newValues, metadata);

    return validateOutput(createDynamicSingleSchema(userSchema), updatedUser, 'updateUser method');
  }

  public async deleteUser(
    params: MutationDeleteUserArgs & { hardDelete?: boolean }
  ): Promise<User> {
    const validatedParams = validateInput(deleteUserParamsSchema, params, 'deleteUser method');

    const oldUser = await this.getUser(validatedParams.id);
    const isHardDelete = params.hardDelete === true;

    const deletedUser = isHardDelete
      ? await this.repositories.userRepository.hardDeleteUser(validatedParams)
      : await this.repositories.userRepository.softDeleteUser(validatedParams);

    const oldValues = {
      id: oldUser.id,
      name: oldUser.name,
      email: oldUser.email,
      createdAt: oldUser.createdAt,
      updatedAt: oldUser.updatedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_user_mutation',
      };
      await this.logHardDelete(deletedUser.id, oldValues, metadata);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedUser.deletedAt,
      };

      const metadata = {
        source: 'soft_delete_user_mutation',
      };
      await this.logSoftDelete(deletedUser.id, oldValues, newValues, metadata);
    }

    return validateOutput(createDynamicSingleSchema(userSchema), deletedUser, 'deleteUser method');
  }
}
