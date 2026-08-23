import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type {
  EnqueueJobData,
  IJobAdapter,
  ILogger,
  JobExecutionContext,
  JobHandler,
  JobResult,
  ScheduledJob,
} from '@grantjs/core';
import { ConflictError, NotFoundError, ValidationError } from '@grantjs/core';
import type { Scope } from '@grantjs/schema';

export interface AwsJobConfig {
  region: string;
  /** Queue that carries one-off jobs enqueued by `enqueue()`. */
  queueUrl: string;
  /** Override for LocalStack or a VPC endpoint. */
  endpoint?: string;
  /**
   * Omit both to use the SDK's default credential chain — the expected
   * production path, where a task or Lambda role supplies credentials.
   */
  accessKeyId?: string;
  secretAccessKey?: string;
}

/** Wire format for a queued job. Written by `enqueue()`, read by `parseJobMessage()`. */
export interface JobMessage {
  jobId: string;
  scope?: Scope;
  payload?: unknown;
}

/**
 * Parse an SQS message body into a job id and its execution context.
 *
 * The counterpart to `enqueue()`, and the entry point a queue consumer uses
 * before calling `trigger()`. Exported because the consumer is a different
 * process from the enqueuer — leaving the format implicit would mean two
 * hand-written copies of it that can drift apart silently.
 */
export function parseJobMessage(body: string): { jobId: string; data: EnqueueJobData } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new ValidationError(
      'Job message body is not valid JSON',
      [],
      error instanceof Error ? error : undefined
    );
  }

  if (parsed == null || typeof parsed !== 'object') {
    throw new ValidationError('Job message body must be an object');
  }

  const message = parsed as Partial<JobMessage>;
  if (typeof message.jobId !== 'string' || message.jobId.trim() === '') {
    throw new ValidationError('Job message must include a non-empty jobId');
  }

  return {
    jobId: message.jobId,
    data: {
      ...(message.scope && { scope: message.scope }),
      ...(message.payload !== undefined && { payload: message.payload }),
    },
  };
}

/**
 * AWS job adapter: SQS for one-off jobs, an external scheduler for recurring ones.
 *
 * **`schedule()` does not schedule anything here.** Recurrence is owned by
 * EventBridge rules created by infrastructure, not by this process, so
 * `schedule()` only registers the handler — see `IJobAdapter.schedule`. That is
 * what makes an inbound event or queue message resolvable to a handler by id.
 *
 * The execution path is therefore split across two processes: one enqueues, the
 * other consumes and calls `trigger()`. Both register the same jobs at startup,
 * because they run the same codebase.
 */
export class AwsJobAdapter implements IJobAdapter {
  private readonly client: SQSClient;
  private readonly queueUrl: string;
  private readonly handlers: Map<string, JobHandler> = new Map();
  private readonly configs: Map<string, ScheduledJob> = new Map();

  constructor(
    config: AwsJobConfig,
    private readonly logger: ILogger
  ) {
    this.queueUrl = config.queueUrl;
    this.client = new SQSClient({
      region: config.region,
      ...(config.endpoint && { endpoint: config.endpoint }),
      ...(config.accessKeyId &&
        config.secretAccessKey && {
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        }),
    });
  }

  async schedule(job: ScheduledJob, handler: JobHandler): Promise<void> {
    if (this.handlers.has(job.id)) {
      throw new ConflictError(`Job ${job.id} is already scheduled`, 'Job', 'id');
    }

    if (!job.enabled) {
      this.logger.info({ jobId: job.id }, 'Job is disabled, skipping registration');
      return;
    }

    this.handlers.set(job.id, handler);
    this.configs.set(job.id, job);

    this.logger.info(
      { jobId: job.id, schedule: job.schedule || undefined, enqueueOnly: job.enqueueOnly },
      job.enqueueOnly
        ? 'Enqueue-only job registered with AWS adapter'
        : 'Recurring job registered with AWS adapter; recurrence is provisioned externally'
    );
  }

  /**
   * Hand the job to SQS. Returns once the message is accepted, not once the job
   * has run — the consumer may be another process entirely.
   */
  async enqueue(jobId: string, data?: EnqueueJobData): Promise<void> {
    if (!this.handlers.has(jobId)) {
      // Enqueuer and consumer run the same codebase and register the same jobs,
      // so an unknown id here is a mistake worth catching before it becomes an
      // unroutable message sitting in a dead-letter queue.
      throw new NotFoundError('Job', jobId);
    }

    const message: JobMessage = {
      jobId,
      ...(data?.scope && { scope: data.scope }),
      ...(data?.payload !== undefined && { payload: data.payload }),
    };

    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
      })
    );

    this.logger.debug({ jobId }, 'Job enqueued to SQS');
  }

  async trigger(jobId: string, data?: EnqueueJobData): Promise<JobResult> {
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

    return handler(context);
  }

  /**
   * Unregisters the handler. **The external schedule is untouched** — this
   * process cannot delete an EventBridge rule it did not create, and should not
   * hold the permission to. Events keep arriving; they simply no longer resolve
   * to a handler. Use it to stop work in this process, not to stop the trigger.
   */
  async cancel(jobId: string): Promise<void> {
    if (this.handlers.delete(jobId)) {
      this.configs.delete(jobId);
      this.logger.warn(
        { jobId },
        'Job handler unregistered; any external schedule for it remains active'
      );
    }
  }

  async isScheduled(jobId: string): Promise<boolean> {
    return this.handlers.has(jobId);
  }

  async getScheduledJobs(): Promise<ScheduledJob[]> {
    return Array.from(this.configs.values());
  }

  async shutdown(): Promise<void> {
    this.client.destroy();
    this.handlers.clear();
    this.configs.clear();
    this.logger.info('AWS job adapter shut down');
  }
}
