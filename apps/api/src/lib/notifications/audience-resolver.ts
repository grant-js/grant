import {
  type AudiencePrimitive,
  type DomainEvent,
  getEventCatalogEntry,
  type Scope,
  Tenant,
} from '@grantjs/schema';

import { tryProjectIdFromScope } from '@/lib/scope.lib';
import type { Transaction } from '@/lib/transaction-manager.lib';
import type { AccountProjectRepository } from '@/repositories/account-projects.repository';
import type { AccountRepository } from '@/repositories/accounts.repository';
import type { OrganizationProjectRepository } from '@/repositories/organization-projects.repository';
import type { OrganizationUserRepository } from '@/repositories/organization-users.repository';
import type { ProjectUserRepository } from '@/repositories/project-users.repository';

/** Seeded organization role names used for owner vs IAM-manager audience resolution. */
const ORG_OWNER_ROLE_NAMES = ['Organization Owner', 'Organization Admin'] as const;

const ORG_ROLE_HOLDER_ROLE_NAMES = [
  'Organization Owner',
  'Organization Admin',
  'Organization Dev',
] as const;

/**
 * Resolves the set of recipient user ids for an event by composing the
 * declarative audience primitives from the event catalog.
 *
 * Implemented primitives: `actor`, `subject`, `scopeMembers`, `owners`,
 * `roleHolders`. `watchers` remains reserved (no watch/subscribe model) and
 * is not listed in catalog audience rules until that model exists.
 */
export class AudienceResolver {
  constructor(
    private readonly projectUsers: ProjectUserRepository,
    private readonly organizationUsers: OrganizationUserRepository,
    private readonly organizationProjects: OrganizationProjectRepository,
    private readonly accountProjects: AccountProjectRepository,
    private readonly accounts: AccountRepository
  ) {}

  private async resolveScopeMembers(scope: Scope, tx?: Transaction): Promise<string[]> {
    switch (scope.tenant) {
      case Tenant.Organization: {
        const members = await this.organizationUsers.getOrganizationUsers(
          { organizationId: scope.id },
          tx
        );
        return members.map((m) => m.userId);
      }
      case Tenant.OrganizationProject:
      case Tenant.OrganizationProjectUser:
      case Tenant.AccountProject:
      case Tenant.AccountProjectUser: {
        const projectId = tryProjectIdFromScope(scope);
        if (!projectId) return [];
        const members = await this.projectUsers.getProjectUsers({ projectId }, tx);
        return members.map((m) => m.userId);
      }
      default:
        return [];
    }
  }

  private async resolveOrganizationIdFromScope(
    scope: Scope,
    tx?: Transaction
  ): Promise<string | null> {
    switch (scope.tenant) {
      case Tenant.Organization:
        return scope.id;
      case Tenant.OrganizationProject:
      case Tenant.OrganizationProjectUser: {
        const projectId = tryProjectIdFromScope(scope);
        if (!projectId) return null;
        const pivot = await this.organizationProjects.getFirstByProjectId(projectId, tx);
        return pivot?.organizationId ?? null;
      }
      default:
        return null;
    }
  }

  private async resolveAccountIdFromScope(scope: Scope, tx?: Transaction): Promise<string | null> {
    switch (scope.tenant) {
      case Tenant.Account:
        return scope.id;
      case Tenant.AccountProject:
      case Tenant.AccountProjectUser: {
        const projectId = tryProjectIdFromScope(scope);
        if (!projectId) return null;
        const pivot = await this.accountProjects.getFirstByProjectId(projectId, tx);
        return pivot?.accountId ?? null;
      }
      default:
        return null;
    }
  }

  private async resolveOwners(scope: Scope, tx?: Transaction): Promise<string[]> {
    const orgId = await this.resolveOrganizationIdFromScope(scope, tx);
    if (orgId) {
      return this.organizationUsers.getUserIdsByOrganizationRoleNames(
        orgId,
        ORG_OWNER_ROLE_NAMES,
        tx
      );
    }

    const accountId = await this.resolveAccountIdFromScope(scope, tx);
    if (accountId) {
      const ownerId = await this.accounts.getOwnerId(accountId, tx);
      return ownerId ? [ownerId] : [];
    }

    return [];
  }

  private async resolveRoleHolders(scope: Scope, tx?: Transaction): Promise<string[]> {
    const orgId = await this.resolveOrganizationIdFromScope(scope, tx);
    if (orgId) {
      return this.organizationUsers.getUserIdsByOrganizationRoleNames(
        orgId,
        ORG_ROLE_HOLDER_ROLE_NAMES,
        tx
      );
    }

    const accountId = await this.resolveAccountIdFromScope(scope, tx);
    if (accountId) {
      const ownerId = await this.accounts.getOwnerId(accountId, tx);
      return ownerId ? [ownerId] : [];
    }

    return [];
  }

  private async resolvePrimitive(
    primitive: AudiencePrimitive,
    event: DomainEvent,
    tx?: Transaction
  ): Promise<string[]> {
    switch (primitive) {
      case 'actor':
        return event.actorUserId ? [event.actorUserId] : [];
      case 'subject':
        return event.subjectUserId ? [event.subjectUserId] : [];
      case 'scopeMembers':
        return this.resolveScopeMembers(event.scope, tx);
      case 'owners':
        return this.resolveOwners(event.scope, tx);
      case 'roleHolders':
        return this.resolveRoleHolders(event.scope, tx);
      case 'watchers':
        // Deferred: no watch/subscribe model yet.
        return [];
      default:
        return [];
    }
  }

  /** Resolve the unique recipient user ids for an event per its catalog rule. */
  async resolve(event: DomainEvent, tx?: Transaction): Promise<string[]> {
    const { audienceRule } = getEventCatalogEntry(event.type);
    const recipients = new Set<string>();

    for (const primitive of audienceRule.primitives) {
      const ids = await this.resolvePrimitive(primitive, event, tx);
      for (const id of ids) recipients.add(id);
    }

    if (audienceRule.excludeActor !== false && event.actorUserId) {
      recipients.delete(event.actorUserId);
    }

    return [...recipients];
  }
}
