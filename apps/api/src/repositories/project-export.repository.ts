import {
  apiKeys,
  DbSchema,
  groupPermissions,
  groups,
  groupTags,
  permissions,
  permissionTags,
  projectPermissions,
  projectResources,
  projectRolePermissions,
  projectRoles,
  projects,
  projectTags,
  projectUserApiKeys,
  projectUserGroups,
  projectUserPermissions,
  projectUsers,
  resources,
  resourceTags,
  roleGroups,
  rolePermissions,
  roles,
  roleTags,
  tags,
  userGroups,
  userPermissions,
  userRoles,
  users,
  userTags,
} from '@grantjs/database';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

/**
 * One project role with its merged permission set, ready to be projected as
 * a CDM `RoleTemplateCdmInput`.
 */
export interface ProjectRoleWithPermissions {
  roleId: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown>;
  permissions: ProjectRolePermission[];
}

export interface ProjectRolePermission {
  permissionId: string;
  resourceSlug: string;
  action: string;
  condition: Record<string, unknown> | null;
}

/**
 * One project user with the set of project-scoped role ids they hold. Used
 * to project `UserAssignmentCdmInput` rows during export.
 */
export interface ProjectUserWithRoleIds {
  userId: string;
  roleIds: string[];
  metadata: Record<string, unknown>;
}

/** Join row for CDM export of `project_user_api_keys` + `api_keys` (no secrets). */
export interface ProjectUserApiKeyCdmExportRow {
  userId: string;
  pivotMetadata: Record<string, unknown>;
  clientId: string;
  name: string | null;
  description: string | null;
  expiresAt: Date | null;
}

/** One project tag definition projected for CDM export. */
export interface ProjectTagDefinitionRow {
  tagId: string;
  name: string;
  color: string;
  isPrimary: boolean;
  metadata: Record<string, unknown>;
}

/** Pivot row for tag association exports (`role_tags`, `group_tags`, `user_tags`). */
export interface TagAssociationRow {
  ownerId: string;
  tagId: string;
  isPrimary: boolean;
}

/** `resource_tags` row joined to tag + project membership (CDM export). */
export interface ProjectResourceTagExportRow {
  resourceId: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  isPrimary: boolean;
}

/** `permission_tags` row joined to tag + project membership (CDM export). */
export interface ProjectPermissionTagExportRow {
  permissionId: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  isPrimary: boolean;
}

/** Direct user → permission grant in project scope (CDM export). */
export interface ProjectUserDirectPermission {
  userId: string;
  permissionId: string;
  resourceSlug: string;
  action: string;
  condition: Record<string, unknown> | null;
}

/** Direct user → group grant in project scope (CDM export). */
export interface ProjectUserDirectGroup {
  userId: string;
  groupId: string;
}

/** Grant `groups` row for CDM export (name + id for opaque key). */
export interface GrantGroupExportRow {
  groupId: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown>;
}

/** `group_permissions` pivot for CDM group ↔ permission export. */
export interface GroupPermissionExportRow {
  groupId: string;
  permissionId: string;
}

/** CDM-imported Grant user (`metadata.cdmImport.kind === 'user'`) for export. */
export interface ProjectCdmProvisionedUserRow {
  userId: string;
  name: string;
  metadata: Record<string, unknown>;
}

/** Resource row projected for CDM export (catalog or CDM-owned). */
export interface ProjectCdmResourceRow {
  resourceId: string;
  slug: string;
  name: string;
  description: string | null;
  actions: string[];
  metadata: Record<string, unknown>;
}

/** Permission row projected for CDM export (catalog or CDM-owned). */
export interface ProjectCdmPermissionRow {
  permissionId: string;
  resourceId: string | null;
  resourceSlug: string | null;
  action: string;
  name: string;
  description: string | null;
  condition: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
}

/**
 * Read-only joins for CDM export. Mirrors {@link ProjectImportRepository};
 * kept narrow so the export service stays entity-handler-agnostic.
 */
export class ProjectExportRepository {
  constructor(private readonly db: DbSchema) {}

  /**
   * Project display name for CDM document `id` (maps to sync job `jobName` / `job_name` on import).
   */
  public async getProjectNameForCdmDocument(
    projectId: string,
    transaction?: Transaction
  ): Promise<string | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({ name: projects.name })
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);
    const name = rows[0]?.name?.trim();
    return name && name.length > 0 ? name : null;
  }

  /**
   * Fetch every project role with its effective permissions from the
   * role → group → permission chain and direct role → permission links.
   *
   * Permissions are deduplicated within each role.
   */
  public async getProjectRolesWithPermissions(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectRoleWithPermissions[]> {
    const dbInstance = transaction ?? this.db;

    const roleRows = await dbInstance
      .select({
        roleId: roles.id,
        name: roles.name,
        description: roles.description,
        metadata: roles.metadata,
      })
      .from(projectRoles)
      .innerJoin(roles, eq(roles.id, projectRoles.roleId))
      .where(
        and(
          eq(projectRoles.projectId, projectId),
          isNull(projectRoles.deletedAt),
          isNull(roles.deletedAt)
        )
      );

    if (roleRows.length === 0) return [];

    const roleIds = roleRows.map((r) => r.roleId);

    const [groupPathRows, directRoleRows] = await Promise.all([
      dbInstance
        .select({
          roleId: roleGroups.roleId,
          permissionId: permissions.id,
          action: permissions.action,
          condition: permissions.condition,
          resourceSlug: resources.slug,
        })
        .from(roleGroups)
        .innerJoin(groups, eq(groups.id, roleGroups.groupId))
        .innerJoin(groupPermissions, eq(groupPermissions.groupId, groups.id))
        .innerJoin(permissions, eq(permissions.id, groupPermissions.permissionId))
        .innerJoin(resources, eq(resources.id, permissions.resourceId))
        .where(
          and(
            inArray(roleGroups.roleId, roleIds),
            isNull(roleGroups.deletedAt),
            isNull(groups.deletedAt),
            isNull(groupPermissions.deletedAt),
            isNull(permissions.deletedAt),
            isNull(resources.deletedAt)
          )
        ),
      dbInstance
        .select({
          roleId: rolePermissions.roleId,
          permissionId: permissions.id,
          action: permissions.action,
          condition: permissions.condition,
          resourceSlug: resources.slug,
        })
        .from(rolePermissions)
        .innerJoin(
          projectRolePermissions,
          and(
            eq(projectRolePermissions.roleId, rolePermissions.roleId),
            eq(projectRolePermissions.permissionId, rolePermissions.permissionId),
            eq(projectRolePermissions.projectId, projectId),
            isNull(projectRolePermissions.deletedAt)
          )
        )
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .innerJoin(resources, eq(resources.id, permissions.resourceId))
        .where(
          and(
            inArray(rolePermissions.roleId, roleIds),
            isNull(rolePermissions.deletedAt),
            isNull(permissions.deletedAt),
            isNull(resources.deletedAt)
          )
        ),
    ]);

    const permsByRole = new Map<string, Map<string, ProjectRolePermission>>();
    const mergePermissionRow = (row: {
      roleId: string;
      permissionId: string;
      action: string;
      condition: unknown;
      resourceSlug: string;
    }) => {
      let perRole = permsByRole.get(row.roleId);
      if (!perRole) {
        perRole = new Map<string, ProjectRolePermission>();
        permsByRole.set(row.roleId, perRole);
      }
      if (!perRole.has(row.permissionId)) {
        perRole.set(row.permissionId, {
          permissionId: row.permissionId,
          resourceSlug: row.resourceSlug,
          action: row.action,
          condition: (row.condition as Record<string, unknown> | null) ?? null,
        });
      }
    };
    for (const row of groupPathRows) {
      mergePermissionRow(row);
    }
    for (const row of directRoleRows) {
      mergePermissionRow(row);
    }

    return roleRows.map((r) => {
      const perRole = permsByRole.get(r.roleId);
      const permissionsList = perRole ? Array.from(perRole.values()) : [];
      permissionsList.sort((a, b) => {
        if (a.resourceSlug !== b.resourceSlug) return a.resourceSlug < b.resourceSlug ? -1 : 1;
        if (a.action !== b.action) return a.action < b.action ? -1 : 1;
        return a.permissionId < b.permissionId ? -1 : 1;
      });
      return {
        roleId: r.roleId,
        name: r.name,
        description: r.description,
        metadata: (r.metadata as Record<string, unknown>) ?? {},
        permissions: permissionsList,
      };
    });
  }

  /**
   * Fetch every project user with the project-scoped role ids they hold.
   * Filters `userRoles` by the role ids that belong to the project, so users
   * who are project members but hold no project-scoped role still appear with
   * an empty `roleIds` list (and are therefore skipped by the user-assignment
   * handler's `export`, which only emits assignments with at least one role).
   */
  public async getProjectUsersWithRoleIds(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectUserWithRoleIds[]> {
    const dbInstance = transaction ?? this.db;

    const projectRoleIdRows = await dbInstance
      .select({ roleId: projectRoles.roleId })
      .from(projectRoles)
      .where(and(eq(projectRoles.projectId, projectId), isNull(projectRoles.deletedAt)));
    const projectRoleIds = projectRoleIdRows.map((r) => r.roleId);

    const userRows = await dbInstance
      .select({
        userId: projectUsers.userId,
        metadata: projectUsers.metadata,
      })
      .from(projectUsers)
      .where(and(eq(projectUsers.projectId, projectId), isNull(projectUsers.deletedAt)));

    if (userRows.length === 0) return [];

    if (projectRoleIds.length === 0) {
      return userRows.map((u) => ({
        userId: u.userId,
        roleIds: [],
        metadata: (u.metadata as Record<string, unknown>) ?? {},
      }));
    }

    const userIds = userRows.map((u) => u.userId);
    const userRoleRows = await dbInstance
      .select({ userId: userRoles.userId, roleId: userRoles.roleId })
      .from(userRoles)
      .where(
        and(
          inArray(userRoles.userId, userIds),
          inArray(userRoles.roleId, projectRoleIds),
          isNull(userRoles.deletedAt)
        )
      );

    const rolesByUser = new Map<string, Set<string>>();
    for (const row of userRoleRows) {
      let s = rolesByUser.get(row.userId);
      if (!s) {
        s = new Set<string>();
        rolesByUser.set(row.userId, s);
      }
      s.add(row.roleId);
    }

    return userRows.map((u) => ({
      userId: u.userId,
      roleIds: Array.from(rolesByUser.get(u.userId) ?? []).sort(),
      metadata: (u.metadata as Record<string, unknown>) ?? {},
    }));
  }

  /**
   * Direct user → permission grants scoped to the project via `project_user_permissions`.
   */
  public async getProjectUserDirectPermissions(
    projectId: string,
    userIds?: readonly string[],
    transaction?: Transaction
  ): Promise<ProjectUserDirectPermission[]> {
    const dbInstance = transaction ?? this.db;

    const rows = await dbInstance
      .select({
        userId: userPermissions.userId,
        permissionId: permissions.id,
        action: permissions.action,
        condition: permissions.condition,
        resourceSlug: resources.slug,
      })
      .from(userPermissions)
      .innerJoin(
        projectUserPermissions,
        and(
          eq(projectUserPermissions.userId, userPermissions.userId),
          eq(projectUserPermissions.permissionId, userPermissions.permissionId),
          eq(projectUserPermissions.projectId, projectId),
          isNull(projectUserPermissions.deletedAt)
        )
      )
      .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
      .innerJoin(resources, eq(resources.id, permissions.resourceId))
      .where(
        and(
          userIds != null && userIds.length > 0
            ? inArray(userPermissions.userId, userIds as string[])
            : sql`true`,
          isNull(userPermissions.deletedAt),
          isNull(permissions.deletedAt),
          isNull(resources.deletedAt)
        )
      );

    return rows.map((r) => ({
      userId: r.userId,
      permissionId: r.permissionId,
      resourceSlug: r.resourceSlug,
      action: r.action,
      condition: (r.condition as Record<string, unknown> | null) ?? null,
    }));
  }

  /**
   * Direct user → group grants scoped to the project via `project_user_groups`.
   */
  public async getProjectUserDirectGroups(
    projectId: string,
    userIds?: readonly string[],
    transaction?: Transaction
  ): Promise<ProjectUserDirectGroup[]> {
    const dbInstance = transaction ?? this.db;

    const rows = await dbInstance
      .select({
        userId: userGroups.userId,
        groupId: userGroups.groupId,
      })
      .from(userGroups)
      .innerJoin(
        projectUserGroups,
        and(
          eq(projectUserGroups.userId, userGroups.userId),
          eq(projectUserGroups.groupId, userGroups.groupId),
          eq(projectUserGroups.projectId, projectId),
          isNull(projectUserGroups.deletedAt)
        )
      )
      .where(
        and(
          userIds != null && userIds.length > 0
            ? inArray(userGroups.userId, userIds as string[])
            : sql`true`,
          isNull(userGroups.deletedAt)
        )
      );

    return rows;
  }

  /**
   * All active project-user API keys for the project (for CDM export). Includes
   * keys not created by CDM (no `cdmImport`); the handler decides emission shape.
   */
  public async getProjectUserApiKeysForCdmExport(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectUserApiKeyCdmExportRow[]> {
    const dbInstance = transaction ?? this.db;

    const rows = await dbInstance
      .select({
        userId: projectUserApiKeys.userId,
        pivotMetadata: projectUserApiKeys.metadata,
        clientId: apiKeys.clientId,
        name: apiKeys.name,
        description: apiKeys.description,
        expiresAt: apiKeys.expiresAt,
      })
      .from(projectUserApiKeys)
      .innerJoin(apiKeys, eq(apiKeys.id, projectUserApiKeys.apiKeyId))
      .where(
        and(
          eq(projectUserApiKeys.projectId, projectId),
          isNull(projectUserApiKeys.deletedAt),
          isNull(apiKeys.deletedAt),
          eq(apiKeys.isRevoked, false)
        )
      );

    return rows.map((r) => ({
      userId: r.userId,
      pivotMetadata:
        r.pivotMetadata != null &&
        typeof r.pivotMetadata === 'object' &&
        !Array.isArray(r.pivotMetadata)
          ? (r.pivotMetadata as Record<string, unknown>)
          : {},
      clientId: r.clientId,
      name: r.name,
      description: r.description,
      expiresAt: r.expiresAt,
    }));
  }

  /**
   * All tags visible to the project (via `project_tags` membership) projected
   * to a CDM-friendly shape. `isPrimary` is taken from the pivot.
   */
  public async getProjectTagDefinitions(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectTagDefinitionRow[]> {
    const dbInstance = transaction ?? this.db;

    const rows = await dbInstance
      .select({
        tagId: tags.id,
        name: tags.name,
        color: tags.color,
        isPrimary: projectTags.isPrimary,
        metadata: tags.metadata,
      })
      .from(projectTags)
      .innerJoin(tags, eq(tags.id, projectTags.tagId))
      .where(
        and(
          eq(projectTags.projectId, projectId),
          isNull(projectTags.deletedAt),
          isNull(tags.deletedAt)
        )
      );

    return rows.map((r) => ({
      tagId: r.tagId,
      name: r.name,
      color: r.color,
      isPrimary: r.isPrimary,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));
  }

  /** `role_tags` rows for the given role ids. Empty input returns `[]`. */
  public async getRoleTagsByRoleIds(
    roleIds: readonly string[],
    transaction?: Transaction
  ): Promise<TagAssociationRow[]> {
    if (roleIds.length === 0) return [];
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        ownerId: roleTags.roleId,
        tagId: roleTags.tagId,
        isPrimary: roleTags.isPrimary,
      })
      .from(roleTags)
      .where(and(inArray(roleTags.roleId, roleIds as string[]), isNull(roleTags.deletedAt)));
    return rows;
  }

  /** `group_tags` rows for the given group ids. Empty input returns `[]`. */
  public async getGroupTagsByGroupIds(
    groupIds: readonly string[],
    transaction?: Transaction
  ): Promise<TagAssociationRow[]> {
    if (groupIds.length === 0) return [];
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        ownerId: groupTags.groupId,
        tagId: groupTags.tagId,
        isPrimary: groupTags.isPrimary,
      })
      .from(groupTags)
      .where(and(inArray(groupTags.groupId, groupIds as string[]), isNull(groupTags.deletedAt)));
    return rows;
  }

  /** `user_tags` rows for the given user ids. Empty input returns `[]`. */
  public async getUserTagsByUserIds(
    userIds: readonly string[],
    transaction?: Transaction
  ): Promise<TagAssociationRow[]> {
    if (userIds.length === 0) return [];
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        ownerId: userTags.userId,
        tagId: userTags.tagId,
        isPrimary: userTags.isPrimary,
      })
      .from(userTags)
      .where(and(inArray(userTags.userId, userIds as string[]), isNull(userTags.deletedAt)));
    return rows;
  }

  /** Active groups by id (for CDM export wiring). */
  public async getGroupsByIds(
    groupIds: readonly string[],
    transaction?: Transaction
  ): Promise<GrantGroupExportRow[]> {
    if (groupIds.length === 0) return [];
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        groupId: groups.id,
        name: groups.name,
        description: groups.description,
        metadata: groups.metadata,
      })
      .from(groups)
      .where(and(inArray(groups.id, groupIds as string[]), isNull(groups.deletedAt)));
    return rows.map((r) => ({
      groupId: r.groupId,
      name: r.name,
      description: r.description,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));
  }

  /** `group_permissions` rows for the given group ids (active permissions only). */
  public async getGroupPermissionIdsByGroupIds(
    groupIds: readonly string[],
    transaction?: Transaction
  ): Promise<GroupPermissionExportRow[]> {
    if (groupIds.length === 0) return [];
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        groupId: groupPermissions.groupId,
        permissionId: groupPermissions.permissionId,
      })
      .from(groupPermissions)
      .innerJoin(permissions, eq(permissions.id, groupPermissions.permissionId))
      .where(
        and(
          inArray(groupPermissions.groupId, groupIds as string[]),
          isNull(groupPermissions.deletedAt),
          isNull(permissions.deletedAt)
        )
      );
    return rows.map((r) => ({ groupId: r.groupId, permissionId: r.permissionId }));
  }

  /**
   * Resource tag pivots for resources linked to the project, restricted to tags
   * in `project_tags` so exported keys match the `tags[]` section.
   */
  public async getProjectResourceTagsForExport(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectResourceTagExportRow[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        resourceId: resourceTags.resourceId,
        tagId: resourceTags.tagId,
        tagName: tags.name,
        tagColor: tags.color,
        isPrimary: resourceTags.isPrimary,
      })
      .from(resourceTags)
      .innerJoin(tags, eq(tags.id, resourceTags.tagId))
      .innerJoin(projectTags, eq(projectTags.tagId, tags.id))
      .innerJoin(projectResources, eq(projectResources.resourceId, resourceTags.resourceId))
      .where(
        and(
          eq(projectTags.projectId, projectId),
          eq(projectResources.projectId, projectId),
          isNull(resourceTags.deletedAt),
          isNull(tags.deletedAt),
          isNull(projectTags.deletedAt),
          isNull(projectResources.deletedAt)
        )
      );

    return rows.map((r) => ({
      resourceId: r.resourceId,
      tagId: r.tagId,
      tagName: r.tagName,
      tagColor: r.tagColor,
      isPrimary: r.isPrimary,
    }));
  }

  /**
   * Permission tag pivots for permissions linked to the project, restricted to
   * tags in `project_tags` so exported keys match the `tags[]` section.
   */
  public async getProjectPermissionTagsForExport(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectPermissionTagExportRow[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        permissionId: permissionTags.permissionId,
        tagId: permissionTags.tagId,
        tagName: tags.name,
        tagColor: tags.color,
        isPrimary: permissionTags.isPrimary,
      })
      .from(permissionTags)
      .innerJoin(tags, eq(tags.id, permissionTags.tagId))
      .innerJoin(projectTags, eq(projectTags.tagId, tags.id))
      .innerJoin(
        projectPermissions,
        eq(projectPermissions.permissionId, permissionTags.permissionId)
      )
      .where(
        and(
          eq(projectTags.projectId, projectId),
          eq(projectPermissions.projectId, projectId),
          isNull(permissionTags.deletedAt),
          isNull(tags.deletedAt),
          isNull(projectTags.deletedAt),
          isNull(projectPermissions.deletedAt)
        )
      );

    return rows.map((r) => ({
      permissionId: r.permissionId,
      tagId: r.tagId,
      tagName: r.tagName,
      tagColor: r.tagColor,
      isPrimary: r.isPrimary,
    }));
  }

  /**
   * Grant users created under CDM for this project (`metadata.cdmImport.kind === 'user'`).
   */
  public async getProjectCdmProvisionedUsers(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectCdmProvisionedUserRow[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        userId: users.id,
        name: users.name,
        metadata: users.metadata,
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          sql`${users.metadata}->'cdmImport'->>'projectId' = ${projectId}`,
          sql`${users.metadata}->'cdmImport'->>'kind' = 'user'`
        )
      );

    return rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));
  }

  /**
   * Resolve the auto-created CDM group id for each role id (via `role_groups`).
   * The role-template handler creates exactly one group per role; we return
   * the first active link for each role. Used to project `groupTagKeys`.
   */
  public async getCdmGroupIdsForRoleIds(
    roleIds: readonly string[],
    transaction?: Transaction
  ): Promise<Map<string, string>> {
    if (roleIds.length === 0) return new Map();
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({ roleId: roleGroups.roleId, groupId: roleGroups.groupId })
      .from(roleGroups)
      .where(and(inArray(roleGroups.roleId, roleIds as string[]), isNull(roleGroups.deletedAt)));
    const out = new Map<string, string>();
    for (const r of rows) {
      if (!out.has(r.roleId)) out.set(r.roleId, r.groupId);
    }
    return out;
  }

  /**
   * All resources linked to the project via `project_resources`, including
   * catalog (seed) resources. Used for CDM export when the resources section is
   * selected; CDM-only teardown still uses the sync repository.
   */
  public async getProjectLinkedResourcesForExport(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectCdmResourceRow[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        resourceId: resources.id,
        slug: resources.slug,
        name: resources.name,
        description: resources.description,
        actions: resources.actions,
        metadata: resources.metadata,
      })
      .from(resources)
      .innerJoin(projectResources, eq(projectResources.resourceId, resources.id))
      .where(
        and(
          eq(projectResources.projectId, projectId),
          isNull(projectResources.deletedAt),
          isNull(resources.deletedAt)
        )
      );

    return rows.map((r) => ({
      resourceId: r.resourceId,
      slug: r.slug,
      name: r.name,
      description: r.description,
      actions: r.actions,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));
  }

  /**
   * All permissions linked to the project via `project_permissions`, including
   * catalog permissions. Joins `resources` for the resource slug used in export
   * cross-references.
   */
  public async getProjectLinkedPermissionsForExport(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectCdmPermissionRow[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        permissionId: permissions.id,
        resourceId: permissions.resourceId,
        resourceSlug: resources.slug,
        action: permissions.action,
        name: permissions.name,
        description: permissions.description,
        condition: permissions.condition,
        metadata: permissions.metadata,
      })
      .from(permissions)
      .innerJoin(projectPermissions, eq(projectPermissions.permissionId, permissions.id))
      .leftJoin(resources, eq(resources.id, permissions.resourceId))
      .where(
        and(
          eq(projectPermissions.projectId, projectId),
          isNull(projectPermissions.deletedAt),
          isNull(permissions.deletedAt)
        )
      );

    return rows.map((r) => ({
      permissionId: r.permissionId,
      resourceId: r.resourceId,
      resourceSlug: r.resourceSlug,
      action: r.action,
      name: r.name,
      description: r.description,
      condition: (r.condition as Record<string, unknown> | null) ?? null,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));
  }
}
