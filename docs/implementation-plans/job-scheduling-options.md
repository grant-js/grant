# Job Scheduling Options for Data Retention Cleanup

## Overview

The data retention cleanup feature requires scheduled jobs to run periodically (e.g., daily) to permanently delete accounts that have exceeded the retention period. This document outlines the available options for implementing job scheduling in the Grant Platform.

## Requirements

- **Critical Feature:** Data retention cleanup is essential for GDPR compliance
- **Reliability:** Jobs must run even if the server restarts
- **Scalability:** Should work in multi-instance deployments
- **Monitoring:** Need visibility into job execution and failures
- **Existing Infrastructure:** Redis is already available, PostgreSQL database

## Option Comparison

### Option 1: node-cron (Simple In-Process)

**Package:** `node-cron` (or `node-schedule`)

**Pros:**

- ✅ Simple to implement - no external dependencies
- ✅ Lightweight (~50KB)
- ✅ Easy to understand and maintain
- ✅ Good for single-instance deployments
- ✅ No additional infrastructure needed

**Cons:**

- ❌ No job persistence (lost on server restart)
- ❌ No distributed locking (multiple instances = duplicate jobs)
- ❌ Limited monitoring/observability
- ❌ No retry mechanism
- ❌ No job history/audit trail

**Best For:** Single-instance deployments, non-critical jobs, MVP/prototyping

**Implementation:**

```typescript
import cron from 'node-cron';
import { DataRetentionCleanupService } from '@/services/data-retention-cleanup.service';

// In server.ts after server starts
cron.schedule('0 2 * * *', async () => {
  logger.info('Starting data retention cleanup job');
  try {
    await cleanupService.cleanupExpiredAccounts();
    logger.info('Data retention cleanup completed');
  } catch (error) {
    logger.error({ err: error }, 'Data retention cleanup failed');
  }
});
```

**Installation:**

```bash
pnpm add node-cron
pnpm add -D @types/node-cron
```

---

### Option 2: BullMQ with Redis (Recommended)

**Package:** `bullmq`

**Pros:**

- ✅ **Job Persistence:** Jobs stored in Redis, survive restarts
- ✅ **Distributed Locking:** Prevents duplicate execution across instances
- ✅ **Retry Logic:** Built-in retry with exponential backoff
- ✅ **Job Monitoring:** Built-in dashboard (Bull Board) or custom monitoring
- ✅ **Job History:** Track job execution, failures, completion
- ✅ **Scalable:** Works perfectly in multi-instance deployments
- ✅ **Uses Existing Redis:** No additional infrastructure
- ✅ **Priority & Delayed Jobs:** Advanced scheduling features
- ✅ **TypeScript Support:** Excellent TypeScript support

**Cons:**

- ⚠️ Requires Redis (already available ✅)
- ⚠️ Slightly more complex setup
- ⚠️ Additional dependency (~200KB)

**Best For:** Production deployments, multi-instance, critical jobs, scalable systems

**Implementation:**

```typescript
// apps/api/src/jobs/data-retention-cleanup.job.ts
import { Queue, Worker, QueueEvents } from 'bullmq';
import { config } from '@/config';
import { DataRetentionCleanupService } from '@/services/data-retention-cleanup.service';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

// Create queue
export const dataRetentionQueue = new Queue('data-retention-cleanup', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // Keep completed jobs for 7 days
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // Keep failed jobs for 30 days
    },
  },
});

// Create worker
export const dataRetentionWorker = new Worker(
  'data-retention-cleanup',
  async (job) => {
    const cleanupService = new DataRetentionCleanupService(/* ... */);
    await cleanupService.cleanupExpiredAccounts();
    await cleanupService.cleanupExpiredBackups();
    return { success: true, timestamp: new Date().toISOString() };
  },
  {
    connection,
    concurrency: 1, // Only one cleanup at a time
  }
);

// Schedule recurring job (daily at 2 AM)
export async function scheduleDataRetentionCleanup() {
  await dataRetentionQueue.add(
    'cleanup-expired-accounts',
    {},
    {
      repeat: {
        pattern: '0 2 * * *', // Cron pattern
      },
      jobId: 'data-retention-cleanup-daily', // Unique ID prevents duplicates
    }
  );
}

// In server.ts
await scheduleDataRetentionCleanup();
```

**Installation:**

```bash
pnpm add bullmq
```

**Monitoring Dashboard (Optional):**

```bash
pnpm add @bull-board/express @bull-board/api
```

---

### Option 3: pg-cron (PostgreSQL Extension)

**Package:** PostgreSQL extension `pg_cron`

**Pros:**

- ✅ **Database-Native:** Runs directly in PostgreSQL
- ✅ **Reliable:** Database-level scheduling, survives app restarts
- ✅ **No Additional Infrastructure:** Uses existing PostgreSQL
- ✅ **Simple:** SQL-based scheduling

**Cons:**

- ❌ Requires PostgreSQL extension installation
- ❌ Less flexible than application-level solutions
- ❌ Harder to monitor from application
- ❌ Requires database admin access to set up
- ❌ Less control over job execution context

**Best For:** Database-heavy operations, when you want scheduling at DB level

**Implementation:**

```sql
-- Install extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job (runs daily at 2 AM UTC)
SELECT cron.schedule(
  'data-retention-cleanup',
  '0 2 * * *',
  $$
    -- Call a stored procedure or function
    SELECT cleanup_expired_accounts();
  $$
);
```

**Note:** Requires creating a stored procedure/function in PostgreSQL that the application can call, or using `dblink` to call application endpoints.

---

### Option 4: Separate Worker Process

**Pattern:** Separate Node.js process dedicated to running jobs

**Pros:**

- ✅ **Isolation:** Jobs don't affect main API server
- ✅ **Scalability:** Can scale workers independently
- ✅ **Resource Management:** Better control over job resources
- ✅ **Flexibility:** Can use any scheduling library

**Cons:**

- ⚠️ Additional process to manage
- ⚠️ More complex deployment
- ⚠️ Need inter-process communication or shared state

**Best For:** High-load scenarios, when jobs are resource-intensive

**Implementation:**

```typescript
// apps/api-worker/src/index.ts
import { DataRetentionCleanupService } from '@/services/data-retention-cleanup.service';
import cron from 'node-cron';

// Separate process that only runs jobs
cron.schedule('0 2 * * *', async () => {
  await cleanupService.cleanupExpiredAccounts();
});
```

**Deployment:** Run as separate Docker container or PM2 process

---

### Option 5: External Scheduler (Cloud/Infrastructure)

**Options:** Kubernetes CronJob, AWS EventBridge, Google Cloud Scheduler

**Pros:**

- ✅ **Infrastructure-Level:** Managed by platform
- ✅ **Highly Reliable:** Platform handles failures
- ✅ **No Code Changes:** Schedule via infrastructure config
- ✅ **Monitoring:** Platform provides monitoring

**Cons:**

- ❌ Requires cloud/infrastructure setup
- ❌ Less flexible for dynamic scheduling
- ❌ Need to expose HTTP endpoints for jobs
- ❌ Vendor lock-in

**Best For:** Cloud deployments, when infrastructure team manages scheduling

**Implementation (Kubernetes CronJob):**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-retention-cleanup
spec:
  schedule: '0 2 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: grant-api:latest
              command: ['node', 'dist/jobs/cleanup.js']
          restartPolicy: OnFailure
```

---

## Recommendation: BullMQ (Option 2)

**Why BullMQ is the best fit:**

1. **✅ Uses Existing Infrastructure:** Redis is already set up
2. **✅ Production-Ready:** Handles failures, retries, and monitoring
3. **✅ Scalable:** Works in multi-instance deployments
4. **✅ Reliable:** Jobs persist across restarts
5. **✅ Observable:** Built-in job tracking and monitoring
6. **✅ Flexible:** Can add more job types later (email queues, background processing, etc.)

## Implementation Plan: Adapter Pattern (Recommended)

Following the existing adapter pattern used for email, cache, and storage, we'll create a job scheduling adapter system.

### Phase 1: Create Job Adapter Infrastructure

1. **Install Dependencies**

   ```bash
   pnpm add bullmq node-cron
   pnpm add -D @types/node-cron
   ```

2. **Create Job Adapter Interface**

   **File:** `apps/api/src/lib/jobs/job-adapter.interface.ts`

   ```typescript
   export interface ScheduledJob {
     id: string;
     name: string;
     schedule: string; // Cron pattern
     enabled: boolean;
   }

   export interface JobExecutionContext {
     jobId: string;
     jobName: string;
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
   ```

3. **Create Job Factory**

   **File:** `apps/api/src/lib/jobs/job.factory.ts`

   ```typescript
   import { BadRequestError } from '@/lib/errors';
   import { NodeCronJobAdapter } from './adapters/node-cron.adapter';
   import { BullMQJobAdapter } from './adapters/bullmq.adapter';
   import { IJobAdapter } from './job-adapter.interface';

   export type JobProvider = 'node-cron' | 'bullmq';

   export interface JobFactoryConfig {
     provider: JobProvider;
     redis?: {
       host: string;
       port: number;
       password?: string;
     };
   }

   /**
    * Factory for creating job adapter instances based on configuration
    * Implements the Strategy Pattern for swappable job scheduling backends
    */
   export class JobFactory {
     static createJobAdapter(config: JobFactoryConfig): IJobAdapter {
       switch (config.provider) {
         case 'node-cron':
           return new NodeCronJobAdapter();

         case 'bullmq':
           if (!config.redis) {
             throw new BadRequestError(
               'Redis configuration is required when using bullmq adapter',
               'errors:validation.required',
               { field: 'redis' }
             );
           }
           return new BullMQJobAdapter(config.redis);

         default:
           throw new BadRequestError(
             `Unknown job provider: ${config.provider}`,
             'errors:validation.invalid',
             { field: 'provider' }
           );
       }
     }
   }
   ```

4. **Create Adapters**

   **File:** `apps/api/src/lib/jobs/adapters/node-cron.adapter.ts`

   ```typescript
   import cron from 'node-cron';
   import {
     IJobAdapter,
     ScheduledJob,
     JobHandler,
     JobExecutionContext,
     JobResult,
   } from '../job-adapter.interface';
   import { logger } from '@/lib/logger';

   export class NodeCronJobAdapter implements IJobAdapter {
     private jobs: Map<string, cron.ScheduledTask> = new Map();
     private handlers: Map<string, JobHandler> = new Map();

     async schedule(job: ScheduledJob, handler: JobHandler): Promise<void> {
       if (this.jobs.has(job.id)) {
         throw new Error(`Job ${job.id} is already scheduled`);
       }

       if (!job.enabled) {
         logger.info({ jobId: job.id }, 'Job is disabled, skipping schedule');
         return;
       }

       const task = cron.schedule(job.schedule, async () => {
         const context: JobExecutionContext = {
           jobId: job.id,
           jobName: job.name,
           scheduledAt: new Date(),
           startedAt: new Date(),
         };

         try {
           logger.info({ jobId: job.id, jobName: job.name }, 'Starting scheduled job');
           const result = await handler(context);
           logger.info({ jobId: job.id, result }, 'Job completed successfully');
         } catch (error) {
           logger.error({ jobId: job.id, err: error }, 'Job failed');
         }
       });

       this.jobs.set(job.id, task);
       this.handlers.set(job.id, handler);
       logger.info({ jobId: job.id, schedule: job.schedule }, 'Job scheduled');
     }

     async cancel(jobId: string): Promise<void> {
       const task = this.jobs.get(jobId);
       if (task) {
         task.stop();
         this.jobs.delete(jobId);
         this.handlers.delete(jobId);
         logger.info({ jobId }, 'Job cancelled');
       }
     }

     async isScheduled(jobId: string): Promise<boolean> {
       return this.jobs.has(jobId);
     }

     async getScheduledJobs(): Promise<ScheduledJob[]> {
       // Node-cron doesn't track job metadata, return empty array
       return [];
     }

     async trigger(jobId: string): Promise<JobResult> {
       const handler = this.handlers.get(jobId);
       if (!handler) {
         throw new Error(`Job ${jobId} not found`);
       }

       const context: JobExecutionContext = {
         jobId,
         jobName: jobId,
         scheduledAt: new Date(),
         startedAt: new Date(),
       };

       return await handler(context);
     }

     async shutdown(): Promise<void> {
       for (const [jobId, task] of this.jobs.entries()) {
         task.stop();
       }
       this.jobs.clear();
       this.handlers.clear();
       logger.info('Node-cron adapter shut down');
     }
   }
   ```

   **File:** `apps/api/src/lib/jobs/adapters/bullmq.adapter.ts`

   ```typescript
   import { Queue, Worker, QueueEvents } from 'bullmq';
   import {
     IJobAdapter,
     ScheduledJob,
     JobHandler,
     JobExecutionContext,
     JobResult,
   } from '../job-adapter.interface';
   import { logger } from '@/lib/logger';

   interface BullMQConfig {
     host: string;
     port: number;
     password?: string;
   }

   export class BullMQJobAdapter implements IJobAdapter {
     private queue: Queue;
     private workers: Map<string, Worker> = new Map();
     private handlers: Map<string, JobHandler> = new Map();
     private connection: BullMQConfig;

     constructor(config: BullMQConfig) {
       this.connection = config;
       this.queue = new Queue('grant-jobs', {
         connection: config,
         defaultJobOptions: {
           attempts: 3,
           backoff: {
             type: 'exponential',
             delay: 2000,
           },
           removeOnComplete: {
             age: 7 * 24 * 3600, // Keep completed jobs for 7 days
           },
           removeOnFail: {
             age: 30 * 24 * 3600, // Keep failed jobs for 30 days
           },
         },
       });
     }

     async schedule(job: ScheduledJob, handler: JobHandler): Promise<void> {
       if (this.handlers.has(job.id)) {
         throw new Error(`Job ${job.id} is already scheduled`);
       }

       if (!job.enabled) {
         logger.info({ jobId: job.id }, 'Job is disabled, skipping schedule');
         return;
       }

       // Store handler for worker
       this.handlers.set(job.id, handler);

       // Create worker for this job
       const worker = new Worker(
         'grant-jobs',
         async (jobData) => {
           if (jobData.name !== job.id) {
             return; // Not our job
           }

           const context: JobExecutionContext = {
             jobId: job.id,
             jobName: job.name,
             scheduledAt: new Date(jobData.timestamp),
             startedAt: new Date(),
           };

           const handler = this.handlers.get(job.id);
           if (!handler) {
             throw new Error(`Handler not found for job ${job.id}`);
           }

           return await handler(context);
         },
         {
           connection: this.connection,
           concurrency: 1,
         }
       );

       this.workers.set(job.id, worker);

       // Schedule recurring job
       await this.queue.add(
         job.id,
         {},
         {
           repeat: {
             pattern: job.schedule,
           },
           jobId: `grant-job-${job.id}`, // Unique ID prevents duplicates
         }
       );

       logger.info({ jobId: job.id, schedule: job.schedule }, 'Job scheduled with BullMQ');
     }

     async cancel(jobId: string): Promise<void> {
       // Remove repeatable job
       const repeatableJobs = await this.queue.getRepeatableJobs();
       const job = repeatableJobs.find((j) => j.id === `grant-job-${jobId}`);
       if (job) {
         await this.queue.removeRepeatableByKey(job.key);
       }

       // Close worker
       const worker = this.workers.get(jobId);
       if (worker) {
         await worker.close();
         this.workers.delete(jobId);
       }

       this.handlers.delete(jobId);
       logger.info({ jobId }, 'Job cancelled');
     }

     async isScheduled(jobId: string): Promise<boolean> {
       const repeatableJobs = await this.queue.getRepeatableJobs();
       return repeatableJobs.some((j) => j.id === `grant-job-${jobId}`);
     }

     async getScheduledJobs(): Promise<ScheduledJob[]> {
       const repeatableJobs = await this.queue.getRepeatableJobs();
       return repeatableJobs.map((j) => ({
         id: j.id.replace('grant-job-', ''),
         name: j.id.replace('grant-job-', ''),
         schedule: j.cron || '',
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
         jobName: jobId,
         scheduledAt: new Date(),
         startedAt: new Date(),
       };

       return await handler(context);
     }

     async shutdown(): Promise<void> {
       // Close all workers
       await Promise.all(Array.from(this.workers.values()).map((w) => w.close()));
       this.workers.clear();
       this.handlers.clear();

       // Close queue
       await this.queue.close();

       logger.info('BullMQ adapter shut down');
     }
   }
   ```

5. **Create Index File**

   **File:** `apps/api/src/lib/jobs/index.ts`

   ```typescript
   export * from './job-adapter.interface';
   export * from './job.factory';
   ```

6. **Add Configuration**

   **File:** `apps/api/src/config/env.config.ts`

   Add to config:

   ```typescript
   export const JOB_CONFIG = {
     /** Job scheduling provider: 'node-cron' | 'bullmq' */
     provider: getEnvEnum('JOBS_PROVIDER', ['node-cron', 'bullmq'] as const, 'node-cron'),

     /** Redis connection for BullMQ (required if provider is 'bullmq') */
     redis:
       config.cache.strategy === 'redis'
         ? {
             host: config.redis.host,
             port: config.redis.port,
             password: config.redis.password,
           }
         : undefined,
   } as const;
   ```

### Phase 2: Create Data Retention Job

**File:** `apps/api/src/jobs/data-retention-cleanup.job.ts`

```typescript
import { ScheduledJob, JobHandler, JobExecutionContext, JobResult } from '@/lib/jobs';
import { DataRetentionCleanupService } from '@/services/data-retention-cleanup.service';
import { logger } from '@/lib/logger';

export const DATA_RETENTION_JOB_ID = 'data-retention-cleanup';

export function createDataRetentionJob(
  cleanupService: DataRetentionCleanupService,
  schedule: string = '0 2 * * *' // Daily at 2 AM
): ScheduledJob {
  return {
    id: DATA_RETENTION_JOB_ID,
    name: 'Data Retention Cleanup',
    schedule,
    enabled: true,
  };
}

export function createDataRetentionHandler(
  cleanupService: DataRetentionCleanupService
): JobHandler {
  return async (context: JobExecutionContext): Promise<JobResult> => {
    logger.info({ jobId: context.jobId }, 'Starting data retention cleanup job');

    try {
      const accountsDeleted = await cleanupService.cleanupExpiredAccounts();
      const backupsDeleted = await cleanupService.cleanupExpiredBackups();

      logger.info(
        { jobId: context.jobId, accountsDeleted, backupsDeleted },
        'Data retention cleanup completed'
      );

      return {
        success: true,
        data: { accountsDeleted, backupsDeleted },
      };
    } catch (error) {
      logger.error({ jobId: context.jobId, err: error }, 'Data retention cleanup failed');
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}
```

### Phase 3: Initialize Jobs in Server

**File:** `apps/api/src/lib/jobs/initialize.ts`

```typescript
import { JobFactory, IJobAdapter } from './job.factory';
import { config } from '@/config';
import { logger } from '@/lib/logger';
import {
  createDataRetentionJob,
  createDataRetentionHandler,
} from '@/jobs/data-retention-cleanup.job';
import { DataRetentionCleanupService } from '@/services/data-retention-cleanup.service';

let jobAdapter: IJobAdapter | null = null;

export async function initializeJobs(cleanupService: DataRetentionCleanupService): Promise<void> {
  if (!config.jobs?.enabled) {
    logger.info('Job scheduling is disabled');
    return;
  }

  // Create job adapter based on configuration
  jobAdapter = JobFactory.createJobAdapter({
    provider: config.jobs.provider,
    redis: config.jobs.redis,
  });

  // Schedule data retention cleanup job
  const schedule = config.jobs?.dataRetention?.schedule || '0 2 * * *';
  const job = createDataRetentionJob(cleanupService, schedule);
  const handler = createDataRetentionHandler(cleanupService);

  await jobAdapter.schedule(job, handler);

  logger.info(
    {
      provider: config.jobs.provider,
      jobsScheduled: [job.id],
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
```

**Update:** `apps/api/src/server.ts`

```typescript
import { initializeJobs, shutdownJobs } from '@/lib/jobs/initialize';
import { DataRetentionCleanupService } from '@/services/data-retention-cleanup.service';

// After server starts, initialize jobs
if (config.jobs?.enabled) {
  const cleanupService = new DataRetentionCleanupService(/* ... */);
  await initializeJobs(cleanupService);
}

// In graceful shutdown
await shutdownJobs();
```

### Phase 4: Monitoring & Observability

1. **Add Logging**
   - Already integrated in adapters
   - Log job start, completion, failures
   - Uses existing logger

2. **Add Bull Board (Optional, BullMQ only)**

   ```bash
   pnpm add @bull-board/express @bull-board/api
   ```

   - Add dashboard route: `/api/jobs/dashboard`
   - View job status, history, failures
   - Only works with BullMQ adapter

3. **Add Metrics (Optional)**
   - Track job execution time
   - Track success/failure rates
   - Export to monitoring system

### Phase 5: Testing & Validation

1. **Unit Tests**
   - Test job adapter interface
   - Test node-cron adapter
   - Test BullMQ adapter
   - Test job factory

2. **Integration Tests**
   - Test job scheduling
   - Test job execution
   - Test job cancellation
   - Test with Redis (BullMQ)
   - Test job persistence (BullMQ)

3. **Manual Testing**
   - Trigger job manually via adapter
   - Verify cleanup execution
   - Verify job history (BullMQ)
   - Test provider switching

## Alternative: Hybrid Approach

**For MVP/Development:** Start with `node-cron` for simplicity, then migrate to BullMQ for production.

**Migration Path:**

1. Implement with `node-cron` first (quick to implement)
2. Add BullMQ infrastructure in parallel
3. Migrate jobs to BullMQ when ready
4. Remove `node-cron` dependency

## Configuration

Add to `apps/api/src/config/env.config.ts`:

```typescript
export const JOB_CONFIG = {
  /** Enable job scheduling */
  enabled: getEnvBoolean('JOBS_ENABLED', true),

  /** Redis connection for job queues */
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },

  /** Job-specific settings */
  dataRetention: {
    /** Cron pattern for data retention cleanup */
    schedule: getEnv('JOBS_DATA_RETENTION_SCHEDULE', '0 2 * * *'),
    /** Maximum retry attempts */
    maxRetries: getEnvNumber('JOBS_DATA_RETENTION_MAX_RETRIES', 3),
  },
} as const;
```

## File Structure

Following the adapter pattern (same as email, cache, storage):

```
apps/api/src/lib/jobs/
├── job-adapter.interface.ts  # IJobAdapter interface
├── job.factory.ts            # JobFactory for creating adapters
├── index.ts                  # Exports
├── initialize.ts            # Job initialization logic
├── adapters/
│   ├── node-cron.adapter.ts  # Node-cron implementation
│   └── bullmq.adapter.ts     # BullMQ implementation
└── data-retention-cleanup.job.ts  # Data retention job definition

apps/api/src/services/
└── data-retention-cleanup.service.ts  # Cleanup service logic
```

## Configuration

Add to `apps/api/src/config/env.config.ts`:

```typescript
export const JOB_CONFIG = {
  /** Enable job scheduling */
  enabled: getEnvBoolean('JOBS_ENABLED', true),

  /** Job scheduling provider: 'node-cron' | 'bullmq' */
  provider: getEnvEnum('JOBS_PROVIDER', ['node-cron', 'bullmq'] as const, 'node-cron'),

  /** Redis connection for BullMQ (uses existing Redis config if available) */
  redis:
    config.cache.strategy === 'redis'
      ? {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
        }
      : undefined,

  /** Job-specific settings */
  dataRetention: {
    /** Cron pattern for data retention cleanup */
    schedule: getEnv('JOBS_DATA_RETENTION_SCHEDULE', '0 2 * * *'),
  },
} as const;
```

Add to `.env.example`:

```env
# Job Scheduling
JOBS_ENABLED=true
JOBS_PROVIDER=node-cron  # Use 'bullmq' for multi-instance deployments
JOBS_DATA_RETENTION_SCHEDULE=0 2 * * *  # Daily at 2 AM
```

## Benefits of Adapter Pattern

1. **✅ Swappable Implementations:** Switch between node-cron and BullMQ via config
2. **✅ Consistent Interface:** Same API regardless of provider
3. **✅ Development vs Production:** Use node-cron in dev, BullMQ in production
4. **✅ Testing:** Easy to mock adapter interface
5. **✅ Future-Proof:** Can add more adapters (pg-cron, external schedulers) without changing code
6. **✅ Follows Existing Patterns:** Matches email, cache, and storage architecture

## Provider Selection Guide

- **Development/Single Instance:** Use `node-cron` (simpler, no Redis needed)
- **Production/Multi-Instance:** Use `bullmq` (distributed locking, persistence)
- **Switch Anytime:** Change `JOBS_PROVIDER` environment variable

## Next Steps

1. **Implement adapter pattern** (interface + factory + adapters)
2. **Create data retention job** using adapter interface
3. **Add configuration** to env.config.ts
4. **Initialize jobs** in server.ts
5. **Add monitoring/observability**
6. **Test with both providers**
7. **Deploy with appropriate provider** (node-cron for dev, bullmq for production)

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [node-cron Documentation](https://github.com/node-cron/node-cron)
- [PostgreSQL pg_cron](https://github.com/citusdata/pg_cron)
- [Job Scheduling Best Practices](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/)
