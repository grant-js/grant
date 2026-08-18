import type {
  EnqueueJobData,
  IJobAdapter,
  ILogger,
  JobExecutionContext,
  JobHandler,
  JobResult,
  ScheduledJob,
} from '@grantjs/core';
import { ConflictError, NotFoundError } from '@grantjs/core';
import cron from 'node-cron';

/** Task type returned by node-cron schedule() (v4 has no namespace export) */
type CronTask = ReturnType<typeof cron.schedule>;

/**
 * Node-cron job adapter for simple in-process scheduling
 * Suitable for single-instance deployments and development
 * Note: Jobs are lost on server restart and duplicate in multi-instance deployments
 */
export class NodeCronJobAdapter implements IJobAdapter {
  private jobs: Map<string, CronTask> = new Map();
  private handlers: Map<string, JobHandler> = new Map();

  constructor(private readonly logger: ILogger) {}

  async schedule(job: ScheduledJob, handler: JobHandler): Promise<void> {
    if (this.handlers.has(job.id)) {
      throw new ConflictError(`Job ${job.id} is already scheduled`, 'Job', 'id');
    }

    if (!job.enabled) {
      this.logger.info({ jobId: job.id }, 'Job is disabled, skipping schedule');
      return;
    }

    // Enqueue-only jobs register the handler so `enqueue()` can dispatch them,
    // but don't bind a recurring cron task.
    if (job.enqueueOnly) {
      this.handlers.set(job.id, handler);
      this.logger.info({ jobId: job.id }, 'Enqueue-only job registered with node-cron');
      return;
    }

    const task = cron.schedule(
      job.schedule,
      async () => {
        const context: JobExecutionContext = {
          jobId: job.id,
          scheduledAt: new Date(),
          startedAt: new Date(),
        };

        try {
          this.logger.info({ jobId: job.id }, 'Starting scheduled job');
          const result = await handler(context);
          this.logger.info({ jobId: job.id, result }, 'Job completed successfully');
        } catch (error) {
          this.logger.error({ jobId: job.id, err: error }, 'Job failed');
        }
      },
      {
        timezone: 'UTC',
      }
    );

    this.jobs.set(job.id, task);
    this.handlers.set(job.id, handler);
    this.logger.info({ jobId: job.id, schedule: job.schedule }, 'Job scheduled');
  }

  async cancel(jobId: string): Promise<void> {
    const task = this.jobs.get(jobId);
    if (task) {
      task.stop();
      this.jobs.delete(jobId);
      this.handlers.delete(jobId);
      this.logger.info({ jobId }, 'Job cancelled');
    }
  }

  async isScheduled(jobId: string): Promise<boolean> {
    return this.jobs.has(jobId);
  }

  async getScheduledJobs(): Promise<ScheduledJob[]> {
    // Node-cron doesn't track job metadata, return empty array
    // Could be enhanced to store metadata separately if needed
    return [];
  }

  async trigger(jobId: string): Promise<JobResult> {
    const handler = this.handlers.get(jobId);
    if (!handler) {
      throw new NotFoundError('Job', jobId);
    }

    const context: JobExecutionContext = {
      jobId,
      scheduledAt: new Date(),
      startedAt: new Date(),
    };

    return await handler(context);
  }

  async enqueue(jobId: string, data?: EnqueueJobData): Promise<JobResult> {
    const handler = this.handlers.get(jobId);
    if (!handler) {
      throw new NotFoundError('Job', jobId);
    }
    const context: JobExecutionContext = {
      jobId,
      scheduledAt: new Date(),
      startedAt: new Date(),
      ...(data?.scope && { scope: data.scope }),
      ...(data?.payload !== undefined && { payload: data.payload }),
    };
    return await handler(context);
  }

  async shutdown(): Promise<void> {
    for (const [jobId, task] of this.jobs.entries()) {
      task.stop();
      this.logger.debug({ jobId }, 'Stopped job');
    }
    this.jobs.clear();
    this.handlers.clear();
    this.logger.info('Node-cron adapter shut down');
  }
}
