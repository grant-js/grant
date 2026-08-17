import { ConfigurationError, type IJobAdapter, type ILoggerFactory } from '@grantjs/core';
import { noopLogger } from '@grantjs/core';

import { BullMQJobAdapter } from './bullmq';
import { NodeCronJobAdapter } from './node-cron';

export type JobProvider = 'node-cron' | 'bullmq';

export interface JobFactoryConfig {
  provider: JobProvider;
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  bullmqJobOptions?: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete: {
      age: number;
    };
    removeOnFail: {
      age: number;
    };
  };
}

/**
 * Factory for creating job adapter instances based on configuration
 * Implements the Strategy Pattern for swappable job scheduling backends
 */
export class JobFactory {
  static createJobAdapter(config: JobFactoryConfig, loggerFactory?: ILoggerFactory): IJobAdapter {
    const mkLogger = (name: string) => loggerFactory?.createLogger(name) ?? noopLogger;

    switch (config.provider) {
      case 'node-cron':
        return new NodeCronJobAdapter(mkLogger('NodeCronJobAdapter'));

      case 'bullmq':
        if (!config.redis) {
          throw new ConfigurationError('Redis configuration is required when using bullmq adapter');
        }
        if (!config.bullmqJobOptions) {
          throw new ConfigurationError('BullMQ job options are required when using bullmq adapter');
        }
        return new BullMQJobAdapter(
          config.redis,
          config.bullmqJobOptions,
          mkLogger('BullMQJobAdapter')
        );

      default:
        throw new ConfigurationError(`Unknown job provider: ${config.provider}`);
    }
  }
}
