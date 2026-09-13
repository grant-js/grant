import type { ILogger } from '@grantjs/core';
import { ConfigurationError } from '@grantjs/core';

export interface AwsRdsIamTokenConfig {
  /** Database endpoint the token is signed for. Must match what the client connects to. */
  hostname: string;
  port: number;
  /** Database user, which must have been granted `rds_iam`. */
  username: string;
  region: string;
}

/**
 * Signs RDS IAM authentication tokens, for use as `DatabaseConfig.password`.
 *
 * An IAM token replaces a stored database password with a short-lived signature derived
 * from the caller's own role — so there is no credential to rotate, leak, or put in a
 * secret store. The trade is that it expires in about 15 minutes, which is why
 * `DatabaseConfig.password` takes a function: `postgres.js` calls it during each backend's
 * authentication handshake, so every new connection gets a fresh token while existing ones
 * are unaffected.
 *
 * **Three conditions have to hold for a token to be accepted, and none of them is this
 * adapter's to check:**
 *
 *   1. the database has IAM authentication enabled;
 *   2. the connecting user was granted `rds_iam` in Postgres;
 *   3. the caller's role holds `rds-db:connect` on
 *      `arn:aws:rds-db:<region>:<account>:dbuser:<resourceId>/<username>`.
 *
 * Any of them missing looks identical from here — a password failure at connect time. The
 * supported combinations are tabulated in `docs/deployment/aws-serverless.md`.
 *
 * `hostname` is load-bearing: the token is signed *for an endpoint*, so a token signed for
 * the cluster endpoint is rejected by the proxy and vice versa. That is the trap behind
 * "IAM auth is only reachable with the proxy or with RDS IAM on the cluster directly" —
 * they are different endpoints and need different tokens.
 */
export class AwsRdsIamTokenSigner {
  constructor(
    private readonly config: AwsRdsIamTokenConfig,
    private readonly logger?: ILogger
  ) {
    if (!config.hostname || !config.username) {
      throw new ConfigurationError(
        'RDS IAM authentication requires a hostname and a username. A token is signed for ' +
          'one endpoint and one user, so neither can be inferred.'
      );
    }
  }

  /**
   * A fresh token, deliberately uncached.
   *
   * Caching would save an SDK call per connection and introduce the one bug this exists to
   * avoid: a cached token handed to a connection opened just before its expiry. Signing is
   * local — `rds-signer` computes a SigV4 signature and makes no network request — so the
   * call is cheap and the cache would buy nothing worth its risk.
   */
  public readonly getToken = async (): Promise<string> => {
    let sdk: typeof import('@aws-sdk/rds-signer');
    try {
      // Lazy, and for the same reason as the ECS client in `@grantjs/jobs`: this module is
      // reachable from the package barrel, `@aws-sdk/rds-signer` is an optional peer
      // dependency, and a static import would crash every deployment that has not
      // installed it merely by loading `@grantjs/secrets`.
      sdk = await import('@aws-sdk/rds-signer');
    } catch (error) {
      throw new ConfigurationError(
        'RDS IAM authentication requires the optional peer dependency ' +
          '`@aws-sdk/rds-signer`, which is not installed.',
        error instanceof Error ? error : undefined
      );
    }

    const signer = new sdk.Signer({
      hostname: this.config.hostname,
      port: this.config.port,
      username: this.config.username,
      region: this.config.region,
    });

    const token = await signer.getAuthToken();
    this.logger?.debug({
      msg: 'Signed an RDS IAM auth token',
      hostname: this.config.hostname,
      username: this.config.username,
      // Never the token. It is a bearer credential for the database, and a debug log is
      // exactly where one should not appear.
      length: token.length,
    });
    return token;
  };
}
