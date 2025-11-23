export interface ScheduledJob {
  id: string;
  schedule: string; // Cron pattern
  enabled: boolean;
}

export interface JobExecutionContext {
  jobId: string;
  scheduledAt: Date;
  startedAt: Date;
}

export interface JobResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export type JobHandler = (context: JobExecutionContext) => Promise<JobResult>;

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
