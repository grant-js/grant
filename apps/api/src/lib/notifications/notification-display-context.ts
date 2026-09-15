import { isRoleI18nKey } from '@grantjs/constants';
import type {
  IAccountRepository,
  IGroupRepository,
  IOrganizationRepository,
  IPermissionRepository,
  IProjectRepository,
  IRoleRepository,
  IUserRepository,
} from '@grantjs/core';
import { type DomainEvent, type Scope, Tenant } from '@grantjs/schema';

import { translateStatic } from '@/i18n';
import type { Transaction } from '@/lib/transaction-manager.lib';

/** Resolved display labels used when composing notification title/body. */
export interface NotificationDisplayContext {
  actorName: string | null;
  scopeName: string | null;
  /** Role name for assign/revoke (from payload or lookup). */
  roleName: string | null;
  /** Generic entity name from `data.after.name` / `data.before.name`. */
  entityName: string | null;
  permissionName: string | null;
  groupName: string | null;
  subjectName: string | null;
}

/**
 * Resolves human-readable labels for notification rendering from the event
 * envelope and related entities. Lookups are best-effort; missing data yields
 * null so the renderer can fall back to generic copy.
 */
export class NotificationDisplayContextResolver {
  constructor(
    private readonly users: IUserRepository,
    private readonly organizations: IOrganizationRepository,
    private readonly accounts: IAccountRepository,
    private readonly projects: IProjectRepository,
    private readonly roles: IRoleRepository,
    private readonly permissions: IPermissionRepository,
    private readonly groups: IGroupRepository
  ) {}

  async resolve(event: DomainEvent, tx?: Transaction): Promise<NotificationDisplayContext> {
    const [userNames, scopeName, roleName, permissionName, groupName] = await Promise.all([
      this.resolveUserNames([event.actorUserId, event.subjectUserId], tx),
      this.resolveScopeName(event.scope, tx),
      this.resolveRoleName(event, tx),
      this.resolvePermissionName(event, tx),
      this.resolveGroupName(event, tx),
    ]);

    return {
      actorName: event.actorUserId ? (userNames.get(event.actorUserId) ?? null) : null,
      scopeName,
      roleName,
      entityName: entityNameFromPayload(event),
      permissionName,
      groupName,
      subjectName: event.subjectUserId ? (userNames.get(event.subjectUserId) ?? null) : null,
    };
  }

  private async resolveUserNames(
    userIds: Array<string | null>,
    tx?: Transaction
  ): Promise<Map<string, string>> {
    const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    const names = new Map<string, string>();
    if (ids.length === 0) return names;

    const { users } = await this.users.getUsers({ ids, limit: ids.length }, tx);
    for (const user of users) {
      const name = user.name?.trim();
      if (name) names.set(user.id, name);
    }
    return names;
  }

  private async resolvePermissionName(
    event: DomainEvent,
    tx?: Transaction
  ): Promise<string | null> {
    const permissionId =
      stringField(event.data.after, 'permissionId') ??
      stringField(event.data.before, 'permissionId');
    if (!permissionId) return null;
    const { permissions } = await this.permissions.getPermissions(
      { ids: [permissionId], limit: 1 },
      tx
    );
    const name = permissions[0]?.name?.trim();
    return name || null;
  }

  private async resolveGroupName(event: DomainEvent, tx?: Transaction): Promise<string | null> {
    const groupId =
      stringField(event.data.after, 'groupId') ?? stringField(event.data.before, 'groupId');
    if (!groupId) return null;
    const { groups } = await this.groups.getGroups({ ids: [groupId], limit: 1 }, tx);
    const name = groups[0]?.name?.trim();
    return name || null;
  }

  private async resolveScopeName(scope: Scope, tx?: Transaction): Promise<string | null> {
    switch (scope.tenant) {
      case Tenant.Organization: {
        const { organizations } = await this.organizations.getOrganizations(
          { ids: [scope.id], limit: 1 },
          tx
        );
        return organizations[0]?.name ?? null;
      }
      case Tenant.Account: {
        const { accounts } = await this.accounts.getAccounts({ ids: [scope.id], limit: 1 }, tx);
        return accounts[0] ? 'Personal account' : null;
      }
      case Tenant.OrganizationProject:
      case Tenant.AccountProject: {
        const projectName = await this.resolveProjectName(scope.id, tx);
        if (projectName) return projectName;

        const [parentId] = scope.id.split(':');
        if (!parentId) return null;
        if (scope.tenant === Tenant.OrganizationProject) {
          const { organizations } = await this.organizations.getOrganizations(
            { ids: [parentId], limit: 1 },
            tx
          );
          return organizations[0]?.name ?? null;
        }
        return 'Personal account';
      }
      case Tenant.System:
        return 'System';
      default:
        return null;
    }
  }

  private async resolveProjectName(
    compositeScopeId: string,
    tx?: Transaction
  ): Promise<string | null> {
    const parts = compositeScopeId.split(':');
    const projectId = parts.length >= 2 ? parts[1] : null;
    if (!projectId) return null;

    const { projects } = await this.projects.getProjects({ ids: [projectId], limit: 1 }, tx);
    const name = projects[0]?.name?.trim();
    return name || null;
  }

  private async resolveRoleName(event: DomainEvent, tx?: Transaction): Promise<string | null> {
    const fromPayload =
      stringField(event.data.after, 'roleName') ?? stringField(event.data.before, 'roleName');
    if (fromPayload) return displayRoleName(fromPayload);

    const roleId =
      stringField(event.data.after, 'roleId') ?? stringField(event.data.before, 'roleId');
    if (!roleId) return null;

    const { roles } = await this.roles.getRoles({ ids: [roleId], limit: 1 }, tx);
    const name = roles[0]?.name ?? null;
    return name ? displayRoleName(name) : null;
  }
}

function entityNameFromPayload(event: DomainEvent): string | null {
  return stringField(event.data.after, 'name') ?? stringField(event.data.before, 'name');
}

/**
 * System roles store an i18n key as their `name` (see `@grantjs/constants`
 * `getNameKey`); custom roles store a literal name. Notification text is
 * English-only (no per-recipient locale here), so resolve system roles to
 * their default-locale label rather than splicing the raw key into copy.
 */
function displayRoleName(name: string): string {
  return isRoleI18nKey(name) ? translateStatic(`common.${name}`) : name;
}

function stringField(
  record: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const value = record?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}
