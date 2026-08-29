/**
 * The secret the platform itself reads.
 *
 * There are **two** secrets in this stack with different shapes, and conflating them
 * is the trap this construct exists to avoid:
 *
 *   - The cluster's generated credentials, shaped by RDS as
 *     `{ username, password, host, port, dbname, engine }`. RDS Proxy authenticates
 *     with it. The application cannot read it — the shape is not env.
 *   - This one, a JSON object of `ENV_NAME: value`, which is the only shape
 *     `AwsSecretsManagerResolver` accepts (`packages/@grantjs/secrets/src/aws-secrets-manager.ts:92`).
 *     `SECRETS_AWS_SECRET_ID` points here.
 *
 * `DB_URL` is composed here rather than derived from `POSTGRES_*` at runtime, because
 * `resolveDatabaseUrl` (`@grantjs/env`) builds a URL with no SSL parameter and the
 * proxy requires TLS. Composing it is the only place the `sslmode` can be attached.
 */

import { SecretValue } from 'aws-cdk-lib';
import { type ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface PlatformSecretProps {
  /** The cluster's RDS-shaped credentials, read to compose `DB_URL`. */
  readonly databaseCredentials: ISecret;

  /** Proxy endpoint, so pooled connections are used rather than the cluster directly. */
  readonly host: string;
  readonly port: number;
  readonly databaseName: string;

  /** Extra `ENV_NAME: value` pairs. Merged after the defaults, so a caller wins. */
  readonly extraEnv?: Readonly<Record<string, string>>;
}

export class PlatformSecret extends Construct {
  public readonly secret: Secret;

  constructor(scope: Construct, id: string, props: PlatformSecretProps) {
    super(scope, id);

    const username = props.databaseCredentials.secretValueFromJson('username').unsafeUnwrap();
    const password = props.databaseCredentials.secretValueFromJson('password').unsafeUnwrap();

    // `unsafeUnwrap` names a real hazard, but not this use. It renders a
    // `{{resolve:secretsmanager:…}}` dynamic reference into the template, which
    // CloudFormation resolves at deploy time — the plaintext is never in the
    // template, the synthesized output, or CDK context. The destination is another
    // Secrets Manager secret, so the value never leaves that boundary.
    //
    // sslmode=require: postgres.js maps it to `rejectUnauthorized = false`
    // (`postgres/src/connection.js:283`), so the hop is encrypted but the server
    // certificate is not verified. That defeats passive interception, not an active
    // in-VPC MITM; `verify-full` would need the RDS CA bundle shipped in the image,
    // which it does not carry. Recorded rather than silently accepted.
    const dbUrl = `postgresql://${username}:${password}@${props.host}:${props.port}/${props.databaseName}?sslmode=require`;

    this.secret = new Secret(this, 'Secret', {
      description: 'Grant platform environment — JSON of ENV_NAME: value',
      secretObjectValue: {
        DB_URL: SecretValue.unsafePlainText(dbUrl),
        ...Object.fromEntries(
          Object.entries(props.extraEnv ?? {}).map(([key, value]) => [
            key,
            SecretValue.unsafePlainText(value),
          ])
        ),
      },
    });
  }
}
