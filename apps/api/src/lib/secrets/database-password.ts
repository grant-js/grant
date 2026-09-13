import { AwsRdsIamTokenSigner } from '@grantjs/secrets';

import { config } from '@/config';
import { loggerFactory } from '@/lib/logger';

/**
 * The `password` to hand `initializeDBConnection`, or `undefined` for password auth.
 *
 * `undefined` is the default and every existing deployment: the credential is already in
 * the connection string, either from the environment or overlaid from a secret store
 * (ADR 0004). Returning a *function* under `DB_AUTH_MODE=iam` is what makes IAM auth work
 * with a pool — `postgres.js` calls it during each backend's authentication handshake, so
 * connections opened an hour from now get a token signed then rather than one signed at
 * boot and long expired.
 *
 * Constructed here rather than inside `@grantjs/database` because signing a token needs AWS
 * credentials and an AWS SDK, and the database package is the one piece of the graph that
 * every target compiles — Docker, Kubernetes, a developer laptop. It takes a function and
 * knows nothing about who signs it.
 */
export function resolveDatabasePassword(): (() => Promise<string>) | undefined {
  if (config.db.auth.mode !== 'iam') {
    return undefined;
  }

  const signer = new AwsRdsIamTokenSigner(
    {
      hostname: config.db.auth.iam.hostname,
      port: config.db.auth.iam.port,
      username: config.db.auth.iam.username,
      region: config.db.auth.iam.region,
    },
    loggerFactory.createLogger('RdsIamTokenSigner')
  );

  return signer.getToken;
}
