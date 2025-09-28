import {
  UserSession,
  CreateUserSessionInput,
  UserAuthenticationMethod,
  User,
  UserSessionSearchableField,
  Tenant,
  UpdateUserSessionInput,
  GetUserSessionsInput,
  UserSessionPage,
  SortOrder,
  UserSessionSortableField,
  DeleteUserSessionInput,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { SelectedFields } from '@/graphql/services/common';

import {
  BaseUpdateArgs,
  EntityRepository,
  FilterCondition,
  RelationsConfig,
} from '../common/EntityRepository';
import { userAuthenticationMethods } from '../user-authentication-methods/schema';
import { users } from '../users/schema';

import { userSessions, UserSessionModel } from './schema';

export class UserSessionRepository extends EntityRepository<UserSessionModel, UserSession> {
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

    if (params.scopeTenant) {
      filters.push({
        field: 'scopeTenant',
        operator: 'eq',
        value: params.scopeTenant,
      });
    }

    if (params.scopeId) {
      filters.push({
        field: 'scopeId',
        operator: 'eq',
        value: params.scopeId,
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
    session: CreateUserSessionInput,
    transaction?: Transaction
  ): Promise<UserSession> {
    return this.create(session, transaction);
  }

  public async getLastValidUserSession(
    userId: string,
    scopeTenant: Tenant,
    scopeId: string,
    token?: string
  ): Promise<UserSession> {
    const now = new Date();

    const filters: FilterCondition<UserSessionModel>[] = [
      { field: 'expiresAt', operator: 'gte', value: now },
      { field: 'userId', operator: 'eq', value: userId },
      { field: 'scopeTenant', operator: 'eq', value: scopeTenant },
      { field: 'scopeId', operator: 'eq', value: scopeId },
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

  async updateUserSession(
    params: UpdateUserSessionInput,
    transaction?: Transaction
  ): Promise<UserSession> {
    const baseUpdateArgs: BaseUpdateArgs = {
      id: params.id,
      input: {
        lastUsedAt: params.lastUsedAt,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
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
