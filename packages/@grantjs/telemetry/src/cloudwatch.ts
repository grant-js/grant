// Type-only: erased at compile time, so the optional peer stays optional at runtime
// while the client and its commands are still type-checked. The previous require()
// returned `any`, which is why the hand-rolled client shape below never had to match.
import type { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import type { ILogger, ITelemetryAdapter, TelemetryLogEntry } from '@grantjs/core';
import { ConfigurationError } from '@grantjs/core';

export interface CloudWatchTelemetryConfig {
  region: string;
  logGroupName: string;
  logStreamPrefix?: string;
}

/**
 * CloudWatch Logs telemetry adapter. Sends log entries to a CloudWatch log group.
 * Requires @aws-sdk/client-cloudwatch-logs. Creates log stream per day (logStreamPrefix + YYYY-MM-DD).
 */
export class CloudWatchTelemetryAdapter implements ITelemetryAdapter {
  private readonly config: CloudWatchTelemetryConfig;
  private readonly logger: ILogger;
  private client: CloudWatchLogsClient | null = null;
  private sequenceToken: string | undefined;
  private currentStreamDate: string | null = null;

  constructor(config: CloudWatchTelemetryConfig, logger: ILogger) {
    if (!config.region || !config.logGroupName) {
      throw new ConfigurationError('CloudWatch telemetry requires region and logGroupName');
    }
    this.config = config;
    this.logger = logger;
  }

  // Loaded lazily because @aws-sdk/client-cloudwatch-logs is an optional peer: the
  // package must import cleanly for anyone running TELEMETRY_PROVIDER=none. `await
  // import()` rather than `require()`, which is not defined in an ESM package and
  // made every call here throw ReferenceError.
  private async getClient(): Promise<CloudWatchLogsClient> {
    if (!this.client) {
      try {
        const { CloudWatchLogsClient } = await import('@aws-sdk/client-cloudwatch-logs');
        this.client = new CloudWatchLogsClient({ region: this.config.region });
      } catch (err) {
        this.logger.error({
          msg: 'CloudWatch Logs client not available; install @aws-sdk/client-cloudwatch-logs',
          err,
        });
        throw err;
      }
    }
    return this.client as CloudWatchLogsClient;
  }

  private getLogStreamName(): string {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (date !== this.currentStreamDate) {
      this.currentStreamDate = date;
      this.sequenceToken = undefined;
    }
    const prefix = this.config.logStreamPrefix ?? 'grant-api';
    return `${prefix}-${date}`;
  }

  async sendLog(entry: TelemetryLogEntry): Promise<void> {
    try {
      const client = await this.getClient();
      const { PutLogEventsCommand, CreateLogStreamCommand, DescribeLogStreamsCommand } =
        await import('@aws-sdk/client-cloudwatch-logs');
      const logStreamName = this.getLogStreamName();
      const message = JSON.stringify({
        message: entry.message,
        level: entry.level,
        timestamp: entry.timestamp,
        requestId: entry.requestId,
        ...entry.fields,
      });
      const timestamp = new Date(entry.timestamp).getTime();
      if (Number.isNaN(timestamp) || timestamp <= 0) {
        this.logger.warn({ msg: 'Telemetry: invalid timestamp', entry });
        return;
      }

      if (this.sequenceToken === undefined) {
        try {
          await client.send(
            new CreateLogStreamCommand({
              logGroupName: this.config.logGroupName,
              logStreamName,
            })
          );
        } catch (err: unknown) {
          const code =
            err && typeof err === 'object' && 'name' in err ? (err as { name: string }).name : '';
          if (code !== 'ResourceAlreadyExistsException') {
            this.logger.error({
              msg: 'CloudWatch CreateLogStream failed',
              logStreamName,
              err,
            });
            return;
          }
        }
        try {
          const describe = (await client.send(
            new DescribeLogStreamsCommand({
              logGroupName: this.config.logGroupName,
              logStreamNamePrefix: logStreamName,
              limit: 1,
            })
          )) as { logStreams?: Array<{ uploadSequenceToken?: string }> };
          const stream = describe.logStreams?.[0];
          this.sequenceToken = stream?.uploadSequenceToken ?? undefined;
        } catch (describeErr) {
          this.logger.error({
            msg: 'CloudWatch DescribeLogStreams failed',
            logStreamName,
            err: describeErr,
          });
          return;
        }
      }

      const result = await client.send(
        new PutLogEventsCommand({
          logGroupName: this.config.logGroupName,
          logStreamName,
          logEvents: [
            {
              message,
              timestamp,
            },
          ],
          sequenceToken: this.sequenceToken,
        })
      );
      this.sequenceToken = result.nextSequenceToken;
    } catch (err) {
      this.logger.error({
        msg: 'CloudWatch sendLog failed',
        err,
        logGroupName: this.config.logGroupName,
      });
      this.sequenceToken = undefined;
    }
  }
}
