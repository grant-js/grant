import type { ILogger, INotificationDeliveryService } from '@grantjs/core';
import type { DbSchema, NotificationModel, NotificationStatus } from '@grantjs/database';
import type { DomainEvent } from '@grantjs/schema';

import { config } from '@/config';
import { defaultLocale } from '@/i18n';
import {
  getNotificationEmailHtml,
  getNotificationEmailSubject,
  getNotificationEmailText,
} from '@/lib/email/templates';
import { mapEventLogToDomainEvent } from '@/lib/events';
import {
  composeNotificationEmail,
  type NotificationDisplayContext,
  type NotificationDisplayContextResolver,
} from '@/lib/notifications';
import { DrizzleTransactionalConnection } from '@/lib/transaction-manager.lib';
import type { EventLogRepository } from '@/repositories/event-log.repository';
import type {
  NotificationRepository,
  NotificationResultUpdate,
} from '@/repositories/notifications.repository';
import type { UserAuthenticationMethodRepository } from '@/repositories/user-authentication-methods.repository';

import type { EmailService } from './email.service';

const MS_PER_SECOND = 1000;
const MS_PER_HOUR = 60 * 60 * MS_PER_SECOND;

const EMPTY_CONTEXT: NotificationDisplayContext = {
  actorName: null,
  scopeName: null,
  roleName: null,
  entityName: null,
  permissionName: null,
  groupName: null,
  subjectName: null,
};

/**
 * System-level email notification delivery worker. Claims due `email`-channel
 * notifications, resolves recipient addresses, sends them via the email
 * adapter, and advances each row's state (delivered / failed-with-backoff /
 * dead). Email I/O happens outside the claim transaction.
 */
export class NotificationDeliveryService implements INotificationDeliveryService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly authMethods: UserAuthenticationMethodRepository,
    private readonly email: EmailService,
    private readonly eventLog: EventLogRepository,
    private readonly displayContext: NotificationDisplayContextResolver,
    private readonly db: DbSchema
  ) {}

  private computeNextState(
    notification: NotificationModel,
    ok: boolean,
    errorMessage?: string
  ): NotificationResultUpdate {
    const attemptCount = notification.attemptCount + 1;
    const now = new Date();

    if (ok) {
      return { status: 'delivered', attemptCount, nextRetryAt: null, errorDetails: null };
    }

    const retry = config.notifications.emailRetry;
    const exhausted = attemptCount >= retry.maxAttempts;
    const pastHorizon =
      now.getTime() - notification.createdAt.getTime() > retry.horizonHours * MS_PER_HOUR;
    const dead = exhausted || pastHorizon;
    const status: NotificationStatus = dead ? 'dead' : 'failed';
    const backoffSeconds = Math.min(
      retry.baseDelaySeconds * 2 ** (attemptCount - 1),
      retry.maxDelaySeconds
    );

    return {
      status,
      attemptCount,
      nextRetryAt: dead ? null : new Date(now.getTime() + backoffSeconds * MS_PER_SECOND),
      errorDetails: { errorMessage: errorMessage ?? 'Email send failed' },
    };
  }

  private async deliverOne(
    notification: NotificationModel,
    email: string | undefined,
    event: DomainEvent | undefined,
    ctx: NotificationDisplayContext,
    logger: ILogger
  ): Promise<void> {
    if (!email) {
      await this.notifications.updateResult(notification.id, {
        status: 'dead',
        attemptCount: notification.attemptCount + 1,
        nextRetryAt: null,
        errorDetails: { errorMessage: 'No email address for recipient' },
      });
      return;
    }

    try {
      const content = composeNotificationEmail({
        event: event ?? null,
        ctx,
        recipientUserId: notification.recipientUserId,
        refEntity: notification.refEntity,
        refId: notification.refId,
        fallbackTitle: notification.title,
        fallbackBody: notification.body,
        locale: defaultLocale,
      });
      const html = await getNotificationEmailHtml(content, defaultLocale);
      await this.email.sendNotification({
        to: email,
        subject: getNotificationEmailSubject(content),
        text: getNotificationEmailText(content, defaultLocale),
        html,
      });
      await this.notifications.updateResult(
        notification.id,
        this.computeNextState(notification, true)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const update = this.computeNextState(notification, false, message);
      await this.notifications.updateResult(notification.id, update);
      logger.warn({
        msg: 'Notification email delivery failed',
        notificationId: notification.id,
        status: update.status,
        error: message,
      });
    }
  }

  private async processBatch(batchSize: number, logger: ILogger): Promise<number> {
    const txConn = new DrizzleTransactionalConnection(this.db);
    const now = new Date();

    const claimed = await txConn.withTransaction((tx) =>
      this.notifications.claimDueEmail(batchSize, now, tx)
    );
    if (claimed.length === 0) return 0;

    const recipientIds = [...new Set(claimed.map((c) => c.recipientUserId))];
    const eventIds = [...new Set(claimed.map((c) => c.eventId))];
    const [emails, eventRows] = await Promise.all([
      this.authMethods.getEmailsByUserIds(recipientIds),
      this.eventLog.getByIds(eventIds),
    ]);

    const eventsById = new Map(eventRows.map((row) => [row.id, mapEventLogToDomainEvent(row)]));
    const ctxByEventId = new Map<string, NotificationDisplayContext>();
    await Promise.all(
      [...eventsById.entries()].map(async ([id, event]) => {
        ctxByEventId.set(id, await this.displayContext.resolve(event));
      })
    );

    for (const notification of claimed) {
      const event = eventsById.get(notification.eventId);
      await this.deliverOne(
        notification,
        emails.get(notification.recipientUserId),
        event,
        event ? (ctxByEventId.get(event.id) ?? EMPTY_CONTEXT) : EMPTY_CONTEXT,
        logger
      );
    }

    return claimed.length;
  }

  /** Drain due email notifications up to the configured batch cap. */
  async drain(logger: ILogger): Promise<number> {
    const { batchSize, maxBatches } = config.jobs.notificationDelivery;
    let total = 0;
    for (let i = 0; i < maxBatches; i++) {
      const processed = await this.processBatch(batchSize, logger);
      total += processed;
      if (processed < batchSize) break;
    }
    if (total > 0) {
      logger.info({ msg: 'Notification email delivery drained', delivered: total });
    }
    return total;
  }
}
