import { ConfigurationError } from '@grantjs/core';

import { LocalConfig, LocalStorageAdapter } from './local';
import { S3Config, S3StorageAdapter } from './s3';

import type { IFileStorageService, ILogger, ILoggerFactory } from '@grantjs/core';

export type StorageProvider = 'local' | 's3';

export interface StorageFactoryConfig {
  provider: StorageProvider;
  local?: LocalConfig;
  s3?: S3Config;
}

/** Silent fallback when no logger factory is provided */
const noop = () => {};
const noopLogger: ILogger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => noopLogger,
};

/**
 * Factory for creating file storage service instances based on configuration
 */
export class StorageFactory {
  static createStorageService(
    config: StorageFactoryConfig,
    loggerFactory?: ILoggerFactory
  ): IFileStorageService {
    switch (config.provider) {
      case 'local':
        if (!config.local) {
          throw new ConfigurationError(
            'Local storage configuration is required when using local adapter'
          );
        }
        return new LocalStorageAdapter(
          config.local,
          loggerFactory?.createLogger('LocalStorageAdapter') ?? noopLogger
        );

      case 's3':
        if (!config.s3) {
          throw new ConfigurationError('S3 configuration is required when using s3 adapter');
        }
        return new S3StorageAdapter(
          config.s3,
          loggerFactory?.createLogger('S3StorageAdapter') ?? noopLogger
        );

      default:
        throw new ConfigurationError(`Unknown storage provider: ${config.provider}`);
    }
  }
}
