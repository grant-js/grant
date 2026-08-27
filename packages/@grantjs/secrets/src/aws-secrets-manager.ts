import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import type { ILogger, ISecretResolver } from '@grantjs/core';
import { ConfigurationError } from '@grantjs/core';

export interface AwsSecretsManagerResolverConfig {
  /** Secret ID or ARN. The stored value must be a JSON object of `ENV_NAME: value`. */
  secretId: string;
  region: string;
  /** Override for LocalStack; unset uses the real endpoint. */
  endpoint?: string;
  /**
   * How long a fetched payload is reused before being refetched. This is the
   * rotation window: a rotated secret is picked up within this many seconds
   * without redeploying, because resolution is per-use rather than per-process.
   */
  cacheTtlSeconds: number;
}

/**
 * Resolves secrets from one AWS Secrets Manager entry holding a JSON object
 * keyed by environment-variable name.
 *
 * Names absent from the payload fall back to `process.env`, so a deployment can
 * move secrets into Secrets Manager one at a time; enabling this resolver with
 * an empty payload behaves identically to {@link EnvSecretResolver}.
 *
 * Credentials come from the default AWS credential chain — an execution or task
 * role supplies them and no static key reaches this adapter.
 */
export class AwsSecretsManagerResolver implements ISecretResolver {
  private readonly client: SecretsManagerClient;
  private cached: { payload: Record<string, string>; expiresAtMs: number } | null = null;
  /** Concurrent cold-start requests share one fetch instead of each issuing their own. */
  private inFlight: Promise<Record<string, string>> | null = null;

  constructor(
    private readonly config: AwsSecretsManagerResolverConfig,
    private readonly logger: ILogger
  ) {
    if (!config.secretId) {
      throw new ConfigurationError(
        'AWS Secrets Manager resolver requires a secret ID (SECRETS_AWS_SECRET_ID)'
      );
    }
    this.client = new SecretsManagerClient({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    });
  }

  async resolve(name: string): Promise<string | undefined> {
    const payload = await this.getPayload();
    const value = payload[name] ?? process.env[name];
    return value ? value : undefined;
  }

  private async getPayload(): Promise<Record<string, string>> {
    if (this.cached && Date.now() < this.cached.expiresAtMs) {
      return this.cached.payload;
    }
    this.inFlight ??= this.fetchPayload().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async fetchPayload(): Promise<Record<string, string>> {
    const response = await this.client.send(
      new GetSecretValueCommand({ SecretId: this.config.secretId })
    );

    if (!response.SecretString) {
      // Binary secrets carry no key names, so there is nothing to resolve against.
      throw new ConfigurationError(
        `Secret '${this.config.secretId}' has no SecretString; a JSON object of ENV_NAME: value is required`
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.SecretString);
    } catch {
      // Deliberately does not include the value or the parse error, either of
      // which can echo secret material into logs.
      throw new ConfigurationError(
        `Secret '${this.config.secretId}' is not valid JSON; a JSON object of ENV_NAME: value is required`
      );
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new ConfigurationError(
        `Secret '${this.config.secretId}' must be a JSON object of ENV_NAME: value`
      );
    }

    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') {
        payload[key] = value;
      }
    }

    this.cached = {
      payload,
      expiresAtMs: Date.now() + this.config.cacheTtlSeconds * 1000,
    };

    // Key names only — never values, and never a count that could be correlated
    // with a specific rotation.
    this.logger.info({
      msg: 'Loaded secrets from AWS Secrets Manager',
      secretId: this.config.secretId,
      keys: Object.keys(payload).sort(),
    });

    return payload;
  }
}
