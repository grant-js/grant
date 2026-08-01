import type { IEventConsumer } from '@grantjs/core';
import type { NotificationChannel } from '@grantjs/database';
import { type DomainEvent, type EventCategory, getEventCatalogEntry } from '@grantjs/schema';

import { createLogger } from '@/lib/logger';
import type { Transaction } from '@/lib/transaction-manager.lib';
import type { NotificationPreferenceRepository } from '@/repositories/notification-preferences.repository';
import type { NotificationRepository } from '@/repositories/notifications.repository';
import type { OrganizationUserRepository } from '@/repositories/organization-users.repository';
import type { ProjectUserRepository } from '@/repositories/project-users.repository';

import type { AudienceResolver } from './audience-resolver';
import type { NotificationDisplayContextResolver } from './notification-display-context';
import {
  classifyNotificationLinkKind,
  resolveNotificationLinkRefs,
  tryOrganizationIdFromNotificationScope,
  tryProjectIdFromScope,
} from './notification-link-eligibility';
import { resolvePreferenceEnabled } from './notification-preferences.lib';
import { renderNotification } from './notification-renderer';

const logger = createLogger('NotificationGeneratorConsumer');

const ALL_CHANNELS: NotificationChannel[] = ['in_app', 'email'];

/**
 * Fans a domain event out into per-recipient, per-channel notification rows.
 * Audience comes from the event catalog rule; channel enablement applies the
 * preference precedence (security is locked on). `in_app` rows are created
 * `delivered` (they are the read model); `email` rows are `pending` for the
 * email delivery job. Idempotent via the unique (event, recipient, channel).
 *
 * Transactional events keep their existing security email fast path, so only
 * the `in_app` channel is generated for them here (no duplicate email).
 *
 * Deep-link refs are classified per recipient: org members keep org dashboard
 * aggregate refs; project members get `projectMembership`; others get null.
 */
export class NotificationGeneratorConsumer implements IEventConsumer {
  public readonly name = 'notifications';

  constructor(
    private readonly audience: AudienceResolver,
    private readonly preferences: NotificationPreferenceRepository,
    private readonly notifications: NotificationRepository,
    private readonly displayContext: NotificationDisplayContextResolver,
    private readonly organizationUsers: OrganizationUserRepository,
    private readonly projectUsers: ProjectUserRepository
  ) {}

  private channelsFor(deliveryClass: 'transactional' | 'notification'): NotificationChannel[] {
    return deliveryClass === 'transactional' ? ['in_app'] : ALL_CHANNELS;
  }

  private async isChannelEnabled(
    recipientUserId: string,
    event: DomainEvent,
    category: EventCategory,
    channel: NotificationChannel,
    tx?: Transaction
  ): Promise<boolean> {
    const rows = await this.preferences.getForResolution(
      recipientUserId,
      String(event.scope.tenant),
      [event.scope.id, ''],
      category,
      channel,
      tx
    );
    return resolvePreferenceEnabled({ category, channel, scopeId: event.scope.id, rows });
  }

  private async resolveMembershipSets(
    event: DomainEvent,
    tx?: Transaction
  ): Promise<{
    orgMemberIds: Set<string>;
    projectMemberIds: Set<string>;
    projectId: string | null;
  }> {
    const projectId = tryProjectIdFromScope(event.scope);
    const organizationId = tryOrganizationIdFromNotificationScope(event.scope);

    const orgMemberIds = new Set<string>();
    if (organizationId) {
      const members = await this.organizationUsers.getOrganizationUsers({ organizationId }, tx);
      for (const member of members) {
        orgMemberIds.add(member.userId);
      }
    }

    const projectMemberIds = new Set<string>();
    if (projectId) {
      const members = await this.projectUsers.getProjectUsers({ projectId }, tx);
      for (const member of members) {
        projectMemberIds.add(member.userId);
      }
    }

    return { orgMemberIds, projectMemberIds, projectId };
  }

  async process(event: DomainEvent, transaction?: unknown): Promise<void> {
    const tx = transaction as Transaction | undefined;
    const entry = getEventCatalogEntry(event.type);
    const recipients = await this.audience.resolve(event, tx);
    if (recipients.length === 0) return;

    const ctx = await this.displayContext.resolve(event, tx);
    const content = renderNotification(event, ctx);
    const channels = this.channelsFor(entry.deliveryClass);
    const { orgMemberIds, projectMemberIds, projectId } = await this.resolveMembershipSets(
      event,
      tx
    );
    let created = 0;

    for (const recipientUserId of recipients) {
      const kind = classifyNotificationLinkKind({
        tenant: event.scope.tenant,
        isOrgMember: orgMemberIds.has(recipientUserId),
        isProjectMember: projectMemberIds.has(recipientUserId),
        projectId,
      });
      const refs = resolveNotificationLinkRefs({
        kind,
        contentRefs: { refEntity: content.refEntity, refId: content.refId },
        projectId,
      });

      for (const channel of channels) {
        const enabled = await this.isChannelEnabled(
          recipientUserId,
          event,
          entry.category,
          channel,
          tx
        );
        if (!enabled) continue;

        await this.notifications.upsert(
          {
            eventId: event.id,
            recipientUserId,
            category: entry.category,
            type: event.type,
            channel,
            title: content.title,
            body: content.body,
            refEntity: refs.refEntity,
            refId: refs.refId,
            status: channel === 'in_app' ? 'delivered' : 'pending',
          },
          tx
        );
        created += 1;
      }
    }

    if (created > 0) {
      logger.debug({
        msg: 'Generated notifications for event',
        eventId: event.id,
        type: event.type,
        recipients: recipients.length,
        created,
      });
    }
  }
}
