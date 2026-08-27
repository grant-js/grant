/**
 * Port for resolving deployment secrets that cannot be derived from an
 * instance/task/execution role.
 *
 * Core defines the contract; implementations live in `@grantjs/secrets` (an
 * environment-backed resolver and an AWS Secrets Manager one).
 *
 * Why a port rather than reading `process.env` at module scope: env vars must
 * exist before the first import of `@grantjs/env`, which forces every secret to
 * be materialized at process start. Resolving through this port instead makes
 * lookup lazy and per-use, so a deployment target can fetch a secret when it is
 * first needed rather than requiring a bootstrap step ahead of the entrypoint.
 */
export interface ISecretResolver {
  /**
   * Resolve a secret by its canonical environment-variable name (e.g.
   * `GITHUB_CLIENT_SECRET`). The name is the stable key across every
   * implementation, so callers stay identical on all deployment targets.
   *
   * Returns `undefined` when the secret is not configured — callers decide
   * whether that is fatal. Implementations must not log resolved values.
   */
  resolve(name: string): Promise<string | undefined>;
}
