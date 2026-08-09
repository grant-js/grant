import { isRoleI18nKey } from '@grantjs/constants';
import type {
  IAccountRepository,
  IOrganizationRepository,
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
    private readonly roles: IRoleRepository
  ) {}

  async resolve(event: DomainEvent, tx?: Transaction): Promise<NotificationDisplayContext> {
    const [actorName, scopeName, roleName] = await Promise.all([
      this.resolveActorName(event.actorUserId, tx),
      this.resolveScopeName(event.scope, tx),
      this.resolveRoleName(event, tx),
    ]);

    return {
      actorName,
      scopeName,
      roleName,
      entityName: entityNameFromPayload(event),
    };
  }

  private async resolveActorName(
    actorUserId: string | null,
    tx?: Transaction
  ): Promise<string | null> {
    if (!actorUserId) return null;
    const { users } = await this.users.getUsers({ ids: [actorUserId], limit: 1 }, tx);
    const user = users[0];
    if (!user) return null;
    const name = user.name?.trim();
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
