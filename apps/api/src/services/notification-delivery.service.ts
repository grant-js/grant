import type { ILogger, INotificationDeliveryService } from '@grantjs/core';
import type { DbSchema, NotificationModel, NotificationStatus } from '@grantjs/database';

import { config } from '@/config';
import { DrizzleTransactionalConnection } from '@/lib/transaction-manager.lib';
import type {
  NotificationRepository,
  NotificationResultUpdate,
} from '@/repositories/notifications.repository';
import type { UserAuthenticationMethodRepository } from '@/repositories/user-authentication-methods.repository';

import type { EmailService } from './email.service';

const MS_PER_SECOND = 1000;
const MS_PER_HOUR = 60 * 60 * MS_PER_SECOND;

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
      await this.email.sendNotification({
        to: email,
        subject: notification.title,
        text: notification.body ?? notification.title,
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
    const emails = await this.authMethods.getEmailsByUserIds(recipientIds);

    for (const notification of claimed) {
      await this.deliverOne(notification, emails.get(notification.recipientUserId), logger);
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
