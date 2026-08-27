import type { ILoggerFactory, ISecretResolver } from '@grantjs/core';
import { noopLogger } from '@grantjs/core';

import { AwsSecretsManagerResolver } from './aws-secrets-manager';
import { EnvSecretResolver } from './env';

export type SecretsProvider = 'env' | 'aws-secrets-manager';

export interface SecretsFactoryConfig {
  provider: SecretsProvider;
  awsSecretsManager?: {
    secretId: string;
    region: string;
    endpoint?: string;
    cacheTtlSeconds: number;
  };
}

/**
 * Factory for secret resolvers. Adapters receive ILogger via loggerFactory;
 * they never import @grantjs/logger directly.
 */
export class SecretsFactory {
  static create(config: SecretsFactoryConfig, loggerFactory?: ILoggerFactory): ISecretResolver {
    switch (config.provider) {
      case 'aws-secrets-manager':
        return new AwsSecretsManagerResolver(
          {
            secretId: config.awsSecretsManager?.secretId ?? '',
            region: config.awsSecretsManager?.region ?? 'us-east-1',
            endpoint: config.awsSecretsManager?.endpoint,
            cacheTtlSeconds: config.awsSecretsManager?.cacheTtlSeconds ?? 300,
          },
          loggerFactory?.createLogger('AwsSecretsManagerResolver') ?? noopLogger
        );

      case 'env':
      default:
        return new EnvSecretResolver();
    }
  }
}
