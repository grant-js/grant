import {
  DbSchema,
  groupPermissions,
  groups,
  groupTags,
  permissions,
  permissionTags,
  projectApps,
  projectAppTags,
  projectPermissions,
  projectResources,
  projectRolePermissions,
  projectTags,
  projectUserApiKeys,
  projectUserGroups,
  projectUserPermissions,
  resources,
  resourceTags,
  rolePermissions,
  roles,
  roleTags,
  tags,
  userGroups,
  userPermissions,
  userRoles,
  userTags,
} from '@grantjs/database';
import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

/** Resolved permission row for CDM linking (group_permissions, project_permissions). */
export type ResolvedCdmPermission = {
  id: string;
  resourceId: string | null;
};

/** Read-side helpers for CDM import (resolve refs, find prior import entities). */
export class ProjectImportRepository {
  constructor(private readonly db: DbSchema) {}

  /** Monotonic microsecond offset so repeated stagger batches in one transaction avoid `deleted_at` unique collisions (`NOW()` is transaction-stable). */
  private staggerSoftDeleteBaseMicros = 0;

  /** Call at the start of each CDM replace teardown before pivot soft-deletes run. */
  public resetStaggerSoftDeleteEpoch(): void {
    this.staggerSoftDeleteBaseMicros = 0;
  }

  /**
   * Pivot tables use a UNIQUE index on `deleted_at`; batch updates with one
   * timestamp violate it. Stagger by microsecond per row within a single statement,
   * using one `clock_timestamp()` snapshot as the batch base (per-row calls can
   * collide on the unique index), and advance a monotonic base offset across
   * multiple batches in the same import.
   */
  private async softDeleteRowsByIdWithStaggeredDeletedAt(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared helper for pivot tables with identical id/deletedAt shape
    table: any,
    rowIds: readonly string[],
    transaction?: Transaction
  ): Promise<void> {
    if (rowIds.length === 0) return;
    const db = transaction ?? this.db;
    const baseOffsetMicros = this.staggerSoftDeleteBaseMicros;
    this.staggerSoftDeleteBaseMicros += rowIds.length;

    if (rowIds.length === 1) {
      await db.execute(sql`
        UPDATE ${table} AS t
        SET
          deleted_at = batch.ts + ${baseOffsetMicros} * INTERVAL '1 microsecond',
          updated_at = batch.ts + ${baseOffsetMicros} * INTERVAL '1 microsecond'
        FROM (SELECT clock_timestamp() AS ts) batch
        WHERE t.id = ${rowIds[0]}
          AND t.deleted_at IS NULL
      `);
      return;
    }

    await db.execute(sql`
      UPDATE ${table} AS t
      SET
        deleted_at = batch.ts + (${baseOffsetMicros} + ordered.rn - 1) * INTERVAL '1 microsecond',
        updated_at = batch.ts + (${baseOffsetMicros} + ordered.rn - 1) * INTERVAL '1 microsecond'
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
        FROM ${table}
        WHERE id IN (${sql.join(
          rowIds.map((id) => sql`${id}`),
          sql`, `
        )})
          AND deleted_at IS NULL
      ) ordered
      CROSS JOIN (SELECT clock_timestamp() AS ts) batch
      WHERE t.id = ordered.id
    `);
  }

  private async selectLiveRowIds(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared helper for pivot tables with identical id/deletedAt shape
    table: any,
    where: ReturnType<typeof and>,
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction ?? this.db;
    const rows = await db.select({ id: table.id }).from(table).where(where);
    return rows.map((r) => r.id);
  }

  private async selectLiveProjectAppTagRowIdsForProject(
    tagIds: string[],
    projectId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction ?? this.db;
    const rows = await db
      .select({ id: projectAppTags.id })
      .from(projectAppTags)
      .innerJoin(projectApps, eq(projectAppTags.projectAppId, projectApps.id))
      .where(
        and(
          inArray(projectAppTags.tagId, tagIds),
          isNull(projectAppTags.deletedAt),
          eq(projectApps.projectId, projectId),
          isNull(projectApps.deletedAt)
        )
      );
    return rows.map((r) => r.id);
  }

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

  /**
   * API key ids managed by CDM project-user-api-key handler for this project (pivot has `cdmImport`).
   */
  public async listCdmProjectUserApiKeyIdsForProject(
    projectId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction ?? this.db;
    const rows = await db
      .select({ apiKeyId: projectUserApiKeys.apiKeyId })
      .from(projectUserApiKeys)
      .where(
        and(
          eq(projectUserApiKeys.projectId, projectId),
          isNull(projectUserApiKeys.deletedAt),
          sql`${projectUserApiKeys.metadata}->'cdmImport'->>'projectId' = ${projectId}`,
          sql`${projectUserApiKeys.metadata}->'cdmImport'->>'kind' = 'projectUserApiKey'`
        )
      );
    return rows.map((r) => r.apiKeyId);
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

  /**
   * Tag ids managed by the CDM tag handler for this project. Identified via
   * `tags.metadata.cdmImport.projectId` + `kind = 'tag'` so we only delete CDM
   * tags belonging to this project (never user-created ones).
   */
  public async listCdmTagIdsForProject(
    projectId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction ?? this.db;
    const rows = await db
      .select({ id: tags.id })
      .from(tags)
      .where(
        and(
          isNull(tags.deletedAt),
          sql`${tags.metadata}->'cdmImport'->>'projectId' = ${projectId}`,
          sql`${tags.metadata}->'cdmImport'->>'kind' = 'tag'`
        )
      );
    return rows.map((r) => r.id);
  }

  /**
   * Soft-delete CDM-marked tag rows together with their pivot memberships.
   * The pivots are soft-deleted (rather than relying on FK cascade, which only
   * fires on hard delete) so subsequent reads immediately reflect the teardown.
   *
   * Touches: `project_tags` (this project only), `role_tags`, `group_tags`,
   * `user_tags`, `project_app_tags` (this project's apps only), `permission_tags`,
   * `resource_tags` referencing the given tag ids, and the `tags` rows themselves.
   */
  public async bulkSoftDeleteCdmTags(
    tagIds: string[],
    projectId: string,
    transaction?: Transaction
  ): Promise<void> {
    if (tagIds.length === 0) return;
    const db = transaction ?? this.db;
    const now = new Date();

    const projectTagRowIds = await this.selectLiveRowIds(
      projectTags,
      and(
        eq(projectTags.projectId, projectId),
        inArray(projectTags.tagId, tagIds),
        isNull(projectTags.deletedAt)
      ),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(projectTags, projectTagRowIds, transaction);

    const roleTagRowIds = await this.selectLiveRowIds(
      roleTags,
      and(inArray(roleTags.tagId, tagIds), isNull(roleTags.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(roleTags, roleTagRowIds, transaction);

    const groupTagRowIds = await this.selectLiveRowIds(
      groupTags,
      and(inArray(groupTags.tagId, tagIds), isNull(groupTags.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(groupTags, groupTagRowIds, transaction);

    const userTagRowIds = await this.selectLiveRowIds(
      userTags,
      and(inArray(userTags.tagId, tagIds), isNull(userTags.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(userTags, userTagRowIds, transaction);

    const projectAppTagRowIds = await this.selectLiveProjectAppTagRowIdsForProject(
      tagIds,
      projectId,
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      projectAppTags,
      projectAppTagRowIds,
      transaction
    );

    const permissionTagByTagRowIds = await this.selectLiveRowIds(
      permissionTags,
      and(inArray(permissionTags.tagId, tagIds), isNull(permissionTags.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      permissionTags,
      permissionTagByTagRowIds,
      transaction
    );

    const resourceTagByTagRowIds = await this.selectLiveRowIds(
      resourceTags,
      and(inArray(resourceTags.tagId, tagIds), isNull(resourceTags.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      resourceTags,
      resourceTagByTagRowIds,
      transaction
    );

    await db
      .update(tags)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(inArray(tags.id, tagIds), isNull(tags.deletedAt)));
  }

  /**
   * Resource ids managed by the CDM resource handler for this project.
   * Identified via `resources.metadata.cdmImport.projectId` + `kind = 'resource'`
   * so we only delete CDM resources belonging to this project (never user-created
   * or system catalog ones).
   */
  public async listCdmResourceIdsForProject(
    projectId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction ?? this.db;
    const rows = await db
      .select({ id: resources.id })
      .from(resources)
      .where(
        and(
          isNull(resources.deletedAt),
          sql`${resources.metadata}->'cdmImport'->>'projectId' = ${projectId}`,
          sql`${resources.metadata}->'cdmImport'->>'kind' = 'resource'`
        )
      );
    return rows.map((r) => r.id);
  }

  /**
   * Permission ids managed by the CDM permission handler for this project.
   * Identified via `permissions.metadata.cdmImport.projectId` + `kind = 'permission'`.
   */
  public async listCdmPermissionIdsForProject(
    projectId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction ?? this.db;
    const rows = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(
        and(
          isNull(permissions.deletedAt),
          sql`${permissions.metadata}->'cdmImport'->>'projectId' = ${projectId}`,
          sql`${permissions.metadata}->'cdmImport'->>'kind' = 'permission'`
        )
      );
    return rows.map((r) => r.id);
  }

  /**
   * Soft-delete CDM-marked resource rows together with their pivot memberships.
   *
   * Touches: `project_resources` (this project only), `resource_tags` referencing
   * the given resource ids, and the `resources` rows themselves. Permissions
   * tied to these resources are torn down separately by the permission handler.
   */
  public async bulkSoftDeleteCdmResources(
    resourceIds: string[],
    projectId: string,
    transaction?: Transaction
  ): Promise<void> {
    if (resourceIds.length === 0) return;
    const db = transaction ?? this.db;
    const now = new Date();

    const projectResourceRowIds = await this.selectLiveRowIds(
      projectResources,
      and(
        eq(projectResources.projectId, projectId),
        inArray(projectResources.resourceId, resourceIds),
        isNull(projectResources.deletedAt)
      ),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      projectResources,
      projectResourceRowIds,
      transaction
    );

    const resourceTagRowIds = await this.selectLiveRowIds(
      resourceTags,
      and(inArray(resourceTags.resourceId, resourceIds), isNull(resourceTags.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      resourceTags,
      resourceTagRowIds,
      transaction
    );

    await db
      .update(resources)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(inArray(resources.id, resourceIds), isNull(resources.deletedAt)));
  }

  /**
   * Clears soft-delete on a resource and its project link when a Replace import
   * reconnects catalog `grantResourceId` to a row tombstoned by a prior import.
   * Returns true when the resource row existed and was revived.
   */
  public async reviveCdmResourceAndProjectLinkForProject(
    resourceId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const db = transaction ?? this.db;
    const now = new Date();

    await db
      .update(resources)
      .set({ deletedAt: sql`NULL`, updatedAt: now })
      .where(and(eq(resources.id, resourceId), isNotNull(resources.deletedAt)));

    const [liveResource] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(and(eq(resources.id, resourceId), isNull(resources.deletedAt)))
      .limit(1);

    if (!liveResource) {
      return false;
    }

    const tombTagRows = await db
      .select({
        id: resourceTags.id,
        tagId: resourceTags.tagId,
      })
      .from(resourceTags)
      .where(and(eq(resourceTags.resourceId, resourceId), isNotNull(resourceTags.deletedAt)))
      .orderBy(desc(resourceTags.updatedAt), desc(resourceTags.id));

    const seenTag = new Set<string>();
    const tagPivotIdsToRevive: string[] = [];
    const tagPivotIdsToDrop: string[] = [];
    for (const row of tombTagRows) {
      if (seenTag.has(row.tagId)) {
        tagPivotIdsToDrop.push(row.id);
      } else {
        seenTag.add(row.tagId);
        tagPivotIdsToRevive.push(row.id);
      }
    }

    if (tagPivotIdsToDrop.length > 0) {
      await db.delete(resourceTags).where(inArray(resourceTags.id, tagPivotIdsToDrop));
    }
    if (tagPivotIdsToRevive.length > 0) {
      await db
        .update(resourceTags)
        .set({ deletedAt: sql`NULL`, updatedAt: now })
        .where(inArray(resourceTags.id, tagPivotIdsToRevive));
    }

    const tombPivotRows = await db
      .select({ id: projectResources.id })
      .from(projectResources)
      .where(
        and(
          eq(projectResources.projectId, projectId),
          eq(projectResources.resourceId, resourceId),
          isNotNull(projectResources.deletedAt)
        )
      )
      .orderBy(desc(projectResources.updatedAt), desc(projectResources.id));

    if (tombPivotRows.length === 0) {
      return true;
    }

    const [keepPivot, ...extraPivots] = tombPivotRows;
    const extraIds = extraPivots.map((r) => r.id);
    if (extraIds.length > 0) {
      await db.delete(projectResources).where(inArray(projectResources.id, extraIds));
    }

    await db
      .update(projectResources)
      .set({ deletedAt: sql`NULL`, updatedAt: now })
      .where(eq(projectResources.id, keepPivot.id));

    return true;
  }

  /**
   * Soft-delete CDM-marked permission rows together with their pivot memberships.
   *
   * Touches: `project_permissions` (this project only), `group_permissions`,
   * `permission_tags`, `role_permissions`, `user_permissions`,
   * `project_user_permissions`, `project_role_permissions` referencing the given
   * permission ids, and the `permissions` rows themselves.
   */
  public async bulkSoftDeleteCdmPermissions(
    permissionIds: string[],
    projectId: string,
    transaction?: Transaction
  ): Promise<void> {
    if (permissionIds.length === 0) return;
    const db = transaction ?? this.db;
    const now = new Date();

    const projectPermissionRowIds = await this.selectLiveRowIds(
      projectPermissions,
      and(
        eq(projectPermissions.projectId, projectId),
        inArray(projectPermissions.permissionId, permissionIds),
        isNull(projectPermissions.deletedAt)
      ),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      projectPermissions,
      projectPermissionRowIds,
      transaction
    );

    const groupPermissionRowIds = await this.selectLiveRowIds(
      groupPermissions,
      and(
        inArray(groupPermissions.permissionId, permissionIds),
        isNull(groupPermissions.deletedAt)
      ),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      groupPermissions,
      groupPermissionRowIds,
      transaction
    );

    const permissionTagRowIds = await this.selectLiveRowIds(
      permissionTags,
      and(inArray(permissionTags.permissionId, permissionIds), isNull(permissionTags.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      permissionTags,
      permissionTagRowIds,
      transaction
    );

    const rolePermissionRowIds = await this.selectLiveRowIds(
      rolePermissions,
      and(inArray(rolePermissions.permissionId, permissionIds), isNull(rolePermissions.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      rolePermissions,
      rolePermissionRowIds,
      transaction
    );

    const userPermissionRowIds = await this.selectLiveRowIds(
      userPermissions,
      and(inArray(userPermissions.permissionId, permissionIds), isNull(userPermissions.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      userPermissions,
      userPermissionRowIds,
      transaction
    );

    const projectUserPermissionRowIds = await this.selectLiveRowIds(
      projectUserPermissions,
      and(
        eq(projectUserPermissions.projectId, projectId),
        inArray(projectUserPermissions.permissionId, permissionIds),
        isNull(projectUserPermissions.deletedAt)
      ),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      projectUserPermissions,
      projectUserPermissionRowIds,
      transaction
    );

    const projectRolePermissionRowIds = await this.selectLiveRowIds(
      projectRolePermissions,
      and(
        eq(projectRolePermissions.projectId, projectId),
        inArray(projectRolePermissions.permissionId, permissionIds),
        isNull(projectRolePermissions.deletedAt)
      ),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      projectRolePermissions,
      projectRolePermissionRowIds,
      transaction
    );

    await db
      .update(permissions)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(inArray(permissions.id, permissionIds), isNull(permissions.deletedAt)));
  }

  /**
   * Soft-delete assignment pivots referencing the given role ids before the
   * role rows themselves are tombstoned during CDM replace teardown.
   */
  public async bulkSoftDeletePivotsForRoles(
    roleIds: string[],
    projectId: string,
    transaction?: Transaction
  ): Promise<void> {
    if (roleIds.length === 0) return;

    const rolePermissionRowIds = await this.selectLiveRowIds(
      rolePermissions,
      and(inArray(rolePermissions.roleId, roleIds), isNull(rolePermissions.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      rolePermissions,
      rolePermissionRowIds,
      transaction
    );

    const projectRolePermissionRowIds = await this.selectLiveRowIds(
      projectRolePermissions,
      and(
        eq(projectRolePermissions.projectId, projectId),
        inArray(projectRolePermissions.roleId, roleIds),
        isNull(projectRolePermissions.deletedAt)
      ),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      projectRolePermissions,
      projectRolePermissionRowIds,
      transaction
    );
  }

  /**
   * Soft-delete assignment pivots referencing the given group ids before the
   * group rows themselves are tombstoned during CDM replace teardown.
   */
  public async bulkSoftDeletePivotsForGroups(
    groupIds: string[],
    projectId: string,
    transaction?: Transaction
  ): Promise<void> {
    if (groupIds.length === 0) return;

    const userGroupRowIds = await this.selectLiveRowIds(
      userGroups,
      and(inArray(userGroups.groupId, groupIds), isNull(userGroups.deletedAt)),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(userGroups, userGroupRowIds, transaction);

    const projectUserGroupRowIds = await this.selectLiveRowIds(
      projectUserGroups,
      and(
        eq(projectUserGroups.projectId, projectId),
        inArray(projectUserGroups.groupId, groupIds),
        isNull(projectUserGroups.deletedAt)
      ),
      transaction
    );
    await this.softDeleteRowsByIdWithStaggeredDeletedAt(
      projectUserGroups,
      projectUserGroupRowIds,
      transaction
    );
  }
}
