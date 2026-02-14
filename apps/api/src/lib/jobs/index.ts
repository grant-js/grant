// Re-export from @grantjs/jobs — canonical adapter implementations live there
export {
  BullMQJobAdapter,
  Job as BaseJob,
  JobFactory,
  jobRegistry,
  NodeCronJobAdapter,
  type TenantJobPayload,
  validateTenantJobContext,
} from '@grantjs/jobs';

// API-specific Job base class (extends @grantjs/jobs Job with AppContext)
export { Job } from './base/job';

// Re-export types from @grantjs/core
export type {
  EnqueueJobData,
  IJobAdapter,
  JobExecutionContext,
  JobHandler,
  JobResult,
  ScheduledJob,
} from '@grantjs/core';

// Tenant job validation (stays in API — depends on @grantjs/database)
export * from './tenant-job.validation';

// Job initialization (stays in API — depends on @/config, @/jobs)
export * from './initialize';
