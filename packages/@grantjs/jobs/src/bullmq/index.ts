import { Job, JobSchedulerJson, Queue, Worker } from 'bullmq';

import type {
  IJobAdapter,
  ILogger,
  JobExecutionContext,
  JobHandler,
  JobResult,
  ScheduledJob,
} from '@grantjs/core';

import type { Scope } from '@grantjs/schema';

interface BullMQConfig {
  host: string;
  port: number;
  password?: string;
}

interface BullMQJobOptions {
  attempts: number;
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete: {
    age: number;
  };
  removeOnFail: {
    age: number;
  };
}

/**
 * BullMQ job adapter for distributed scheduling with Redis
 * Suitable for multi-instance deployments and production environments
 * Provides job persistence, distributed locking, and retry logic
 */
export class BullMQJobAdapter implements IJobAdapter {
  private queue: Queue;
  private workers: Map<string, Worker> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private connection: BullMQConfig;

  constructor(
    config: BullMQConfig,
    jobOptions: BullMQJobOptions,
    private readonly logger: ILogger
  ) {
    this.connection = config;
    this.queue = new Queue('grant-jobs', {
      connection: config,
      defaultJobOptions: {
        attempts: jobOptions.attempts,
        backoff: {
          type: jobOptions.backoff.type,
          delay: jobOptions.backoff.delay,
        },
        removeOnComplete: {
          age: jobOptions.removeOnComplete.age,
        },
        removeOnFail: {
          age: jobOptions.removeOnFail.age,
        },
      },
    });
  }

  async schedule(job: ScheduledJob, handler: JobHandler): Promise<void> {
    if (this.handlers.has(job.id)) {
      throw new Error(`Job ${job.id} is already scheduled`);
    }

    if (!job.enabled) {
      this.logger.info({ jobId: job.id }, 'Job is disabled, skipping schedule');
      return;
    }

    // Store handler for worker
    this.handlers.set(job.id, handler);

    // Create a single worker that handles all jobs (reuse if exists)
    let worker = this.workers.get('main');

    if (!worker) {
      worker = new Worker(
        'grant-jobs',
        async (jobData: Job) => {
          const jobId = (jobData.data as { jobId?: string })?.jobId || jobData.name;

          const handler = this.handlers.get(jobId);
          if (!handler) {
            this.logger.warn({ jobId, jobData: jobData.data }, 'No handler found for job');
            return;
          }

          const data = jobData.data as {
            jobId?: string;
            scope?: Scope;
            payload?: unknown;
          };
          const context: JobExecutionContext = {
            jobId,
            scheduledAt: new Date(jobData.timestamp),
            startedAt: new Date(),
            ...(data.scope && { scope: data.scope }),
            ...(data.payload !== undefined && { payload: data.payload }),
          };

          return await handler(context);
        },
        {
          connection: this.connection,
          concurrency: 1,
        }
      );

      worker.on('completed', (jobData: Job) => {
        this.logger.info({ jobId: jobData.id, name: jobData.name }, 'Job completed');
      });

      worker.on('failed', (jobData: Job | undefined, err: Error) => {
        this.logger.error({ jobId: jobData?.id, name: jobData?.name, err }, 'Job failed');
      });

      this.workers.set('main', worker);
    }

    // upsertJobScheduler is idempotent: it creates or updates the scheduler
    // without producing an immediate catch-up job, which prevents spurious
    // executions during rolling updates / container restarts.
    await this.queue.upsertJobScheduler(
      `grant-job-${job.id}`,
      { pattern: job.schedule },
      { name: job.id, data: { jobId: job.id } }
    );

    this.logger.info({ jobId: job.id, schedule: job.schedule }, 'Job scheduled with BullMQ');
  }

  async cancel(jobId: string): Promise<void> {
    // Remove job scheduler using the new API
    const schedulerId = `grant-job-${jobId}`;
    const removed = await this.queue.removeJobScheduler(schedulerId);
    if (!removed) {
      this.logger.warn({ jobId, schedulerId }, 'Job scheduler not found when trying to cancel');
    }

    // Remove handler (worker is shared, so don't close it)
    this.handlers.delete(jobId);
    this.logger.info({ jobId }, 'Job cancelled');
  }

  async isScheduled(jobId: string): Promise<boolean> {
    const schedulers = await this.queue.getJobSchedulers();
    return schedulers.some((scheduler: JobSchedulerJson) => scheduler.id === `grant-job-${jobId}`);
  }

  async getScheduledJobs(): Promise<ScheduledJob[]> {
    const schedulers = await this.queue.getJobSchedulers();
    return schedulers
      .filter((scheduler: JobSchedulerJson) => scheduler.id) // Filter out schedulers with null/undefined id
      .map((scheduler: JobSchedulerJson) => ({
        id: scheduler.id!.replace('grant-job-', ''), // Non-null assertion after filter
        schedule: scheduler.pattern || '',
        enabled: true,
      }));
  }

  async trigger(jobId: string): Promise<JobResult> {
    const handler = this.handlers.get(jobId);
    if (!handler) {
      throw new Error(`Job ${jobId} not found`);
    }

    const context: JobExecutionContext = {
      jobId,
      scheduledAt: new Date(),
      startedAt: new Date(),
    };

    return await handler(context);
  }

  async enqueue(jobId: string, data?: { scope?: Scope; payload?: unknown }): Promise<void> {
    const handler = this.handlers.get(jobId);
    if (!handler) {
      throw new Error(`Job ${jobId} not found`);
    }
    await this.queue.add(
      jobId,
      {
        jobId,
        scope: data?.scope,
        payload: data?.payload,
      },
      { jobId: `grant-enqueue-${jobId}-${Date.now()}` }
    );
    this.logger.debug({ jobId, hasScope: Boolean(data?.scope) }, 'Job enqueued');
  }

  async shutdown(): Promise<void> {
    // Close all workers
    const workers = Array.from(this.workers.values());
    await Promise.all(workers.map((w) => w.close()));
    this.workers.clear();
    this.handlers.clear();

    // Close queue
    await this.queue.close();

    this.logger.info('BullMQ adapter shut down');
  }
}
