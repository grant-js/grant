import {
  ExecutionContextGroup,
  ExecutionContextRole,
  ExecutionContextUser,
  type IGrantRepository,
} from '@grantjs/core';
import {
  accountProjectApiKeys,
  accountProjects,
  accountRoles,
  accounts,
  DbSchema,
  groupPermissions,
  groups,
  organizationProjectApiKeys,
  organizationProjects,
  organizationUsers,
  permissions,
  projectRolePermissions,
  projectRoles,
  projectUserGroups,
  projectUserPermissions,
  projectUsers,
  resources,
  roleGroups,
  rolePermissions,
  roles,
  userGroups,
  userPermissions,
  userRoles,
  users,
} from '@grantjs/database';
import { Permission, Scope, Tenant, TokenType } from '@grantjs/schema';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import {
  mergeEffectiveUserMetadataForProject,
  toMetadataRecord,
} from '@/lib/effective-project-user-metadata.lib';
import { NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { tryProjectIdFromScope } from '@/lib/scope.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

export class GrantRepository implements IGrantRepository {
  private readonly logger = createLogger('GrantRepository');

  constructor(private db: DbSchema) {}

  public async getUser(
    userId: string,
    scope?: Scope,
    transaction?: Transaction
  ): Promise<ExecutionContextUser> {
    const db = transaction || this.db;
    const projectId = scope ? tryProjectIdFromScope(scope) : null;

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
      columns: {
        id: true,
        metadata: true,
      },
    });

    if (!user) {
      if (projectId != null) {
        return {
          id: userId,
          metadata: {},
        };
      }
      throw new NotFoundError(`User not found: ${userId}`);
    }

    const globalMd = toMetadataRecord(user.metadata);

    if (projectId != null) {
      const pivot = await db.query.projectUsers.findFirst({
        where: and(
          eq(projectUsers.projectId, projectId),
          eq(projectUsers.userId, userId),
          isNull(projectUsers.deletedAt)
        ),
        columns: {
          metadata: true,
        },
      });
      const pivotMd = toMetadataRecord(pivot?.metadata);
      return {
        id: user.id,
        metadata: mergeEffectiveUserMetadataForProject(globalMd, pivotMd),
      };
    }

    return {
      id: user.id,
      metadata: globalMd,
    };
  }

  public async getPermissionsByIds(
    permissionIds: string[],
    action: string,
    resourceSlug: string,
    transaction?: Transaction
  ): Promise<Permission[]> {
    if (permissionIds.length === 0) {
      return [];
    }

    const db = transaction || this.db;
    const actionNorm = action.trim().toLowerCase();
    const slugNorm = resourceSlug.trim().toLowerCase();

    const permissionsWithResources = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        description: permissions.description,
        action: permissions.action,
        resourceId: permissions.resourceId,
        condition: permissions.condition,
        createdAt: permissions.createdAt,
        updatedAt: permissions.updatedAt,
        deletedAt: permissions.deletedAt,
        resource: {
          id: resources.id,
          name: resources.name,
          slug: resources.slug,
          description: resources.description,
          actions: resources.actions,
          isActive: resources.isActive,
          createdAt: resources.createdAt,
          updatedAt: resources.updatedAt,
          deletedAt: resources.deletedAt,
        },
      })
      .from(permissions)
      .leftJoin(
        resources,
        and(eq(permissions.resourceId, resources.id), isNull(resources.deletedAt))
      )
      .where(
        and(
          inArray(permissions.id, permissionIds),
          sql`lower(${permissions.action}) = ${actionNorm}`,
          sql`lower(${resources.slug}) = ${slugNorm}`,
          isNull(permissions.deletedAt)
        )
      );

    return permissionsWithResources.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      action: p.action,
      resourceId: p.resourceId,
      condition: p.condition,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      deletedAt: p.deletedAt,
      resource: p.resource?.id ? p.resource : null,
    })) as Permission[];
  }

  public async getUserRoles(
    userId: string,
    scope: Scope,
    transaction?: Transaction,
    options?: { tokenType?: TokenType }
  ): Promise<ExecutionContextRole[]> {
    const db = transaction || this.db;
    const roleIds = await this.getUserRoleIdsInScope(userId, scope, transaction, options);

    if (roleIds.length === 0) {
      return [];
    }

    const rolesResult = await db.query.roles.findMany({
      where: and(inArray(roles.id, roleIds), isNull(roles.deletedAt)),
    });

    return rolesResult.map((role) => ({
      id: role.id,
      name: role.name,
      metadata: role.metadata,
    })) as ExecutionContextRole[];
  }

  public async getUserGroups(
    userId: string,
    scope: Scope,
    transaction?: Transaction,
    options?: { tokenType?: TokenType }
  ): Promise<ExecutionContextGroup[]> {
    const db = transaction || this.db;
    const roleIds = await this.getUserRoleIdsInScope(userId, scope, transaction, options);
    const projectId = tryProjectIdFromScope(scope);

    const roleGroupIds =
      roleIds.length > 0 ? await this.getGroupIdsForRoles(roleIds, transaction) : [];
    const directUserGroupIds = await this.getDirectGroupIdsForUser(userId, projectId, transaction);
    const groupIds = [...new Set([...roleGroupIds, ...directUserGroupIds])];

    if (groupIds.length === 0) {
      return [];
    }

    const groupsResult = await db.query.groups.findMany({
      where: and(inArray(groups.id, groupIds), isNull(groups.deletedAt)),
    });

    return groupsResult.map((group: typeof groups.$inferSelect) => ({
      id: group.id,
      name: group.name,
      metadata: group.metadata,
    })) as ExecutionContextGroup[];
  }

  public async getUserRoleIdsInScope(
    userId: string,
    scope: Scope,
    transaction?: Transaction,
    options?: { tokenType?: TokenType }
  ): Promise<string[]> {
    const db = transaction || this.db;
    const useProjectRolesOnly =
      options?.tokenType === TokenType.ProjectApp || options?.tokenType === TokenType.ApiKey;

    switch (scope.tenant) {
      case Tenant.Account: {
        // Get user's roles for this account, but only if the user owns the account
        const accountRolesResult = await db
          .select({ roleId: roles.id })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .innerJoin(
            accountRoles,
            and(
              eq(accountRoles.roleId, roles.id),
              eq(accountRoles.accountId, scope.id),
              isNull(accountRoles.deletedAt)
            )
          )
          .innerJoin(
            accounts,
            and(
              eq(accounts.id, scope.id),
              eq(accounts.ownerId, userId), // Only return roles if user owns the account
              isNull(accounts.deletedAt)
            )
          )
          .where(
            and(eq(userRoles.userId, userId), isNull(userRoles.deletedAt), isNull(roles.deletedAt))
          );

        return accountRolesResult.map((r: { roleId: string }) => r.roleId);
      }

      case Tenant.Organization: {
        // Get user's role for this organization from organization_users.role_id (single source of truth)
        const orgMembership = await db
          .select({ roleId: organizationUsers.roleId })
          .from(organizationUsers)
          .where(
            and(
              eq(organizationUsers.organizationId, scope.id),
              eq(organizationUsers.userId, userId),
              isNull(organizationUsers.deletedAt)
            )
          )
          .limit(1);
        return orgMembership.length > 0 ? [orgMembership[0].roleId] : [];
      }

      case Tenant.AccountProjectUser:
      case Tenant.AccountProject: {
        const [accountId, projectId] = scope.id.split(':');
        if (!accountId || !projectId) {
          return [];
        }
        // Project API key path: userId is apiKeyId; return assigned role if found
        if (scope.tenant === Tenant.AccountProject) {
          try {
            const projectKeyRow = await db.query.accountProjectApiKeys.findFirst({
              where: and(
                eq(accountProjectApiKeys.apiKeyId, userId),
                eq(accountProjectApiKeys.accountId, accountId),
                eq(accountProjectApiKeys.projectId, projectId),
                isNull(accountProjectApiKeys.deletedAt)
              ),
              columns: { accountRoleId: true },
            });
            if (projectKeyRow) {
              return [projectKeyRow.accountRoleId];
            }
          } catch (err) {
            this.logger.error(
              { err, scope: 'AccountProject' },
              'API key lookup failed in getUserRoleIdsInScope'
            );
          }
        }
        // User path: Session uses account-level roles for project (dashboard); ProjectApp/ApiKey use project_roles only.
        if (useProjectRolesOnly) {
          const accountProjectRolesResult = await db
            .select({ roleId: roles.id })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .innerJoin(
              projectRoles,
              and(
                eq(projectRoles.roleId, roles.id),
                eq(projectRoles.projectId, projectId),
                isNull(projectRoles.deletedAt)
              )
            )
            .where(
              and(
                eq(userRoles.userId, userId),
                isNull(userRoles.deletedAt),
                isNull(roles.deletedAt)
              )
            );
          return accountProjectRolesResult.map((r: { roleId: string }) => r.roleId);
        }
        const accountRolesResult = await db
          .select({ roleId: roles.id })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .innerJoin(
            accountRoles,
            and(
              eq(accountRoles.roleId, roles.id),
              eq(accountRoles.accountId, accountId),
              isNull(accountRoles.deletedAt)
            )
          )
          .innerJoin(
            accounts,
            and(
              eq(accounts.id, accountId),
              eq(accounts.ownerId, userId),
              isNull(accounts.deletedAt)
            )
          )
          .innerJoin(
            accountProjects,
            and(
              eq(accountProjects.accountId, accountId),
              eq(accountProjects.projectId, projectId),
              isNull(accountProjects.deletedAt)
            )
          )
          .where(
            and(
              eq(userRoles.userId, userId),
              isNull(userRoles.deletedAt),
              isNull(roles.deletedAt),
              isNull(accountProjects.deletedAt)
            )
          );
        return accountRolesResult.map((r: { roleId: string }) => r.roleId);
      }

      case Tenant.OrganizationProjectUser:
      case Tenant.OrganizationProject: {
        const [organizationId, projectId] = scope.id.split(':');
        if (!organizationId || !projectId) {
          return [];
        }
        // Project API key path: userId is apiKeyId; return assigned role if found
        if (scope.tenant === Tenant.OrganizationProject) {
          try {
            const projectKeyRow = await db.query.organizationProjectApiKeys.findFirst({
              where: and(
                eq(organizationProjectApiKeys.apiKeyId, userId),
                eq(organizationProjectApiKeys.organizationId, organizationId),
                eq(organizationProjectApiKeys.projectId, projectId),
                isNull(organizationProjectApiKeys.deletedAt)
              ),
              columns: { organizationRoleId: true },
            });
            if (projectKeyRow) {
              return [projectKeyRow.organizationRoleId];
            }
          } catch (err) {
            this.logger.error(
              { err, scope: 'OrganizationProject' },
              'API key lookup failed in getUserRoleIdsInScope'
            );
          }
        }
        // User path: Session uses org-level roles for project (dashboard); ProjectApp/ApiKey use project_roles only.
        if (useProjectRolesOnly) {
          const projectRolesResult = await db
            .select({ roleId: roles.id })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .innerJoin(
              projectRoles,
              and(
                eq(projectRoles.roleId, roles.id),
                eq(projectRoles.projectId, projectId),
                isNull(projectRoles.deletedAt)
              )
            )
            .where(
              and(
                eq(userRoles.userId, userId),
                isNull(userRoles.deletedAt),
                isNull(roles.deletedAt)
              )
            );
          return projectRolesResult.map((r: { roleId: string }) => r.roleId);
        }
        // Org role from organization_users.role_id (single source of truth); must be member of org and project
        const orgMembership = await db
          .select({ roleId: organizationUsers.roleId })
          .from(organizationUsers)
          .innerJoin(
            organizationProjects,
            and(
              eq(organizationProjects.organizationId, organizationUsers.organizationId),
              eq(organizationProjects.projectId, projectId),
              isNull(organizationProjects.deletedAt)
            )
          )
          .where(
            and(
              eq(organizationUsers.organizationId, organizationId),
              eq(organizationUsers.userId, userId),
              isNull(organizationUsers.deletedAt)
            )
          )
          .limit(1);
        return orgMembership.length > 0 ? [orgMembership[0].roleId] : [];
      }

      case Tenant.ProjectUser: {
        const [projectId, scopeUserId] = scope.id.split(':');
        if (!projectId || !scopeUserId || scopeUserId !== userId) {
          return [];
        }

        const projectUserRolesResult = await db
          .select({ roleId: userRoles.roleId })
          .from(userRoles)
          .innerJoin(
            roles,
            and(
              eq(userRoles.roleId, roles.id),
              isNull(userRoles.deletedAt),
              isNull(roles.deletedAt)
            )
          )
          .innerJoin(
            projectRoles,
            and(
              eq(projectRoles.roleId, roles.id),
              eq(projectRoles.projectId, projectId),
              isNull(projectRoles.deletedAt)
            )
          )
          .where(
            and(
              eq(userRoles.userId, userId),
              isNull(userRoles.deletedAt),
              isNull(roles.deletedAt),
              isNull(projectRoles.deletedAt)
            )
          );

        return projectUserRolesResult.map((r: { roleId: string }) => r.roleId);
      }

      default:
        return [];
    }
  }

  public async getGroupIdsForRoles(
    roleIds: string[],
    transaction?: Transaction
  ): Promise<string[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const db = transaction || this.db;
    const roleGroupsData = await db
      .select({ groupId: roleGroups.groupId })
      .from(roleGroups)
      .where(and(inArray(roleGroups.roleId, roleIds), isNull(roleGroups.deletedAt)));

    return [...new Set(roleGroupsData.map((rg: { groupId: string }) => rg.groupId))];
  }

  public async getPermissionIdsForGroups(
    groupIds: string[],
    transaction?: Transaction
  ): Promise<string[]> {
    if (groupIds.length === 0) {
      return [];
    }

    const db = transaction || this.db;
    const groupPermissionsData = await db
      .select({ permissionId: groupPermissions.permissionId })
      .from(groupPermissions)
      .where(and(inArray(groupPermissions.groupId, groupIds), isNull(groupPermissions.deletedAt)));

    return [
      ...new Set(groupPermissionsData.map((gp: { permissionId: string }) => gp.permissionId)),
    ];
  }

  public async getDirectPermissionIdsForRoles(
    roleIds: string[],
    projectId?: string | null,
    transaction?: Transaction
  ): Promise<string[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const db = transaction || this.db;

    if (projectId) {
      const rows = await db
        .select({ permissionId: rolePermissions.permissionId })
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
        .where(and(inArray(rolePermissions.roleId, roleIds), isNull(rolePermissions.deletedAt)));

      return [...new Set(rows.map((r: { permissionId: string }) => r.permissionId))];
    }

    const rows = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(and(inArray(rolePermissions.roleId, roleIds), isNull(rolePermissions.deletedAt)));

    return [...new Set(rows.map((r: { permissionId: string }) => r.permissionId))];
  }

  public async getDirectPermissionIdsForUser(
    userId: string,
    projectId?: string | null,
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction || this.db;

    if (projectId) {
      const rows = await db
        .select({ permissionId: userPermissions.permissionId })
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
        .where(and(eq(userPermissions.userId, userId), isNull(userPermissions.deletedAt)));

      return [...new Set(rows.map((r: { permissionId: string }) => r.permissionId))];
    }

    const rows = await db
      .select({ permissionId: userPermissions.permissionId })
      .from(userPermissions)
      .where(and(eq(userPermissions.userId, userId), isNull(userPermissions.deletedAt)));

    return [...new Set(rows.map((r: { permissionId: string }) => r.permissionId))];
  }

  public async getDirectGroupIdsForUser(
    userId: string,
    projectId?: string | null,
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction || this.db;

    if (projectId) {
      const rows = await db
        .select({ groupId: userGroups.groupId })
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
        .where(and(eq(userGroups.userId, userId), isNull(userGroups.deletedAt)));

      return [...new Set(rows.map((r: { groupId: string }) => r.groupId))];
    }

    const rows = await db
      .select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(and(eq(userGroups.userId, userId), isNull(userGroups.deletedAt)));

    return [...new Set(rows.map((r: { groupId: string }) => r.groupId))];
  }
}
