import { AppContext } from '@/lib/app-context';
import { Job } from '@/lib/jobs/base/job';

import DataRetentionCleanupJob from './data-retention-cleanup.job';

export type Jobs = ReturnType<typeof createJobs>;

export function createJobs(appContext: AppContext): Job[] {
  return [new DataRetentionCleanupJob(appContext)];
}
