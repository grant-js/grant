import type { Scope } from '@grantjs/schema';

export interface ScheduledJob {
  id: string;
  schedule: string; // Cron pattern
  enabled: boolean;
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
   * Schedule a recurring job
   * @param job - Job configuration (id, name, schedule)
   * @param handler - Function to execute when job runs
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
   * Trigger a job manually (for testing/admin)
   * @param jobId - Unique job identifier
   */
  trigger(jobId: string): Promise<JobResult>;

  /**
   * Shutdown and cleanup job adapter
   */
  shutdown(): Promise<void>;
}
