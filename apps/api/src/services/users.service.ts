import {
  GrantAuth,
  type IAuditLogger,
  type IUserRepository,
  type IUserService,
} from '@grantjs/core';
import {
  CreateUserInput,
  MutationDeleteUserArgs,
  QueryUsersArgs,
  UpdateUserInput,
  User,
  UserAuthenticationMethodProvider,
  UserPage,
} from '@grantjs/schema';

import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import {
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

export class UserService implements IUserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly user: GrantAuth | null,
    private readonly audit: IAuditLogger
  ) {}

  private async getUser(userId: string): Promise<User> {
    const existingUsers = await this.userRepository.getUsers({
      ids: [userId],
      limit: 1,
    });

    if (existingUsers.users.length === 0) {
      throw new NotFoundError('User');
    }

    return existingUsers.users[0];
  }

  public async getUsers(
    params: Omit<QueryUsersArgs, 'scope'> & SelectedFields<User>,
    transaction?: Transaction
  ): Promise<UserPage> {
    const context = 'UserService.getUsers';
    validateInput(queryUsersArgsSchema, params, context);
    const result = await this.userRepository.getUsers(params, transaction);

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
    const user = await this.userRepository.createUser(params, transaction);

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

    await this.audit.logCreate(user.id, newValues, metadata, transaction);

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
    const updatedUser = await this.userRepository.updateUser(
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

    await this.audit.logUpdate(updatedUser.id, oldValues, newValues, metadata, transaction);

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

    // For hard deletes, write the audit log BEFORE the entity is removed so the
    // FK (user_audit_logs.user_id → users.id) is still valid.  The subsequent
    // DELETE will trigger ON DELETE SET NULL on the audit row, but the old data
    // is preserved in the oldValues JSON column.
    if (isHardDelete) {
      await this.audit.logHardDelete(oldUser.id, oldValues, metadata, transaction);
    }

    const deletedUser = isHardDelete
      ? await this.userRepository.hardDeleteUser(validatedParams, transaction)
      : await this.userRepository.softDeleteUser(validatedParams, transaction);

    if (!isHardDelete) {
      const newValues = {
        ...oldValues,
        deletedAt: deletedUser.deletedAt,
      };
      await this.audit.logSoftDelete(deletedUser.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(userSchema), deletedUser, context);
  }

  public async deleteOwnUser(params: DeleteParams, transaction?: Transaction): Promise<User> {
    const context = 'UserService.deleteOwnUser';
    const validatedParams = validateInput(deleteSchema, params, context);
    const { hardDelete } = validatedParams;

    const id = this.user?.userId;

    if (!id) {
      throw new AuthenticationError('Not authenticated');
    }

    return this.deleteUser({ id, hardDelete }, transaction);
  }

  public async getEmailVerificationStatus(
    userId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const usersResult = await this.userRepository.getUsers(
      {
        ids: [userId],
        limit: 1,
        requestedFields: ['authenticationMethods'],
      },
      transaction
    );

    const user = usersResult.users[0];
    if (!user) {
      return true;
    }

    const allAuthMethods = Array.isArray(user.authenticationMethods)
      ? user.authenticationMethods
      : [];

    const emailAuthMethod = allAuthMethods.find(
      (method) => method.provider === UserAuthenticationMethodProvider.Email
    );

    if (!emailAuthMethod) {
      return true;
    }

    return emailAuthMethod.isVerified;
  }
}
