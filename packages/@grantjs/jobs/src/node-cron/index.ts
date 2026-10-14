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

/** How long `shutdown()` waits for jobs accepted by `enqueue()` before giving up on them. */
const SHUTDOWN_DRAIN_TIMEOUT_MS = 10_000;

/**
 * Node-cron job adapter for simple in-process scheduling
 * Suitable for single-instance deployments and development
 * Note: Jobs are lost on server restart and duplicate in multi-instance deployments
 */
export class NodeCronJobAdapter implements IJobAdapter {
  private jobs: Map<string, CronTask> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  /** Handlers dispatched by `enqueue()` that have not finished yet. */
  private readonly inFlight: Map<Promise<void>, string> = new Map();

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

  /**
   * Accept a one-off job and run it in this process **after the current tick**, without
   * awaiting it. `enqueue()` means "accepted", as it does for BullMQ and SQS: request handlers
   * await it before responding, and must not wait for the job body (an event-relay drain, a
   * whole project import). Handler errors are logged here, with the job id and never the
   * payload. Use `trigger()` to run a job and get its result.
   */
  async enqueue(jobId: string, data?: EnqueueJobData): Promise<void> {
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

    const running: Promise<void> = new Promise<void>((resolve) => {
      // setImmediate, not a microtask: the handler starts after the promise chain that is
      // finishing the request has run, so it never competes with the response being sent.
      setImmediate(() => {
        Promise.resolve()
          .then(() => handler(context))
          .then(
            () => {
              this.logger.debug({ jobId }, 'Enqueued job completed');
            },
            (err: unknown) => {
              this.logger.error({ jobId, err }, 'Enqueued job failed');
            }
          )
          .finally(resolve);
      });
    }).finally(() => {
      this.inFlight.delete(running);
    });
    this.inFlight.set(running, jobId);
  }

  /**
   * Stops the cron tasks, then waits (bounded) for jobs `enqueue()` accepted: they are not
   * persisted, so abandoning them loses the work. Jobs still running after the bound are
   * logged by id.
   */
  async shutdown(): Promise<void> {
    for (const [jobId, task] of this.jobs.entries()) {
      task.stop();
      this.logger.debug({ jobId }, 'Stopped job');
    }
    this.jobs.clear();

    if (this.inFlight.size > 0) {
      const jobIds = [...this.inFlight.values()];
      this.logger.info({ jobIds }, 'Waiting for enqueued jobs to finish before shutdown');
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = await Promise.race([
        Promise.allSettled([...this.inFlight.keys()]).then(() => false),
        new Promise<boolean>((resolve) => {
          timer = setTimeout(() => resolve(true), SHUTDOWN_DRAIN_TIMEOUT_MS);
        }),
      ]);
      clearTimeout(timer);
      if (timedOut) {
        this.logger.warn(
          { jobIds: [...this.inFlight.values()] },
          'Enqueued jobs still running at shutdown; they will be abandoned'
        );
      }
    }

    this.handlers.clear();
    this.logger.info('Node-cron adapter shut down');
  }
}
