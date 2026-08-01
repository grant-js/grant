import type { IUserAuthenticationMethodRepository } from '@grantjs/core';
import { UserAuthenticationMethodModel, userAuthenticationMethods, users } from '@grantjs/database';
import {
  CreateUserAuthenticationMethodInput,
  DeleteUserAuthenticationMethodInput,
  GetUserAuthenticationMethodsInput,
  UpdateUserAuthenticationMethodInput,
  User,
  UserAuthenticationMethod,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { and, eq, inArray } from 'drizzle-orm';

import { BadRequestError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import {
  BaseUpdateArgs,
  EntityRepository,
  FilterCondition,
  RelationsConfig,
} from './common/EntityRepository';

export class UserAuthenticationMethodRepository
  extends EntityRepository<UserAuthenticationMethodModel, UserAuthenticationMethod>
  implements IUserAuthenticationMethodRepository
{
  protected table = userAuthenticationMethods;
  protected schemaName = 'userAuthenticationMethods' as const;
  protected searchFields: Array<keyof UserAuthenticationMethodModel> = ['provider', 'providerId'];
  protected defaultSortField: keyof UserAuthenticationMethodModel = 'createdAt';
  protected relations: RelationsConfig<UserAuthenticationMethod> = {
    user: {
      field: 'user',
      table: users,
      extract: (v: User) => v,
    },
  };

  async getUserAuthenticationMethods(
    params: GetUserAuthenticationMethodsInput & SelectedFields<UserAuthenticationMethod>,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod[]> {
    const { userId, provider, requestedFields } = params;

    const filters: FilterCondition<UserAuthenticationMethodModel>[] = [];

    if (!userId && !provider) {
      throw new BadRequestError('Either userId or provider must be provided');
    }

    if (userId) {
      filters.push({
        field: 'userId',
        operator: 'eq',
        value: userId,
      });
    }

    if (provider) {
      filters.push({
        field: 'provider',
        operator: 'eq',
        value: provider,
      });
    }

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

  async findByProviderAndProviderId(
    provider: string,
    providerId: string,
    providerData?: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod | null> {
    const filters: FilterCondition<UserAuthenticationMethodModel>[] = [
      {
        field: 'provider',
        operator: 'eq',
        value: provider,
      },
      {
        field: 'providerId',
        operator: 'eq',
        value: providerId,
      },
    ];

    if (providerData) {
      Object.entries(providerData).forEach(([key, value]) => {
        filters.push({
          field: `providerData.${key}` as keyof UserAuthenticationMethodModel,
          operator: 'eq',
          value,
        });
      });
    }

    const result = await this.query(
      {
        filters,
        limit: 1,
      },
      transaction
    );

    return result.items[0] || null;
  }

  async createUserAuthenticationMethod(
    params: Omit<CreateUserAuthenticationMethodInput, 'providerData'> & {
      providerData?: Record<string, unknown>;
    },
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    return this.create(params, transaction);
  }

  async updateUserAuthenticationMethod(
    id: string,
    input: UpdateUserAuthenticationMethodInput,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const baseUpdateArgs: BaseUpdateArgs = {
      id,
      input,
    };

    return this.update(baseUpdateArgs, transaction);
  }

  async softDeleteUserAuthenticationMethod(
    params: DeleteUserAuthenticationMethodInput,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    return this.softDelete(params, transaction);
  }

  async hardDeleteUserAuthenticationMethod(
    params: DeleteUserAuthenticationMethodInput,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    return this.hardDelete(params, transaction);
  }

  async findByToken(
    token: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod | null> {
    const filters: FilterCondition<UserAuthenticationMethodModel>[] = [
      {
        field: 'providerData.otp.token' as keyof UserAuthenticationMethodModel,
        operator: 'eq',
        value: token,
      },
    ];

    const result = await this.query(
      {
        filters,
        limit: 1,
      },
      transaction
    );

    return result.items[0] || null;
  }

  /**
   * Find auth method by email (case-insensitive).
   * Checks Email provider by providerId, then GitHub provider by providerData.email.
   */
  async findByEmail(
    email: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod | null> {
    const emailNorm = email.trim().toLowerCase();
    const emailProviderResult = await this.query(
      {
        filters: [
          { field: 'provider', operator: 'eq', value: UserAuthenticationMethodProvider.Email },
          { field: 'providerId', operator: 'ilike', value: emailNorm },
        ],
        limit: 1,
      },
      transaction
    );

    if (emailProviderResult.items.length > 0) {
      return emailProviderResult.items[0];
    }

    const githubProviderResult = await this.query(
      {
        filters: [
          { field: 'provider', operator: 'eq', value: UserAuthenticationMethodProvider.Github },
          {
            field: 'providerData.email' as keyof UserAuthenticationMethodModel,
            operator: 'ilike',
            value: emailNorm,
          },
        ],
        limit: 1,
      },
      transaction
    );

    if (githubProviderResult.items.length > 0) {
      return githubProviderResult.items[0];
    }

    return null;
  }

  /**
   * Resolve primary email addresses for the given user ids (email provider's
   * `providerId`). Users without an email auth method are omitted.
   */
  async getEmailsByUserIds(
    userIds: string[],
    transaction?: Transaction
  ): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        userId: userAuthenticationMethods.userId,
        providerId: userAuthenticationMethods.providerId,
      })
      .from(userAuthenticationMethods)
      .where(
        and(
          eq(userAuthenticationMethods.provider, UserAuthenticationMethodProvider.Email),
          inArray(userAuthenticationMethods.userId, userIds)
        )
      );

    const emails = new Map<string, string>();
    for (const row of rows) {
      if (!emails.has(row.userId)) emails.set(row.userId, row.providerId);
    }
    return emails;
  }
}
