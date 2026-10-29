import type { GrantAuth, IEventPublisher } from '@grantjs/core';
import { type DbSchema, eventLog, type NewEventLogModel } from '@grantjs/database';
import {
  type DomainEventInput,
  type EventAggregateRef,
  getEventCatalogEntry,
  type Scope,
  Tenant,
} from '@grantjs/schema';

import { config } from '@/config';
import { EVENT_RELAY_JOB_ID } from '@/constants/event-relay.constants';
import type { ScheduleAfterCommit } from '@/lib/after-commit.lib';
import { getActiveOutboxBatch } from '@/lib/events/event-outbox-batch.lib';
import { linkedEntityRefsOf } from '@/lib/events/event-project-links.lib';
import { isEventPublishingSuppressed } from '@/lib/events/event-suppression.lib';
import { chunkArray } from '@/lib/iam-cascade.lib';
import { getJobAdapter } from '@/lib/jobs/initialize';
import { createLogger } from '@/lib/logger';
import {
  isApiKeyIdActor,
  resolveSyncJobEnqueuedById,
} from '@/lib/resolve-sync-job-enqueued-by.lib';
import type { Transaction } from '@/lib/transaction-manager.lib';
import {
  isProjectLinkedKind,
  ProjectLinksRepository,
} from '@/repositories/project-links.repository';

const logger = createLogger('EventPublisher');

const SYSTEM_SCOPE: Scope = { tenant: Tenant.System, id: 'system' };

export type { ScheduleAfterCommit };

export interface DrizzleEventPublisherOptions {
  /** When set, schedules a coalesced EVENT_RELAY enqueue after the surrounding TX commits. */
  scheduleAfterCommit?: ScheduleAfterCommit;
  /** Reads the project pivots; defaults to one over the publisher's own connection. */
  projectLinks?: ProjectLinksRepository;
}

/**
 * Drizzle-based implementation of IEventPublisher.
 *
 * Writes a domain event to the `event_log` outbox using the provided
 * transaction so it commits atomically with the data change and audit log.
 * Resolves actor and scope from the request auth context (like
 * DrizzleAuditLogger) unless the caller overrides them on the event.
 */
export class DrizzleEventPublisher implements IEventPublisher {
  private relayEnqueueScheduled = false;
  private readonly projectLinks: ProjectLinksRepository;

  constructor(
    private readonly user: GrantAuth | null,
    private readonly db: DbSchema,
    private readonly options: DrizzleEventPublisherOptions = {}
  ) {
    this.projectLinks = options.projectLinks ?? new ProjectLinksRepository(db);
  }

  async resolveLinkedProjectIds(
    refs: EventAggregateRef[],
    transaction?: unknown
  ): Promise<string[]> {
    const tx = transaction as Transaction | undefined;
    const perEntity = await Promise.all(
      refs.map(({ kind, id }) => {
        if (isProjectLinkedKind(kind)) return this.projectLinks.getLinkedProjectIds(kind, id, tx);
        // Explicit only (never derived from an aggregate): see getUserProjectIds.
        if (kind === 'user') return this.projectLinks.getUserProjectIds(id, tx);
        return [];
      })
    );
    return [...new Set(perEntity.flat())];
  }

  private async resolveProjectIds(
    event: DomainEventInput,
    transaction?: unknown
  ): Promise<string[]> {
    const resolved = await this.resolveLinkedProjectIds(linkedEntityRefsOf(event), transaction);
    return [...new Set([...(event.projectIds ?? []), ...resolved])];
  }

  /**
   * `actor_user_id` references `users`, so a project-level API key (whose `userId` is the key id)
   * is attributed to the system user, the same mapping the audit logger uses; `resolveActorToken`
   * keeps the key identifiable.
   */
  private resolveActorId(event: DomainEventInput): string | null {
    return (
      event.actor?.userId ??
      resolveSyncJobEnqueuedById(this.user) ??
      config.system.systemUserId ??
      null
    );
  }

  /**
   * Which token acted, when the actor id alone cannot say (the key-id actor). Stored in the
   * internal payload only: `mapEventLogToDomainEvent` does not read it, so it never reaches a
   * webhook delivery or a notification. No secrets.
   */
  private resolveActorToken(): { tokenId: string; tokenType: string } | null {
    return this.user !== null && isApiKeyIdActor(this.user)
      ? { tokenId: this.user.tokenId, tokenType: this.user.type }
      : null;
  }

  private resolveScope(event: DomainEventInput): Scope {
    return event.scope ?? this.user?.scope ?? SYSTEM_SCOPE;
  }

  private scheduleRelayEnqueue(): void {
    const scheduleAfterCommit = this.options.scheduleAfterCommit;
    if (!scheduleAfterCommit || this.relayEnqueueScheduled) {
      return;
    }
    this.relayEnqueueScheduled = true;
    // Returned so the after-commit runner awaits the enqueue before the response is flushed.
    scheduleAfterCommit(async () => {
      const jobs = getJobAdapter();
      if (!jobs?.enqueue) {
        return;
      }
      try {
        await jobs.enqueue(EVENT_RELAY_JOB_ID);
      } catch (err: unknown) {
        logger.error({
          msg: 'Failed to enqueue event-relay after publish',
          err,
        });
      }
    }, EVENT_RELAY_JOB_ID);
  }

  async publish(event: DomainEventInput, transaction?: unknown): Promise<void> {
    await this.publishMany([event], transaction);
  }

  async publishMany(events: DomainEventInput[], transaction?: unknown): Promise<void> {
    if (events.length === 0 || isEventPublishingSuppressed()) {
      if (events.length > 0 && isEventPublishingSuppressed()) {
        logger.debug({
          msg: 'Skipping domain event publish (suppressed)',
          count: events.length,
        });
      }
      return;
    }

    const rows: NewEventLogModel[] = [];
    for (const event of events) {
      rows.push(await this.buildRow(event, transaction));
    }

    const batch = getActiveOutboxBatch();
    if (batch) {
      batch.rows.push(...rows);
      batch.flush = (pending, tx) => this.writeRows(pending, tx);
      return;
    }

    await this.writeRows(rows, transaction);
  }

  private async buildRow(
    event: DomainEventInput,
    transaction?: unknown
  ): Promise<NewEventLogModel> {
    const scope = this.resolveScope(event);
    const entry = getEventCatalogEntry(event.type);
    const projectIds = await this.resolveProjectIds(event, transaction);
    const actorToken = this.resolveActorToken();

    return {
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
        ...(projectIds.length > 0 ? { projectIds } : {}),
        ...(actorToken ? { actor: actorToken } : {}),
      },
      occurredAt: event.occurredAt ?? new Date(),
      relayStatus: 'pending',
    };
  }

  private async writeRows(rows: NewEventLogModel[], transaction?: unknown): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    const dbInstance = (transaction as Transaction | undefined) ?? this.db;

    try {
      for (const chunk of chunkArray(rows, config.system.iamCascadeChunkSize)) {
        await (dbInstance as DbSchema).insert(eventLog).values(chunk);
      }
    } catch (error) {
      logger.error({
        msg: 'Failed to write domain events to event_log',
        count: rows.length,
        err: error,
      });
      throw error;
    }

    this.scheduleRelayEnqueue();
  }
}
