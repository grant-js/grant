import {
  type AudiencePrimitive,
  type DomainEvent,
  getEventCatalogEntry,
  type Scope,
  Tenant,
} from '@grantjs/schema';

import { tryProjectIdFromScope } from '@/lib/project-id-from-scope.lib';
import type { Transaction } from '@/lib/transaction-manager.lib';
import type { OrganizationUserRepository } from '@/repositories/organization-users.repository';
import type { ProjectUserRepository } from '@/repositories/project-users.repository';

/**
 * Resolves the set of recipient user ids for an event by composing the
 * declarative audience primitives from the event catalog.
 *
 * Implemented primitives: `actor`, `subject`, `scopeMembers`, and `owners`
 * (approximated as scope membership until a dedicated ownership concept exists).
 * `roleHolders` and `watchers` are deferred (no reverse index yet) and resolve
 * to the empty set.
 */
export class AudienceResolver {
  constructor(
    private readonly projectUsers: ProjectUserRepository,
    private readonly organizationUsers: OrganizationUserRepository
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
      case 'owners':
        return this.resolveScopeMembers(event.scope, tx);
      case 'roleHolders':
      case 'watchers':
        // Deferred: requires a reverse permission/watch index.
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
