import { config } from '@/config';
import { WEBHOOK_DELIVERY_JOB_ID } from '@/constants/webhook-delivery.constants';
import type { JobResult, ScheduledJob } from '@/lib/jobs';
import { Job } from '@/lib/jobs/base/job';

/**
 * Scheduled webhook delivery sweep. Claims due delivery attempts (pending or
 * failed-and-elapsed), signs and POSTs the redacted event envelope, and applies
 * the retry/backoff/DLQ state machine. Runs under the connection owner role so
 * all tenants' deliveries are visible (RLS bypassed).
 */
export default class WebhookDeliveryJob extends Job {
  readonly config: ScheduledJob = {
    id: WEBHOOK_DELIVERY_JOB_ID,
    schedule: config.jobs.webhookDelivery.schedule,
    enabled: config.jobs.webhookDelivery.enabled,
  };

  async execute(): Promise<JobResult> {
    const delivered = await this.appContext.services.webhookDelivery.drain(this.logger);
    return { success: true, data: { delivered } };
  }
}
