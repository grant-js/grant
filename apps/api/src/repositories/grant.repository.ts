import { ExecutionContextGroup, ExecutionContextRole, ExecutionContextUser } from '@grantjs/core';
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
  organizationRoles,
  organizations,
  organizationUsers,
  permissions,
  projectRoles,
  resources,
  roleGroups,
  roles,
  userRoles,
  users,
} from '@grantjs/database';
import { Permission, Scope, Tenant } from '@grantjs/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';

export class GrantRepository {
  constructor(private db: DbSchema) {}

  public async getUser(
    userId: string,
    scope?: Scope,
    transaction?: Transaction
  ): Promise<ExecutionContextUser> {
    // Project API key tokens use sub = apiKeyId (sentinel); return synthetic user for authorization
    if (
      scope &&
      (scope.tenant === Tenant.AccountProject || scope.tenant === Tenant.OrganizationProject)
    ) {
      return {
        id: userId,
        metadata: {},
      };
    }

    const db = transaction || this.db;
    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
      columns: {
        id: true,
        metadata: true,
      },
    });

    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    return {
      id: user.id,
      metadata: user.metadata as Record<string, unknown>,
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
          eq(permissions.action, action),
          eq(resources.slug, resourceSlug),
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
    transaction?: Transaction
  ): Promise<ExecutionContextRole[]> {
    const db = transaction || this.db;
    const roleIds = await this.getUserRoleIdsInScope(userId, scope, transaction);

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
    transaction?: Transaction
  ): Promise<ExecutionContextGroup[]> {
    const db = transaction || this.db;
    const roleIds = await this.getUserRoleIdsInScope(userId, scope, transaction);

    if (roleIds.length === 0) {
      return [];
    }

    const groupIds = await this.getGroupIdsForRoles(roleIds, transaction);

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
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction || this.db;

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
        // Get user's roles for this organization, but only if the user is a member
        const orgRoles = await db
          .select({ roleId: roles.id })
          .from(userRoles)
          .innerJoin(roles, and(eq(userRoles.roleId, roles.id), isNull(userRoles.deletedAt)))
          .innerJoin(
            organizationRoles,
            and(
              eq(organizationRoles.roleId, roles.id),
              eq(organizationRoles.organizationId, scope.id),
              isNull(organizationRoles.deletedAt)
            )
          )
          .innerJoin(
            organizationUsers,
            and(
              eq(organizationUsers.organizationId, scope.id),
              eq(organizationUsers.userId, userId), // Only return roles if user is a member
              isNull(organizationUsers.deletedAt)
            )
          )
          .where(
            and(eq(userRoles.userId, userId), isNull(userRoles.deletedAt), isNull(roles.deletedAt))
          );

        return orgRoles.map((r: { roleId: string }) => r.roleId);
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
            console.error(
              '[GrantRepository.getUserRoleIdsInScope] AccountProject API key lookup failed:',
              err instanceof Error ? err.message : err
            );
          }
        }
        // User path: session user or fallback when no project key — resolve user's roles in this account/project
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
            console.error(
              '[GrantRepository.getUserRoleIdsInScope] OrganizationProject API key lookup failed:',
              err instanceof Error ? err.message : err
            );
          }
        }
        // User path: session user or fallback when no project key — resolve user's roles in this org/project
        const projectRolesResult = await db
          .select({ roleId: roles.id })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .innerJoin(
            organizationRoles,
            and(
              eq(organizationRoles.roleId, roles.id),
              eq(organizationRoles.organizationId, organizationId),
              isNull(organizationRoles.deletedAt)
            )
          )
          .innerJoin(
            organizations,
            and(eq(organizations.id, organizationId), isNull(organizations.deletedAt))
          )
          .innerJoin(
            organizationUsers,
            and(
              eq(organizationUsers.organizationId, organizationId),
              eq(organizationUsers.userId, userId),
              isNull(organizationUsers.deletedAt)
            )
          )
          .innerJoin(
            organizationProjects,
            and(
              eq(organizationProjects.organizationId, organizationId),
              eq(organizationProjects.projectId, projectId),
              isNull(organizationProjects.deletedAt)
            )
          )
          .where(
            and(
              eq(userRoles.userId, userId),
              isNull(userRoles.deletedAt),
              isNull(roles.deletedAt),
              isNull(organizationProjects.deletedAt)
            )
          );
        return projectRolesResult.map((r: { roleId: string }) => r.roleId);
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
}
