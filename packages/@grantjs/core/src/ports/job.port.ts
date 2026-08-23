import type { Scope } from '@grantjs/schema';

export interface ScheduledJob {
  id: string;
  schedule: string; // Cron pattern (ignored when enqueueOnly is true)
  enabled: boolean;
  /**
   * When true, register the handler so `enqueue()` can dispatch one-off jobs,
   * but skip cron/recurring scheduling. Use for jobs that only ever run on demand.
   */
  enqueueOnly?: boolean;
}

export interface JobExecutionContext {
  jobId: string;
  scheduledAt: Date;
  startedAt: Date;
  /** Set when job is enqueued with tenant context (e.g. from request scope). Scope is tenant type + id. */
  scope?: Scope;
  /** Job-specific payload for enqueued (one-off) jobs. */
  payload?: unknown;
}

export interface JobResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export type JobHandler = (context: JobExecutionContext) => Promise<JobResult>;

/** Data for enqueueing a one-off job (e.g. from a request handler). Scope must come from auth context. */
export interface EnqueueJobData {
  scope?: Scope;
  payload?: unknown;
}

/**
 * Job adapter interface - defines the contract for job scheduling implementations
 * Supports both simple (node-cron) and distributed (BullMQ) scheduling strategies
 */
export interface IJobAdapter {
  /**
   * Register a job's handler and, where the provider owns scheduling, start its
   * recurrence.
   *
   * **Who owns recurrence is provider-dependent, and callers must not assume.**
   * - Node-cron and BullMQ create the recurring timer here, from `job.schedule`.
   * - Providers backed by external schedulers (e.g. EventBridge rules created by
   *   infrastructure) only register the handler; `job.schedule` is documentation
   *   and the recurrence is provisioned outside the application. Calling
   *   `schedule()` on those does not, by itself, cause the job to ever run.
   *
   * Registration is the part every provider does, and is what makes `trigger()`
   * and `enqueue()` able to find the handler.
   *
   * @param job - Job configuration (id, schedule, enabled, enqueueOnly)
   * @param handler - Function to execute when the job runs
   */
  schedule(job: ScheduledJob, handler: JobHandler): Promise<void>;

  /**
   * Enqueue a one-off job (e.g. from a request handler).
   * For tenant-scoped jobs, pass scope from authenticated context only.
   * - BullMQ: adds job to Redis queue, returns immediately; worker runs it asynchronously.
   * - Node-cron: runs the handler synchronously (request waits until job completes); no queue persistence.
   * @param jobId - Registered job id
   * @param data - Optional scope and payload (scope from auth only)
   * @returns BullMQ: void after enqueue. Node-cron: JobResult (runs synchronously).
   */
  enqueue?(jobId: string, data?: EnqueueJobData): Promise<JobResult | void>;

  /**
   * Cancel/remove a scheduled job
   * @param jobId - Unique job identifier
   */
  cancel(jobId: string): Promise<void>;

  /**
   * Check if a job is scheduled
   * @param jobId - Unique job identifier
   */
  isScheduled(jobId: string): Promise<boolean>;

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): Promise<ScheduledJob[]>;

  /**
   * Run a registered job now, in this process, and return its result.
   *
   * This is the execution entry point for a job whose trigger arrived from
   * outside the application — an external scheduler firing, or a queued message
   * being consumed — as well as for manual admin and test invocations.
   *
   * `data` carries the tenant context and payload for those externally delivered
   * executions. **Scope must originate from the enqueueing request's
   * authenticated context**, never from client input; it survives transport as
   * part of the message and is re-validated by the job via
   * `validateTenantJobContext`.
   *
   * Contrast with `enqueue()`, which asks for the job to happen *eventually*,
   * possibly in another process. `trigger()` runs it here and now.
   *
   * @param jobId - Registered job id
   * @param data - Optional scope and payload for this execution
   */
  trigger(jobId: string, data?: EnqueueJobData): Promise<JobResult>;

  /**
   * Shutdown and cleanup job adapter
   */
  shutdown(): Promise<void>;
}
