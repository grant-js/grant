import { config } from '@/config';
import { EVENT_RELAY_SWEEP_JOB_ID } from '@/constants/event-relay.constants';
import type { JobResult, ScheduledJob } from '@/lib/jobs';
import { Job } from '@/lib/jobs/base/job';

import { drainEventRelay } from './event-relay.shared';

/**
 * Scheduled durability sweep for the event outbox. This is the real delivery
 * guarantee: even if the post-commit enqueue is lost, the sweep eventually
 * claims and dispatches every pending event.
 */
export default class EventRelaySweepJob extends Job {
  readonly config: ScheduledJob = {
    id: EVENT_RELAY_SWEEP_JOB_ID,
    schedule: config.jobs.eventRelay.sweepSchedule,
    enabled: config.jobs.eventRelay.enabled,
  };

  async execute(): Promise<JobResult> {
    const relayed = await drainEventRelay(this.appContext, this.logger);
    return { success: true, data: { relayed } };
  }
}
