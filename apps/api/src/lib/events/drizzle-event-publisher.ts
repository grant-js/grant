import type { GrantAuth, IEventPublisher } from '@grantjs/core';
import { type DbSchema, eventLog, type NewEventLogModel } from '@grantjs/database';
import { type DomainEventInput, getEventCatalogEntry, type Scope, Tenant } from '@grantjs/schema';

import { config } from '@/config';
import { createLogger } from '@/lib/logger';
import type { Transaction } from '@/lib/transaction-manager.lib';

const logger = createLogger('EventPublisher');

const SYSTEM_SCOPE: Scope = { tenant: Tenant.System, id: 'system' };

/**
 * Drizzle-based implementation of IEventPublisher.
 *
 * Writes a domain event to the `event_log` outbox using the provided
 * transaction so it commits atomically with the data change and audit log.
 * Resolves actor and scope from the request auth context (like
 * DrizzleAuditLogger) unless the caller overrides them on the event.
 */
export class DrizzleEventPublisher implements IEventPublisher {
  constructor(
    private readonly user: GrantAuth | null,
    private readonly db: DbSchema
  ) {}

  private resolveActorId(event: DomainEventInput): string | null {
    return event.actor?.userId ?? this.user?.userId ?? config.system.systemUserId ?? null;
  }

  private resolveScope(event: DomainEventInput): Scope {
    return event.scope ?? this.user?.scope ?? SYSTEM_SCOPE;
  }

  async publish(event: DomainEventInput, transaction?: unknown): Promise<void> {
    const dbInstance = (transaction as Transaction | undefined) ?? this.db;
    const scope = this.resolveScope(event);
    const entry = getEventCatalogEntry(event.type);

    const row: NewEventLogModel = {
      type: event.type,
      category: entry.category,
      deliveryClass: entry.deliveryClass,
      scopeTenant: String(scope.tenant),
      scopeId: scope.id,
      actorUserId: this.resolveActorId(event),
      subjectUserId: event.subjectUserId ?? null,
      payload: {
        aggregate: event.aggregate ?? null,
        data: event.data,
      },
      occurredAt: event.occurredAt ?? new Date(),
      relayStatus: 'pending',
    };

    try {
      await (dbInstance as DbSchema).insert(eventLog).values(row);
    } catch (error) {
      // Never let event emission break the business transaction's primary work.
      // A failed insert here will roll back with the surrounding tx anyway; we
      // log so it is observable.
      logger.error({
        msg: 'Failed to write domain event to event_log',
        type: event.type,
        err: error,
      });
      throw error;
    }
  }
}
