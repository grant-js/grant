import {
  accountProjectApiKeys,
  type DbSchema,
  organizationProjectApiKeys,
  projectGroups,
  projectPermissions,
  projectResources,
  projectRoles,
  projectTags,
  projectUserApiKeys,
  projectUsers,
} from '@grantjs/database';
import { and, eq, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

/** Entity kinds that reach a project through a pivot table. */
export const PROJECT_LINKED_KINDS = [
  'role',
  'group',
  'permission',
  'resource',
  'apiKey',
  'tag',
] as const;
export type ProjectLinkedKind = (typeof PROJECT_LINKED_KINDS)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isProjectLinkedKind(kind: string): kind is ProjectLinkedKind {
  return (PROJECT_LINKED_KINDS as readonly string[]).includes(kind);
}

/**
 * Reads which projects an entity is linked to, through the project pivots
 * (`project_roles`, `project_groups`, `project_permissions`, `project_resources`,
 * `project_tags` and the three API-key pivots). Entity tables carry no scope column, so these
 * pivots are the only record of project membership.
 *
 * One entity can be linked to several projects: every pivot's unique index is on
 * the (project, entity) pair. A link that was soft-deleted does not count.
 *
 * Reads run under the caller's transaction and so under its row-level security:
 * inside a project-scoped request only that project's pivot rows are visible.
 */
export class ProjectLinksRepository {
  constructor(private readonly db: DbSchema) {}

  public async getLinkedProjectIds(
    kind: ProjectLinkedKind,
    entityId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    // A malformed id makes Postgres reject the query, and inside the request's
    // transaction that aborts the business write the event belongs to.
    if (!UUID_RE.test(entityId)) return [];

    const db = transaction ?? this.db;

    switch (kind) {
      case 'role':
        return this.projectIdsOf(
          await db
            .select({ projectId: projectRoles.projectId })
            .from(projectRoles)
            .where(and(eq(projectRoles.roleId, entityId), isNull(projectRoles.deletedAt)))
        );
      case 'group':
        return this.projectIdsOf(
          await db
            .select({ projectId: projectGroups.projectId })
            .from(projectGroups)
            .where(and(eq(projectGroups.groupId, entityId), isNull(projectGroups.deletedAt)))
        );
      case 'permission':
        return this.projectIdsOf(
          await db
            .select({ projectId: projectPermissions.projectId })
            .from(projectPermissions)
            .where(
              and(
                eq(projectPermissions.permissionId, entityId),
                isNull(projectPermissions.deletedAt)
              )
            )
        );
      case 'resource':
        return this.projectIdsOf(
          await db
            .select({ projectId: projectResources.projectId })
            .from(projectResources)
            .where(
              and(eq(projectResources.resourceId, entityId), isNull(projectResources.deletedAt))
            )
        );
      case 'tag':
        return this.projectIdsOf(
          await db
            .select({ projectId: projectTags.projectId })
            .from(projectTags)
            .where(and(eq(projectTags.tagId, entityId), isNull(projectTags.deletedAt)))
        );
      case 'apiKey': {
        const [userKeys, accountKeys, organizationKeys] = await Promise.all([
          db
            .select({ projectId: projectUserApiKeys.projectId })
            .from(projectUserApiKeys)
            .where(
              and(eq(projectUserApiKeys.apiKeyId, entityId), isNull(projectUserApiKeys.deletedAt))
            ),
          db
            .select({ projectId: accountProjectApiKeys.projectId })
            .from(accountProjectApiKeys)
            .where(
              and(
                eq(accountProjectApiKeys.apiKeyId, entityId),
                isNull(accountProjectApiKeys.deletedAt)
              )
            ),
          db
            .select({ projectId: organizationProjectApiKeys.projectId })
            .from(organizationProjectApiKeys)
            .where(
              and(
                eq(organizationProjectApiKeys.apiKeyId, entityId),
                isNull(organizationProjectApiKeys.deletedAt)
              )
            ),
        ]);
        return this.projectIdsOf([...userKeys, ...accountKeys, ...organizationKeys]);
      }
    }
  }

  /**
   * The projects a user is a member of (`project_users`). Not a `ProjectLinkedKind`:
   * the publisher never derives it from an aggregate, because events about a user's
   * own security (`user.mfa_*`, `user.password_changed`) must not fan out to every
   * project the user is in (ADR 0012, item 8). The user lifecycle events
   * (`user.created`, `user.updated`, `user.deleted`) ask for it explicitly.
   */
  public async getUserProjectIds(userId: string, transaction?: Transaction): Promise<string[]> {
    if (!UUID_RE.test(userId)) return [];

    const db = transaction ?? this.db;
    return this.projectIdsOf(
      await db
        .select({ projectId: projectUsers.projectId })
        .from(projectUsers)
        .where(and(eq(projectUsers.userId, userId), isNull(projectUsers.deletedAt)))
    );
  }

  private projectIdsOf(rows: Array<{ projectId: string }>): string[] {
    return [...new Set(rows.map((row) => row.projectId))];
  }
}
