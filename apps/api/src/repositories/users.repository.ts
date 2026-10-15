import type { CdmPasswordIdentity, IUserRepository } from '@grantjs/core';
import {
  accounts,
  organizationProjects,
  organizationUsers,
  projectUsers,
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
  UserAuthenticationMethodProvider,
  UserPage,
  UserRole,
  UserSearchableField,
  UserTag,
} from '@grantjs/schema';
import { and, count, eq, inArray, isNull, ne, sql } from 'drizzle-orm';

import { isConfinedToOrganization } from '@/lib/cdm/cdm-org-confinement.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { EntityRepository, RelationsConfig } from '@/repositories/common';
import { SelectedFields } from '@/types';

/** Bound parameters per `IN (...)`, well under PostgreSQL's 65,535 limit. */
const IN_LIST_CHUNK_SIZE = 5000;

function chunked<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

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

  public async findCdmPasswordIdentities(params: {
    projectId: string;
    emails: readonly string[];
  }): Promise<CdmPasswordIdentity[]> {
    const emails = [...new Set(params.emails.map((email) => email.trim().toLowerCase()))];
    if (emails.length === 0) return [];

    // Deliberately `this.db`, never the import transaction. The import runs under the
    // restricted RLS role with the importing project as its tenant, and `project_users`,
    // `organization_projects` and `organization_users` would then show only rows of that
    // project or organization: a user who also belongs to another organization would look
    // confined. The application login role reads across tenants (the "system bypass" in
    // docs/architecture/security.md), and these reads change nothing. This relies on the
    // repository being built over the application pool, as the sync job's app context does;
    // one built over a request's RLS transaction would see only that tenant's rows.
    const db = this.db;

    // The importing project's organization. A project that belongs to none, or to more than
    // one, has no single organization to confine to, so no identity counts as confined.
    const organizationRows = await db
      .select({ organizationId: organizationProjects.organizationId })
      .from(organizationProjects)
      .where(
        and(
          eq(organizationProjects.projectId, params.projectId),
          isNull(organizationProjects.deletedAt)
        )
      )
      .limit(2);
    const importingOrganizationId =
      organizationRows.length === 1 ? organizationRows[0].organizationId : null;

    const identities: Array<
      Omit<CdmPasswordIdentity, 'confinedToImportingOrganization' | 'hasOAuthMethod'>
    > = [];
    for (const chunk of chunked(emails, IN_LIST_CHUNK_SIZE)) {
      const rows = await db
        .select({
          methodId: userAuthenticationMethods.id,
          userId: userAuthenticationMethods.userId,
          providerId: userAuthenticationMethods.providerId,
          cdmImport: sql<unknown>`${users.metadata}->'cdmImport'`,
        })
        .from(userAuthenticationMethods)
        .innerJoin(users, eq(users.id, userAuthenticationMethods.userId))
        .where(
          and(
            eq(userAuthenticationMethods.provider, UserAuthenticationMethodProvider.Email),
            isNull(userAuthenticationMethods.deletedAt),
            isNull(users.deletedAt),
            inArray(sql`lower(${userAuthenticationMethods.providerId})`, chunk)
          )
        );
      for (const row of rows) {
        const raw = row.cdmImport;
        const cdm =
          raw != null && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : null;
        const text = (value: unknown) => (typeof value === 'string' ? value : null);
        identities.push({
          methodId: row.methodId,
          userId: row.userId,
          providerId: row.providerId,
          cdmImport: cdm
            ? {
                projectId: text(cdm.projectId),
                kind: text(cdm.kind),
                externalKey: text(cdm.externalKey),
              }
            : null,
        });
      }
    }

    const userIds = [...new Set(identities.map((identity) => identity.userId))];

    const oauthUserIds = new Set<string>();
    for (const chunk of chunked(userIds, IN_LIST_CHUNK_SIZE)) {
      const rows = await db
        .select({ userId: userAuthenticationMethods.userId })
        .from(userAuthenticationMethods)
        .where(
          and(
            inArray(userAuthenticationMethods.userId, chunk),
            inArray(userAuthenticationMethods.provider, [
              UserAuthenticationMethodProvider.Github,
              UserAuthenticationMethodProvider.Google,
            ]),
            isNull(userAuthenticationMethods.deletedAt)
          )
        );
      for (const row of rows) oauthUserIds.add(row.userId);
    }

    const confinedUserIds = new Set<string>();
    if (importingOrganizationId !== null && identities.length > 0) {
      const projectOrganizations = new Map<string, Map<string, string[]>>();
      const organizationIds = new Map<string, string[]>();
      for (const chunk of chunked(userIds, IN_LIST_CHUNK_SIZE)) {
        const memberships = await db
          .select({
            userId: projectUsers.userId,
            projectId: projectUsers.projectId,
            organizationId: organizationProjects.organizationId,
          })
          .from(projectUsers)
          .leftJoin(
            organizationProjects,
            and(
              eq(organizationProjects.projectId, projectUsers.projectId),
              isNull(organizationProjects.deletedAt)
            )
          )
          .where(and(inArray(projectUsers.userId, chunk), isNull(projectUsers.deletedAt)));
        for (const row of memberships) {
          const projects = projectOrganizations.get(row.userId) ?? new Map<string, string[]>();
          const orgs = projects.get(row.projectId) ?? [];
          if (row.organizationId !== null) orgs.push(row.organizationId);
          projects.set(row.projectId, orgs);
          projectOrganizations.set(row.userId, projects);
        }

        const organizationMemberships = await db
          .select({
            userId: organizationUsers.userId,
            organizationId: organizationUsers.organizationId,
          })
          .from(organizationUsers)
          .where(
            and(inArray(organizationUsers.userId, chunk), isNull(organizationUsers.deletedAt))
          );
        for (const row of organizationMemberships) {
          const orgs = organizationIds.get(row.userId) ?? [];
          orgs.push(row.organizationId);
          organizationIds.set(row.userId, orgs);
        }
      }
      for (const userId of userIds) {
        const confined = isConfinedToOrganization(
          {
            projectOrganizationIds: [...(projectOrganizations.get(userId)?.values() ?? [])],
            organizationIds: organizationIds.get(userId) ?? [],
          },
          importingOrganizationId
        );
        if (confined) confinedUserIds.add(userId);
      }
    }

    return identities.map((identity) => ({
      ...identity,
      confinedToImportingOrganization: confinedUserIds.has(identity.userId),
      hasOAuthMethod: oauthUserIds.has(identity.userId),
    }));
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
}
