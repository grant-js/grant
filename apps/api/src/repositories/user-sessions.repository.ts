import type { IUserSessionRepository } from '@grantjs/core';
import {
  userAuthenticationMethods,
  users,
  UserSessionModel,
  userSessions,
} from '@grantjs/database';
import {
  CreateUserSessionInput,
  DeleteUserSessionInput,
  GetUserSessionsInput,
  SortOrder,
  UpdateUserSessionInput,
  User,
  UserAuthenticationMethod,
  UserSession,
  UserSessionPage,
  UserSessionSearchableField,
  UserSessionSortableField,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import {
  BaseUpdateArgs,
  EntityRepository,
  FilterCondition,
  RelationsConfig,
} from './common/EntityRepository';

export class UserSessionRepository
  extends EntityRepository<UserSessionModel, UserSession>
  implements IUserSessionRepository
{
  protected table = userSessions;
  protected schemaName = 'userSessions' as const;
  protected searchFields: Array<keyof UserSessionModel> = Object.values(UserSessionSearchableField);
  protected defaultSortField: keyof UserSessionModel = 'lastUsedAt';
  protected relations: RelationsConfig<UserSession> = {
    user: {
      field: 'user',
      table: users,
      extract: (value: User) => value,
    },
    userAuthenticationMethod: {
      field: 'userAuthenticationMethod',
      table: userAuthenticationMethods,
      extract: (value: UserAuthenticationMethod) => value,
    },
  };

  public async getUserSessions(
    params: GetUserSessionsInput & SelectedFields<UserSession>,
    transaction?: Transaction
  ): Promise<UserSessionPage> {
    const filters: FilterCondition<UserSessionModel>[] = [];

    if (params.userId) {
      filters.push({
        field: 'userId',
        operator: 'eq',
        value: params.userId,
      });
    }

    if (params.audience) {
      filters.push({
        field: 'audience',
        operator: 'eq',
        value: params.audience,
      });
    }

    if (params.expiresAtMin) {
      filters.push({
        field: 'expiresAt',
        operator: 'gte',
        value: params.expiresAtMin,
      });
    }

    if (params.userAgent !== undefined) {
      filters.push({
        field: 'userAgent',
        operator: 'eq',
        value: params.userAgent,
      });
    }

    if (params.ipAddress !== undefined) {
      filters.push({
        field: 'ipAddress',
        operator: 'eq',
        value: params.ipAddress,
      });
    }

    const result = await this.query(
      {
        limit: params.limit,
        page: params.page,
        search: params.search,
        sort: params.sort,
        ids: params.ids,
        filters,
        requestedFields: params.requestedFields,
      },
      transaction
    );

    return {
      userSessions: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createUserSession(
    session: CreateUserSessionInput & { audience: string },
    transaction?: Transaction
  ): Promise<UserSession> {
    return this.create(session, transaction);
  }

  public async getLastValidUserSession(
    userId: string,
    audience: string,
    token?: string
  ): Promise<UserSession> {
    const now = new Date();

    const filters: FilterCondition<UserSessionModel>[] = [
      { field: 'expiresAt', operator: 'gte', value: now },
      { field: 'userId', operator: 'eq', value: userId },
      { field: 'audience', operator: 'eq', value: audience },
    ];

    if (token) {
      filters.push({ field: 'token', operator: 'eq', value: token });
    }

    const result = await this.query({
      limit: 1,
      sort: {
        field: UserSessionSortableField.LastUsedAt,
        order: SortOrder.Desc,
      },
      filters,
    });

    return result.items[0];
  }

  /**
   * Find a valid session by refresh token only (for cookie-based refresh).
   */
  public async getSessionByRefreshToken(
    token: string,
    transaction?: Transaction
  ): Promise<UserSession | undefined> {
    const now = new Date();
    const result = await this.query(
      {
        limit: 1,
        filters: [
          { field: 'token', operator: 'eq', value: token },
          { field: 'expiresAt', operator: 'gte', value: now },
        ],
      },
      transaction
    );
    return result.items[0];
  }

  async updateUserSession(
    params: UpdateUserSessionInput,
    transaction?: Transaction
  ): Promise<UserSession> {
    const extended = params as UpdateUserSessionInput & { mfaVerifiedAt?: Date | null };
    const input: Record<string, unknown> = {
      lastUsedAt: extended.lastUsedAt,
      userAgent: extended.userAgent,
      ipAddress: extended.ipAddress,
    };
    if (extended.mfaVerifiedAt !== undefined) {
      input.mfaVerifiedAt = extended.mfaVerifiedAt;
    }
    const baseUpdateArgs: BaseUpdateArgs = {
      id: params.id,
      input,
    };

    return this.update(baseUpdateArgs, transaction);
  }

  async refreshUserSession(
    id: string,
    token: string,
    expiresAt: Date,
    lastUsedAt: Date,
    userAgent?: string | null,
    ipAddress?: string | null,
    transaction?: Transaction
  ): Promise<UserSession> {
    const baseUpdateArgs: BaseUpdateArgs = {
      id,
      input: {
        token,
        expiresAt,
        lastUsedAt,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
      },
    };

    return this.update(baseUpdateArgs, transaction);
  }

  async softDeleteUserSession(
    params: DeleteUserSessionInput,
    transaction?: Transaction
  ): Promise<UserSession> {
    return this.softDelete(params, transaction);
  }

  async hardDeleteUserSession(
    params: DeleteUserSessionInput,
    transaction?: Transaction
  ): Promise<UserSession> {
    return this.hardDelete(params, transaction);
  }
}
