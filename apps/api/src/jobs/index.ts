import { Job } from '@/lib/jobs/base/job';
import type { AppContext } from '@/types';

import DataRetentionCleanupJob from './data-retention-cleanup.job';
import DemoDbRefreshJob from './demo-db-refresh.job';
import EventRelayJob from './event-relay.job';
import EventRelaySweepJob from './event-relay-sweep.job';
import NotificationDeliveryJob from './notification-delivery.job';
import ProjectSyncJob from './project-sync.job';
import SystemSigningKeyRotationJob from './system-signing-key-rotation.job';
import WebhookDeliveryJob from './webhook-delivery.job';

export type Jobs = ReturnType<typeof createJobs>;

export function createJobs(appContext: AppContext): Job[] {
  return [
    new DataRetentionCleanupJob(appContext),
    new SystemSigningKeyRotationJob(appContext),
    new DemoDbRefreshJob(appContext),
    new ProjectSyncJob(appContext),
    new EventRelayJob(appContext),
    new EventRelaySweepJob(appContext),
    new WebhookDeliveryJob(appContext),
    new NotificationDeliveryJob(appContext),
  ];
}
