import { config } from '@/config';
import { NOTIFICATION_DELIVERY_JOB_ID } from '@/constants/notification-delivery.constants';
import type { JobResult, ScheduledJob } from '@/lib/jobs';
import { Job } from '@/lib/jobs/base/job';

/**
 * Scheduled email notification delivery sweep. Claims due `email`-channel
 * notifications (pending or failed-and-elapsed), sends them, and applies the
 * retry/backoff/DLQ state machine. Runs under the connection owner role so all
 * recipients' notifications are visible.
 */
export default class NotificationDeliveryJob extends Job {
  readonly config: ScheduledJob = {
    id: NOTIFICATION_DELIVERY_JOB_ID,
    schedule: config.jobs.notificationDelivery.schedule,
    enabled: config.jobs.notificationDelivery.enabled,
  };

  async execute(): Promise<JobResult> {
    const delivered = await this.appContext.services.notificationDelivery.drain(this.logger);
    return { success: true, data: { delivered } };
  }
}
