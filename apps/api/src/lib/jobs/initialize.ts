import type { IJobAdapter } from '@grantjs/core';
import { JobFactory } from '@grantjs/jobs';

import { config } from '@/config';
import { createJobs } from '@/jobs';
import { createLogger, loggerFactory } from '@/lib/logger';
import { AppContext } from '@/types';

const logger = createLogger('JobInitializer');

let jobAdapter: IJobAdapter | null = null;

/**
 * Returns the current job adapter when jobs are enabled. Use this to enqueue
 * one-off jobs from request handlers; always pass scope/tenant from authenticated
 * context (e.g. req.context.scope), never from client input.
 * Returns null when jobs are disabled.
 */
export function getJobAdapter(): IJobAdapter | null {
  return jobAdapter;
}

export async function initializeJobs(appContext: AppContext): Promise<void> {
  if (!config.jobs.enabled) {
    logger.info({ msg: 'Job scheduling is disabled' });
    return;
  }

  jobAdapter = JobFactory.createJobAdapter(
    {
      provider: config.jobs.provider,
      redis: config.jobs.redis,
      aws: config.jobs.provider === 'aws' ? config.jobs.aws : undefined,
      bullmqJobOptions: config.jobs.bullmq,
    },
    loggerFactory
  );

  const jobs = createJobs(appContext);

  if (jobs.length === 0) {
    logger.warn({ msg: 'No jobs found' });
    return;
  }

  const scheduledJobs: string[] = [];
  const skippedJobs: string[] = [];

  for (const job of jobs) {
    // Inject a scoped logger for each job (config.id is available after construction)
    job.setLogger(loggerFactory.createLogger(job.config.id));

    try {
      if (!job.config.enabled) {
        logger.debug({ jobId: job.config.id, msg: 'Job is disabled, skipping' });
        skippedJobs.push(job.config.id);
        continue;
      }

      await jobAdapter.schedule(job.config, job.getHandler());
      scheduledJobs.push(job.config.id);

      logger.debug({ jobId: job.config.id, msg: 'Job scheduled successfully' });
    } catch (error) {
      logger.error({ jobId: job.config.id, err: error, msg: 'Failed to schedule job' });
    }
  }

  logger.info({
    msg: 'Job scheduling initialized',
    provider: config.jobs.provider,
    totalJobs: jobs.length,
    scheduled: scheduledJobs.length,
    skipped: skippedJobs.length,
    jobsScheduled: scheduledJobs,
  });
}

export async function shutdownJobs(): Promise<void> {
  if (jobAdapter) {
    await jobAdapter.shutdown();
    jobAdapter = null;
    logger.info({ msg: 'Job scheduling shut down' });
  }
}
