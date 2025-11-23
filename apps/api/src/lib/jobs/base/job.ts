import { AppContext } from '@/lib/app-context';
import { createModuleLogger } from '@/lib/logger';

import { JobExecutionContext, JobResult, ScheduledJob } from '../job-adapter.interface';

export abstract class Job {
  constructor(protected readonly appContext: AppContext) {}

  abstract readonly config: ScheduledJob;

  protected get logger() {
    return createModuleLogger(this.config.id);
  }

  abstract execute(context: JobExecutionContext): Promise<JobResult>;

  getHandler(): (context: JobExecutionContext) => Promise<JobResult> {
    return async (context: JobExecutionContext): Promise<JobResult> => {
      this.logger.info({ jobId: context.jobId }, `Starting job ${this.config.id}`);

      try {
        const result = await this.execute(context);

        if (result.success) {
          this.logger.info(
            { jobId: context.jobId, data: result.data },
            `Job ${this.config.id} completed successfully`
          );
        } else {
          this.logger.warn(
            { jobId: context.jobId, message: result.message },
            `Job ${this.config.id} completed with warnings`
          );
        }

        return result;
      } catch (error) {
        this.logger.error({ jobId: context.jobId, err: error }, `Job ${this.config.id} failed`);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };
  }
}
