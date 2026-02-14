import type { ILogger, JobExecutionContext, JobResult, ScheduledJob } from '@grantjs/core';

/** Silent fallback when no logger is injected */
const noop = () => {};
const noopLogger: ILogger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => noopLogger,
};

export abstract class Job {
  abstract readonly config: ScheduledJob;

  /** Logger instance — set by the subclass constructor or the registry */
  protected logger: ILogger = noopLogger;

  /** Allow external injection of a logger (e.g. from a factory) */
  setLogger(logger: ILogger): void {
    this.logger = logger;
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
