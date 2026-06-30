import { config } from '@/config';
import { EVENT_RELAY_JOB_ID } from '@/constants/event-relay.constants';
import type { JobResult, ScheduledJob } from '@/lib/jobs';
import { Job } from '@/lib/jobs/base/job';

import { drainEventRelay } from './event-relay.shared';

/**
 * On-demand event relay (enqueueOnly). Enqueued after a business transaction
 * commits as a latency optimization; the scheduled sweep is the durability
 * guarantee. Drains pending outbox rows to the registered consumers.
 */
export default class EventRelayJob extends Job {
  readonly config: ScheduledJob = {
    id: EVENT_RELAY_JOB_ID,
    schedule: '',
    enabled: config.jobs.eventRelay.enabled,
    enqueueOnly: true,
  };

  async execute(): Promise<JobResult> {
    const relayed = await drainEventRelay(this.appContext, this.logger);
    return { success: true, data: { relayed } };
  }
}
