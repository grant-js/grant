import type {
  ILogger,
  IWebhookDeliveryAdapter,
  IWebhookDeliveryService,
  IWebhookSigner,
  WebhookDeliveryResult,
} from '@grantjs/core';
import type {
  DbSchema,
  EventLogModel,
  WebhookDeliveryAttemptModel,
  WebhookDeliveryStatus,
  WebhookSubscriptionModel,
} from '@grantjs/database';

import { config } from '@/config';
import { mapEventLogToDomainEvent } from '@/lib/events';
import { DrizzleTransactionalConnection } from '@/lib/transaction-manager.lib';
import { buildCloudEventEnvelope } from '@/lib/webhooks';
import type { EventLogRepository } from '@/repositories/event-log.repository';
import type {
  DeliveryResultUpdate,
  WebhookDeliveryRepository,
} from '@/repositories/webhook-deliveries.repository';
import type { WebhookSubscriptionRepository } from '@/repositories/webhook-subscriptions.repository';

const MS_PER_SECOND = 1000;
const MS_PER_HOUR = 60 * 60 * MS_PER_SECOND;

/**
 * System-level webhook delivery worker. Claims due delivery attempts, signs and
 * POSTs the redacted CloudEvents envelope to each subscription endpoint, and
 * advances each attempt's state (delivered / failed-with-backoff / dead).
 *
 * HTTP I/O happens outside the DB transaction: a short transaction claims +
 * marks attempts `running`, then delivery runs unlocked, then results are
 * persisted. This avoids holding row locks across network calls.
 */
export class WebhookDeliveryService implements IWebhookDeliveryService {
  constructor(
    private readonly deliveries: WebhookDeliveryRepository,
    private readonly subscriptions: WebhookSubscriptionRepository,
    private readonly eventLog: EventLogRepository,
    private readonly signer: IWebhookSigner,
    private readonly delivery: IWebhookDeliveryAdapter,
    private readonly db: DbSchema
  ) {}

  private get source(): string {
    return config.app.url;
  }

  private computeNextState(
    attempt: WebhookDeliveryAttemptModel,
    result: WebhookDeliveryResult
  ): DeliveryResultUpdate {
    const attemptCount = attempt.attemptCount + 1;
    const now = new Date();

    if (result.ok) {
      return {
        status: 'delivered',
        attemptCount,
        nextRetryAt: null,
        lastResponseStatus: result.status,
        errorDetails: null,
        deliveredAt: now,
      };
    }

    const { retry } = config.webhooks;
    const exhausted = attemptCount >= retry.maxAttempts;
    const pastHorizon =
      now.getTime() - attempt.createdAt.getTime() > retry.horizonHours * MS_PER_HOUR;
    const dead = !result.retryable || exhausted || pastHorizon;

    const status: WebhookDeliveryStatus = dead ? 'dead' : 'failed';
    const backoffSeconds = Math.min(
      retry.baseDelaySeconds * 2 ** (attemptCount - 1),
      retry.maxDelaySeconds
    );

    return {
      status,
      attemptCount,
      nextRetryAt: dead ? null : new Date(now.getTime() + backoffSeconds * MS_PER_SECOND),
      lastResponseStatus: result.status,
      errorDetails: {
        errorType: result.errorType ?? 'unknown',
        errorMessage: result.errorMessage ?? 'Delivery failed',
        retryable: result.retryable,
      },
      deliveredAt: null,
    };
  }

  private async deliverOne(
    attempt: WebhookDeliveryAttemptModel,
    subscription: WebhookSubscriptionModel | undefined,
    event: EventLogModel | undefined,
    logger: ILogger
  ): Promise<void> {
    if (!subscription || !event) {
      await this.deliveries.updateResult(attempt.id, {
        status: 'dead',
        attemptCount: attempt.attemptCount + 1,
        nextRetryAt: null,
        lastResponseStatus: null,
        errorDetails: { errorType: 'unknown', errorMessage: 'Missing subscription or event' },
        deliveredAt: null,
      });
      return;
    }

    const envelope = buildCloudEventEnvelope(mapEventLogToDomainEvent(event), this.source);
    const body = JSON.stringify(envelope);
    const timestamp = Math.floor(Date.now() / MS_PER_SECOND);
    const headers = this.signer.buildHeaders({
      id: attempt.id,
      timestamp,
      body,
      secret: subscription.secretRef,
    });

    const result = await this.delivery.deliver({ url: subscription.url, body, headers });
    const update = this.computeNextState(attempt, result);
    await this.deliveries.updateResult(attempt.id, update);

    if (!result.ok) {
      logger.warn({
        msg: 'Webhook delivery attempt failed',
        deliveryId: attempt.id,
        subscriptionId: subscription.id,
        status: update.status,
        errorType: result.errorType,
      });
    }
  }

  /** Process a single batch of due deliveries. Returns the count processed. */
  private async processBatch(batchSize: number, logger: ILogger): Promise<number> {
    const txConn = new DrizzleTransactionalConnection(this.db);
    const now = new Date();

    const claimed = await txConn.withTransaction((tx) =>
      this.deliveries.claimDue(batchSize, now, tx)
    );
    if (claimed.length === 0) return 0;

    const eventIds = [...new Set(claimed.map((c) => c.eventId))];
    const subscriptionIds = [...new Set(claimed.map((c) => c.subscriptionId))];

    const [events, subscriptions] = await Promise.all([
      this.eventLog.getByIds(eventIds),
      this.subscriptions.getManyUnscoped(subscriptionIds),
    ]);
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const subscriptionMap = new Map(subscriptions.map((s) => [s.id, s]));

    for (const attempt of claimed) {
      await this.deliverOne(
        attempt,
        subscriptionMap.get(attempt.subscriptionId),
        eventMap.get(attempt.eventId),
        logger
      );
    }

    return claimed.length;
  }

  /** Drain due webhook deliveries up to the configured batch cap. */
  async drain(logger: ILogger): Promise<number> {
    const { batchSize, maxBatches } = config.jobs.webhookDelivery;
    let total = 0;
    for (let i = 0; i < maxBatches; i++) {
      const processed = await this.processBatch(batchSize, logger);
      total += processed;
      if (processed < batchSize) break;
    }
    if (total > 0) {
      logger.info({ msg: 'Webhook delivery drained attempts', delivered: total });
    }
    return total;
  }
}
