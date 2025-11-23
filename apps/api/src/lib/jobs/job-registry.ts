import { createModuleLogger } from '@/lib/logger';

import { JobHandler, ScheduledJob } from './job-adapter.interface';

const logger = createModuleLogger('JobRegistry');

/**
 * Registered job definition
 */
export interface RegisteredJob {
  /** Job configuration */
  job: ScheduledJob;
  /** Job handler function */
  handler: JobHandler;
}

/**
 * Job Registry - Central registry for all scheduled jobs
 *
 * Jobs register themselves using `registerJob()`, and the registry
 * can be queried to discover and schedule all registered jobs.
 *
 * This pattern allows:
 * - Jobs to be defined in separate modules
 * - Jobs to declare their dependencies
 * - Easy testing (mock registry)
 * - Dynamic job discovery
 */
class JobRegistry {
  private jobs: Map<string, RegisteredJob> = new Map();

  /**
   * Register a job with the registry
   * @param registeredJob - Job definition with handler and dependencies
   * @throws Error if job with same ID is already registered
   */
  register(registeredJob: RegisteredJob): void {
    if (this.jobs.has(registeredJob.job.id)) {
      throw new Error(`Job with ID '${registeredJob.job.id}' is already registered`);
    }

    this.jobs.set(registeredJob.job.id, registeredJob);
    logger.debug({ jobId: registeredJob.job.id }, 'Job registered');
  }

  /**
   * Get all registered jobs
   */
  getAll(): RegisteredJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get a specific job by ID
   */
  get(jobId: string): RegisteredJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Check if a job is registered
   */
  has(jobId: string): boolean {
    return this.jobs.has(jobId);
  }

  /**
   * Clear all registered jobs (useful for testing)
   */
  clear(): void {
    this.jobs.clear();
  }

  /**
   * Get count of registered jobs
   */
  size(): number {
    return this.jobs.size;
  }
}

// Singleton instance
export const jobRegistry = new JobRegistry();
