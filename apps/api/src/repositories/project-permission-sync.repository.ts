import { DbSchema, groups, permissions, resources, roles, userRoles } from '@grantjs/database';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

/** Resolved permission row for CDM linking (group_permissions, project_permissions). */
export type ResolvedCdmPermission = {
  id: string;
  resourceId: string | null;
};

/**
 * Read-side helpers for CDM permission sync (resolve refs, find prior import entities).
 */
export class ProjectPermissionSyncRepository {
  constructor(private readonly db: DbSchema) {}

  public listCdmRoleIdsForProject(projectId: string, transaction?: Transaction): Promise<string[]> {
    const db = transaction ?? this.db;
    return db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          isNull(roles.deletedAt),
          sql`${roles.metadata}->'cdmImport'->>'projectId' = ${projectId}`
        )
      )
      .then((rows) => rows.map((r) => r.id));
  }

  public listCdmGroupIdsForProject(
    projectId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction ?? this.db;
    return db
      .select({ id: groups.id })
      .from(groups)
      .where(
        and(
          isNull(groups.deletedAt),
          sql`${groups.metadata}->'cdmImport'->>'projectId' = ${projectId}`
        )
      )
      .then((rows) => rows.map((r) => r.id));
  }

  /**
   * Resolve a permission by resource slug + action (case-insensitive) and optional condition / id.
   */
  public async resolvePermission(
    params: {
      resourceSlug: string;
      action: string;
      permissionId?: string | null;
      condition?: Record<string, unknown> | null;
    },
    transaction?: Transaction
  ): Promise<ResolvedCdmPermission> {
    const db = transaction ?? this.db;
    const slugNorm = params.resourceSlug.trim();
    const actionNorm = params.action.trim();

    if (params.permissionId) {
      const row = await db
        .select({
          p: permissions,
          slug: resources.slug,
        })
        .from(permissions)
        .innerJoin(resources, eq(permissions.resourceId, resources.id))
        .where(
          and(
            eq(permissions.id, params.permissionId),
            isNull(permissions.deletedAt),
            isNull(resources.deletedAt)
          )
        )
        .limit(1);
      if (row.length === 0) {
        throw new Error('PERMISSION_NOT_FOUND');
      }
      const slugMatch =
        row[0].slug.trim().toLowerCase() === slugNorm.toLowerCase() &&
        row[0].p.action.trim().toLowerCase() === actionNorm.toLowerCase();
      if (!slugMatch) {
        throw new Error('PERMISSION_REF_MISMATCH');
      }
      return { id: row[0].p.id, resourceId: row[0].p.resourceId };
    }

    const candidates = await db
      .select({
        p: permissions,
        slug: resources.slug,
      })
      .from(permissions)
      .innerJoin(resources, eq(permissions.resourceId, resources.id))
      .where(
        and(
          isNull(permissions.deletedAt),
          isNull(resources.deletedAt),
          sql`lower(${resources.slug}) = lower(${slugNorm})`,
          sql`lower(${permissions.action}) = lower(${actionNorm})`
        )
      );

    if (candidates.length === 0) {
      throw new Error('PERMISSION_NOT_FOUND');
    }

    const cond = params.condition;
    const matches = candidates.filter((c) => this.conditionMatches(c.p.condition, cond));
    if (matches.length === 0) {
      throw new Error('PERMISSION_CONDITION_MISMATCH');
    }
    if (matches.length > 1) {
      throw new Error('PERMISSION_AMBIGUOUS');
    }
    return { id: matches[0].p.id, resourceId: matches[0].p.resourceId };
  }

  private conditionMatches(
    stored: unknown,
    requested: Record<string, unknown> | null | undefined
  ): boolean {
    if (requested === undefined || requested === null) {
      return (
        stored == null || (typeof stored === 'object' && Object.keys(stored as object).length === 0)
      );
    }
    return JSON.stringify(stored ?? null) === JSON.stringify(requested);
  }

  public listActiveUserRolesForRoleIds(
    roleIds: string[],
    transaction?: Transaction
  ): Promise<Array<{ userId: string; roleId: string }>> {
    if (roleIds.length === 0) {
      return Promise.resolve([]);
    }
    const db = transaction ?? this.db;
    return db
      .select({ userId: userRoles.userId, roleId: userRoles.roleId })
      .from(userRoles)
      .where(and(inArray(userRoles.roleId, roleIds), isNull(userRoles.deletedAt)));
  }
}
