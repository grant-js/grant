import type { IUserRepository } from '@grantjs/core';
import {
  accounts,
  roles,
  tags,
  userAuthenticationMethods,
  UserModel,
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
import { and, isNull, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import { EntityRepository, RelationsConfig } from '@/repositories/common';
import { SelectedFields } from '@/types';

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

  public async findUserIdByCdmImport(
    params: { projectId: string; kind: string; externalKey: string },
    transaction?: Transaction
  ): Promise<string | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          sql`${users.metadata}->'cdmImport'->>'projectId' = ${params.projectId}`,
          sql`${users.metadata}->'cdmImport'->>'kind' = ${params.kind}`,
          sql`${users.metadata}->'cdmImport'->>'externalKey' = ${params.externalKey}`
        )
      )
      .limit(1);
    return rows[0]?.id ?? null;
  }

  public async updateUser(
    id: string,
    input: Omit<UpdateUserInput, 'scope'> & { picturePath?: string | null },
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
