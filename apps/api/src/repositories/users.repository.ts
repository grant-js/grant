import type { IUserRepository, OptionalListScope } from '@grantjs/core';
import {
  accounts,
  projectUsers,
  roles,
  tags,
  userAuthenticationMethods,
  UserModel,
  users,
  userTags,
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
import { and, count, eq, isNull, ne, sql } from 'drizzle-orm';

import { isProjectScopedUserMetadataTenant } from '@/lib/effective-project-user-metadata.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import {
  anyTagExistsSql,
  EntityRepository,
  projectUserSearchSql,
  RelationsConfig,
  requireAccessibleIdSource,
} from '@/repositories/common';
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
    params: Omit<QueryUsersArgs, 'scope'> & OptionalListScope & SelectedFields<User>,
    transaction?: Transaction
  ): Promise<UserPage> {
    const extraConditions = [];
    let skipSearch = false;
    let accessibleIdSource;
    if (params.scope) {
      accessibleIdSource = requireAccessibleIdSource('users', params.scope);
      if (params.tagIds?.length) {
        extraConditions.push(
          anyTagExistsSql(
            this.table.id,
            {
              table: userTags,
              ownerColumn: userTags.userId,
              tagColumn: userTags.tagId,
              deletedAt: userTags.deletedAt,
            },
            params.tagIds
          )
        );
      }
      if (params.search?.trim() && isProjectScopedUserMetadataTenant(params.scope.tenant)) {
        extraConditions.push(
          projectUserSearchSql(this.table.id, params.scope, params.search.trim())
        );
        skipSearch = true;
      }
    }
    const result = await this.query(
      { ...params, accessibleIdSource, extraConditions, skipSearch },
      transaction
    );

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
    const marker = JSON.stringify({
      cdmImport: {
        projectId: params.projectId,
        kind: params.kind,
        externalKey: params.externalKey,
      },
    });
    // Two index-friendly arms (containment is what `users_metadata_idx` and
    // `project_users_metadata_idx` serve), the global marker ranked before the membership row's.
    // Both arms require a live user; the row arm also requires a live row of this project.
    const globalMarker = dbInstance
      .select({ id: sql<string>`${users.id}`.as('id'), rank: sql<number>`0`.as('rank') })
      .from(users)
      .where(and(isNull(users.deletedAt), sql`${users.metadata} @> ${marker}::jsonb`));
    const membershipMarker = dbInstance
      .select({ id: sql<string>`${projectUsers.userId}`.as('id'), rank: sql<number>`1`.as('rank') })
      .from(projectUsers)
      .innerJoin(users, eq(users.id, projectUsers.userId))
      .where(
        and(
          eq(projectUsers.projectId, params.projectId),
          isNull(projectUsers.deletedAt),
          isNull(users.deletedAt),
          sql`${projectUsers.metadata} @> ${marker}::jsonb`
        )
      );
    const rows = (await globalMarker
      .unionAll(membershipMarker)
      .orderBy(sql`rank`)
      .limit(1)) as Array<{ id: string }>;
    return rows[0]?.id ?? null;
  }

  public async findLiveUserCdmMarkers(
    params: { userId: string; projectId: string },
    transaction?: Transaction
  ): Promise<{ globalMarker: unknown; membershipMarker: unknown } | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        globalMarker: sql<unknown>`${users.metadata}->'cdmImport'`,
        membershipMarker: sql<unknown>`${projectUsers.metadata}->'cdmImport'`,
      })
      .from(users)
      .leftJoin(
        projectUsers,
        and(
          eq(projectUsers.userId, users.id),
          eq(projectUsers.projectId, params.projectId),
          isNull(projectUsers.deletedAt)
        )
      )
      .where(and(eq(users.id, params.userId), isNull(users.deletedAt)))
      .limit(1);
    const row = rows[0];
    return row ? { globalMarker: row.globalMarker, membershipMarker: row.membershipMarker } : null;
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

  public async countHumanUsers(systemUserId: string, transaction?: Transaction): Promise<number> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .select({ value: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), ne(users.id, systemUserId)));
    return Number(row?.value ?? 0);
  }

  public async getUserMembershipMetadata(
    userId: string,
    transaction?: Transaction
  ): Promise<Array<{ projectId: string; metadata: unknown }>> {
    const dbInstance = transaction ?? this.db;
    return dbInstance
      .select({ projectId: projectUsers.projectId, metadata: projectUsers.metadata })
      .from(projectUsers)
      .where(and(eq(projectUsers.userId, userId), isNull(projectUsers.deletedAt)));
  }
}
