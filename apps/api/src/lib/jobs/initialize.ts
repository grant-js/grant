import { config } from '@/config';
import { createJobs } from '@/jobs';
import { AppContext } from '@/lib/app-context';
import { createModuleLogger } from '@/lib/logger';

import { IJobAdapter } from './job-adapter.interface';
import { JobFactory } from './job.factory';

const logger = createModuleLogger('JobInitializer');

let jobAdapter: IJobAdapter | null = null;

export async function initializeJobs(appContext: AppContext): Promise<void> {
  if (!config.jobs.enabled) {
    logger.info('Job scheduling is disabled');
    return;
  }

  jobAdapter = JobFactory.createJobAdapter({
    provider: config.jobs.provider,
    redis: config.jobs.redis,
    bullmqJobOptions: config.jobs.bullmq,
  });

  const jobs = createJobs(appContext);

  if (jobs.length === 0) {
    logger.warn('No jobs found');
    return;
  }

  const scheduledJobs: string[] = [];
  const skippedJobs: string[] = [];

  for (const job of jobs) {
    try {
      if (!job.config.enabled) {
        logger.debug({ jobId: job.config.id }, 'Job is disabled, skipping');
        skippedJobs.push(job.config.id);
        continue;
      }

      await jobAdapter.schedule(job.config, job.getHandler());
      scheduledJobs.push(job.config.id);

      logger.debug({ jobId: job.config.id }, 'Job scheduled successfully');
    } catch (error) {
      logger.error({ jobId: job.config.id, err: error }, 'Failed to schedule job');
    }
  }

  logger.info(
    {
      provider: config.jobs.provider,
      totalJobs: jobs.length,
      scheduled: scheduledJobs.length,
      skipped: skippedJobs.length,
      jobsScheduled: scheduledJobs,
    },
    'Job scheduling initialized'
  );
}

export async function shutdownJobs(): Promise<void> {
  if (jobAdapter) {
    await jobAdapter.shutdown();
    jobAdapter = null;
    logger.info('Job scheduling shut down');
  }
}
