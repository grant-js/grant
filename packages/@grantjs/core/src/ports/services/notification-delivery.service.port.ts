import type { ILogger } from '../logger.port';

/**
 * Drains queued notification deliveries, applying the retry/backoff state
 * machine to each attempt.
 *
 * Driven by the notification-delivery job, not by transport handlers.
 */
export interface INotificationDeliveryService {
  /**
   * Process queued deliveries until none are due.
   *
   * @returns the number of deliveries attempted in this drain.
   */
  drain(logger: ILogger): Promise<number>;
}
