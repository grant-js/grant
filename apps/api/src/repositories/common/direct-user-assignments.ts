import type { DbSchema } from '@grantjs/database';
import type { Scope } from '@grantjs/schema';
import { and, count, eq, inArray, isNull, type SQL, sql } from 'drizzle-orm';

import { tryProjectIdFromScope } from '@/lib/scope.lib';
import type { Transaction } from '@/lib/transaction-manager.lib';

import { accessibleIdSource } from './scoped-id-source';

/** A user's assignment to a group, permission or role (`user_groups`, `user_permissions`, `user_roles`). */
interface UserAssignmentPivot {
  table: any;
  userId: any;
  ownerId: any;
  deletedAt: any;
}

/** The same assignment made in a project (`project_user_groups`, `project_user_permissions`). */
interface ProjectUserAssignmentPivot extends UserAssignmentPivot {
  projectId: any;
}

interface DirectAssignmentPivots {
  global: UserAssignmentPivot;
  /** Absent when the assignment has no project-scoped table (roles: `user_roles` only). */
  project?: ProjectUserAssignmentPivot;
}

type Db = DbSchema | Transaction;

/**
 * Where the users a group, permission or role is directly assigned to come from in a scope.
 *
 * - **Project:** the project's own assignment rows joined to the live global row: the pair
 *   the authorization engine reads for a project (`GrantRepository.getDirect*IdsForUser`).
 *   Without a project pivot (roles), the global rows of the project's users.
 * - **Organization:** the global rows of the organization's users, the users its list shows.
 * - **Account:** none; an account scope has no users of its own.
 *
 * Users who get the group or permission through a role or a group are not counted.
 */
function directAssignmentSource(
  pivots: DirectAssignmentPivots,
  scope: Scope,
  ownerCondition: (ownerColumn: any) => SQL
):
  | { kind: 'project'; ownerId: any; userId: any; where: SQL }
  | { kind: 'scope'; ownerId: any; userId: any; where: SQL }
  | null {
  const { global, project } = pivots;
  const projectId = tryProjectIdFromScope(scope);

  if (projectId && project) {
    return {
      kind: 'project',
      ownerId: project.ownerId,
      userId: project.userId,
      where: and(
        eq(project.projectId, projectId),
        ownerCondition(project.ownerId),
        isNull(project.deletedAt)
      ) as SQL,
    };
  }

  const users = accessibleIdSource('users', scope);
  if (users.kind !== 'sql') {
    return null;
  }
  return {
    kind: 'scope',
    ownerId: global.ownerId,
    userId: global.userId,
    where: and(
      ownerCondition(global.ownerId),
      isNull(global.deletedAt),
      sql`${global.userId} IN ${users.sql}`
    ) as SQL,
  };
}

function fromSource(
  db: Db,
  pivots: DirectAssignmentPivots,
  kind: 'project' | 'scope',
  select: any
): any {
  const { global, project } = pivots;
  if (kind === 'scope' || !project) {
    return db.select(select).from(global.table);
  }
  return db
    .select(select)
    .from(project.table)
    .innerJoin(
      global.table,
      and(
        eq(global.userId, project.userId),
        eq(global.ownerId, project.ownerId),
        isNull(global.deletedAt)
      )
    );
}

/** Users directly assigned each owner (group, permission or role) in the scope, one grouped query. */
export async function countDirectUsersByOwnerIds(
  db: Db,
  pivots: DirectAssignmentPivots,
  ownerIds: string[],
  scope: Scope
): Promise<Map<string, number>> {
  if (ownerIds.length === 0) {
    return new Map();
  }
  const source = directAssignmentSource(pivots, scope, (column) => inArray(column, ownerIds));
  if (!source) {
    return new Map();
  }

  const rows: Array<{ ownerId: string; count: number }> = await fromSource(
    db,
    pivots,
    source.kind,
    {
      ownerId: source.ownerId,
      count: count(),
    }
  )
    .where(source.where)
    .groupBy(source.ownerId);

  return new Map(rows.map((row) => [String(row.ownerId), Number(row.count)]));
}

/** Ids of the users directly assigned one owner (group, permission or role) in the scope. */
export async function getDirectUserIdsByOwnerId(
  db: Db,
  pivots: DirectAssignmentPivots,
  ownerId: string,
  scope: Scope
): Promise<string[]> {
  const source = directAssignmentSource(pivots, scope, (column) => eq(column, ownerId));
  if (!source) {
    return [];
  }

  const rows: Array<{ userId: string }> = await fromSource(db, pivots, source.kind, {
    userId: source.userId,
  }).where(source.where);

  return [...new Set(rows.map((row) => String(row.userId)))];
}
