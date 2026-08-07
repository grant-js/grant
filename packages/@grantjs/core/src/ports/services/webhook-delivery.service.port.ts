import type { ILogger } from '../logger.port';

/**
 * Drains queued webhook deliveries, applying the retry/backoff state machine
 * and marking exhausted attempts dead.
 *
 * Driven by the webhook-delivery job, not by transport handlers.
 */
export interface IWebhookDeliveryService {
  /**
   * Process queued deliveries until none are due.
   *
   * @returns the number of deliveries attempted in this drain.
   */
  drain(logger: ILogger): Promise<number>;
}
