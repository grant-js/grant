import { BadRequestError } from '@/lib/errors';

import { BullMQJobAdapter } from './adapters/bullmq.adapter';
import { NodeCronJobAdapter } from './adapters/node-cron.adapter';
import { IJobAdapter } from './job-adapter.interface';

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
        if (!config.bullmqJobOptions) {
          throw new BadRequestError(
            'BullMQ job options are required when using bullmq adapter',
            'errors:validation.required',
            { field: 'bullmqJobOptions' }
          );
        }
        return new BullMQJobAdapter(config.redis, config.bullmqJobOptions);

      default:
        throw new BadRequestError(
          `Unknown job provider: ${config.provider}`,
          'errors:validation.invalid',
          { field: 'provider' }
        );
    }
  }
}
