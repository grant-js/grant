import type {
  IProjectUserIdentityLinkRepository,
  ProjectUserIdentityLinkFacts,
  ProjectUserIdentityLinkMoveCounts,
  ProjectUserIdentityLinkMoveResult,
} from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import { type SQL, sql } from 'drizzle-orm';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';

type Executor = DbSchema | Transaction;

/** A project pivot keyed by `(project_id, user_id, <target>)`. */
interface ProjectPivot {
  table: string;
  target: string;
  count: keyof ProjectUserIdentityLinkMoveCounts;
}

/** A global user pivot whose target the project owns through `<ownerTable>`. */
interface OwnedPivot {
  table: string;
  target: string;
  ownerTable: string;
  count: keyof ProjectUserIdentityLinkMoveCounts;
}

const PROJECT_PIVOTS: readonly ProjectPivot[] = [
  { table: 'project_user_groups', target: 'group_id', count: 'projectUserGroups' },
  { table: 'project_user_permissions', target: 'permission_id', count: 'projectUserPermissions' },
  { table: 'project_user_api_keys', target: 'api_key_id', count: 'projectUserApiKeys' },
];

const OWNED_PIVOTS: readonly OwnedPivot[] = [
  { table: 'user_roles', target: 'role_id', ownerTable: 'project_roles', count: 'userRoles' },
  { table: 'user_groups', target: 'group_id', ownerTable: 'project_groups', count: 'userGroups' },
  {
    table: 'user_permissions',
    target: 'permission_id',
    ownerTable: 'project_permissions',
    count: 'userPermissions',
  },
  { table: 'user_tags', target: 'tag_id', ownerTable: 'project_tags', count: 'userTags' },
];

const id = (name: string) => sql.identifier(name);

/**
 * The writes of `linkProjectUserIdentity`. Table and column names come from the constants
 * above, never from input; every value is a bound parameter. A row is re-pointed (same id),
 * not copied, so audit trails and CDM markers on it stay with it.
 */
export class ProjectUserIdentityLinkRepository implements IProjectUserIdentityLinkRepository {
  /**
   * @param db the request's connection (restricted role, project tenant).
   * @param baseDb the unrestricted pool, for the one read the project's RLS would hide.
   */
  constructor(
    private readonly db: DbSchema,
    private readonly baseDb: DbSchema = db
  ) {}

  async readLinkFacts(
    params: { projectId: string; organizationId: string; fromUserId: string; toUserId: string },
    transaction?: Transaction
  ): Promise<ProjectUserIdentityLinkFacts> {
    const { projectId, organizationId, fromUserId, toUserId } = params;
    const rows = await this.rows<Record<keyof ProjectUserIdentityLinkFacts, boolean>>(
      transaction,
      sql`SELECT
        EXISTS (SELECT 1 FROM organization_projects op JOIN projects p ON p.id = op.project_id
                WHERE op.organization_id = ${organizationId} AND op.project_id = ${projectId}
                  AND op.deleted_at IS NULL AND p.deleted_at IS NULL) AS "projectInOrganization",
        EXISTS (SELECT 1 FROM project_users
                WHERE project_id = ${projectId} AND user_id = ${fromUserId}
                  AND deleted_at IS NULL) AS "fromIsMember",
        EXISTS (SELECT 1 FROM users WHERE id = ${toUserId} AND deleted_at IS NULL) AS "toIsLive",
        EXISTS (SELECT 1 FROM organization_users
                WHERE organization_id = ${organizationId} AND user_id = ${toUserId}
                  AND deleted_at IS NULL) AS "toInOrganization",
        EXISTS (SELECT 1 FROM project_users
                WHERE project_id = ${projectId} AND user_id = ${toUserId}
                  AND deleted_at IS NULL) AS "toIsMember"`
    );
    const row = rows[0];
    return {
      projectInOrganization: row?.projectInOrganization === true,
      fromIsMember: row?.fromIsMember === true,
      toIsLive: row?.toIsLive === true,
      toInOrganization: row?.toInOrganization === true,
      toIsMember: row?.toIsMember === true,
    };
  }

  async moveProjectMembership(
    params: { projectId: string; fromUserId: string; toUserId: string },
    transaction?: Transaction
  ): Promise<ProjectUserIdentityLinkMoveResult> {
    const { projectId, fromUserId, toUserId } = params;
    const counts: ProjectUserIdentityLinkMoveCounts = {
      projectUsers: 0,
      projectUserGroups: 0,
      projectUserPermissions: 0,
      projectUserApiKeys: 0,
      projectUserCredentials: 0,
      userRoles: 0,
      userGroups: 0,
      userPermissions: 0,
      userTags: 0,
      duplicatesRetired: 0,
    };

    const membership = await this.rows<{ id: string }>(
      transaction,
      sql`UPDATE project_users SET user_id = ${toUserId}, updated_at = now()
          WHERE project_id = ${projectId} AND user_id = ${fromUserId} AND deleted_at IS NULL
          RETURNING id`
    );
    if (membership.length !== 1) {
      throw new NotFoundError('User');
    }
    counts.projectUsers = 1;

    for (const pivot of PROJECT_PIVOTS) {
      const scope = (alias: string) =>
        sql`${sql.raw(alias)}.project_id = ${projectId} AND ${sql.raw(alias)}.deleted_at IS NULL`;
      counts.duplicatesRetired += await this.count(
        transaction,
        sql`UPDATE ${id(pivot.table)} f SET deleted_at = now(), updated_at = now()
            WHERE ${scope('f')} AND f.user_id = ${fromUserId}
              AND EXISTS (SELECT 1 FROM ${id(pivot.table)} t
                          WHERE ${scope('t')} AND t.user_id = ${toUserId}
                            AND t.${id(pivot.target)} = f.${id(pivot.target)})
            RETURNING f.id`
      );
      counts[pivot.count] = await this.count(
        transaction,
        sql`UPDATE ${id(pivot.table)} SET user_id = ${toUserId}, updated_at = now()
            WHERE project_id = ${projectId} AND user_id = ${fromUserId} AND deleted_at IS NULL
            RETURNING id`
      );
    }

    for (const pivot of OWNED_PIVOTS) {
      const owned = sql`SELECT o.${id(pivot.target)} FROM ${id(pivot.ownerTable)} o
                        WHERE o.project_id = ${projectId} AND o.deleted_at IS NULL`;
      counts.duplicatesRetired += await this.count(
        transaction,
        sql`UPDATE ${id(pivot.table)} f SET deleted_at = now(), updated_at = now()
            WHERE f.user_id = ${fromUserId} AND f.deleted_at IS NULL
              AND f.${id(pivot.target)} IN (${owned})
              AND EXISTS (SELECT 1 FROM ${id(pivot.table)} t
                          WHERE t.user_id = ${toUserId} AND t.deleted_at IS NULL
                            AND t.${id(pivot.target)} = f.${id(pivot.target)})
            RETURNING f.id`
      );
      counts[pivot.count] = await this.count(
        transaction,
        sql`UPDATE ${id(pivot.table)} SET user_id = ${toUserId}, updated_at = now()
            WHERE user_id = ${fromUserId} AND deleted_at IS NULL
              AND ${id(pivot.target)} IN (${owned})
            RETURNING id`
      );
    }

    // One live credential per (project, user): a target row left from an earlier membership
    // gives way to the source's, which is the one this project's import or operator wrote.
    counts.duplicatesRetired += await this.count(
      transaction,
      sql`UPDATE project_user_credentials SET deleted_at = now(), updated_at = now()
          WHERE project_id = ${projectId} AND user_id = ${toUserId} AND deleted_at IS NULL
            AND EXISTS (SELECT 1 FROM project_user_credentials s
                        WHERE s.project_id = ${projectId} AND s.user_id = ${fromUserId}
                          AND s.deleted_at IS NULL)
          RETURNING id`
    );
    counts.projectUserCredentials = await this.count(
      transaction,
      sql`UPDATE project_user_credentials SET user_id = ${toUserId}, updated_at = now()
          WHERE project_id = ${projectId} AND user_id = ${fromUserId} AND deleted_at IS NULL
          RETURNING id`
    );

    await this.exec(
      transaction,
      sql`DELETE FROM project_user_credential_lockouts
          WHERE project_id = ${projectId} AND user_id = ${fromUserId}`
    );
    await this.exec(
      transaction,
      sql`DELETE FROM project_password_resets
          WHERE project_id = ${projectId} AND user_id = ${fromUserId}`
    );

    return { projectUserId: membership[0].id, counts };
  }

  async hasMembershipOutsideProject(params: {
    userId: string;
    projectId: string;
  }): Promise<boolean> {
    const rows = await this.rows<{ found: boolean }>(
      undefined,
      sql`SELECT EXISTS (SELECT 1 FROM project_users
                         WHERE user_id = ${params.userId} AND project_id <> ${params.projectId}
                           AND deleted_at IS NULL) AS found`,
      this.baseDb
    );
    return rows[0]?.found === true;
  }

  async stripProjectImportMarker(
    params: { userId: string; projectId: string },
    transaction?: Transaction
  ): Promise<boolean> {
    return (
      (await this.count(
        transaction,
        sql`UPDATE users SET metadata = metadata - 'cdmImport', updated_at = now()
            WHERE id = ${params.userId}
              AND metadata -> 'cdmImport' ->> 'projectId' = ${params.projectId}
            RETURNING id`
      )) > 0
    );
  }

  async retireUser(params: { userId: string }, transaction?: Transaction): Promise<void> {
    await this.exec(
      transaction,
      sql`UPDATE organization_users SET deleted_at = now(), updated_at = now()
          WHERE user_id = ${params.userId} AND deleted_at IS NULL`
    );
    await this.exec(
      transaction,
      sql`UPDATE users SET deleted_at = now(), updated_at = now()
          WHERE id = ${params.userId} AND deleted_at IS NULL`
    );
  }

  private executor(transaction?: Transaction, fallback?: DbSchema): Executor {
    return transaction ?? fallback ?? this.db;
  }

  private async rows<T>(
    transaction: Transaction | undefined,
    query: SQL,
    fallback?: DbSchema
  ): Promise<T[]> {
    const result = await (this.executor(transaction, fallback) as DbSchema).execute(query);
    return Array.from(result as unknown as Iterable<T>);
  }

  private async count(transaction: Transaction | undefined, query: SQL): Promise<number> {
    return (await this.rows<unknown>(transaction, query)).length;
  }

  private async exec(transaction: Transaction | undefined, query: SQL): Promise<void> {
    await (this.executor(transaction) as DbSchema).execute(query);
  }
}
