# 0004 — Resolve secrets through a port, not a bootstrap preload

- **Status**: Accepted
- **Date**: 2026-08-26
- **Context**: phase B of the AWS serverless target
  (`plans/2026-08-21-aws-lambda-runtime-brief.md`), slice 5
- **Supersedes**: the story brief's mechanism "fetch → write `/tmp/.env` → set
  `GRANT_ENV_FILE` → `await import()` the app"

## Context

`@grantjs/env` loads on first import and caches the parsed result frozen
(`packages/@grantjs/env/src/index.ts:15-31`). Every secret therefore has to exist in
`process.env` _before the first module in the graph imports it_.

With the handler entrypoint the brief assumed, that was easy: fetch secrets, then
`await import()` the app. ADR 0003 removed the handler — the AWS target runs
`dist/server.js` unchanged — so there is no longer a place to stand between "process
starts" and "application loads".

## Decision

**Secrets are resolved through an `ISecretResolver` port at the point of use, not
materialized into the environment before boot.**

- `packages/@grantjs/core/src/ports/secret.port.ts` defines the port.
- `@grantjs/secrets` provides two adapters: `EnvSecretResolver` (reads `process.env`;
  the default, and byte-identical to previous behavior) and `AwsSecretsManagerResolver`
  (one JSON secret, TTL-cached, credentials from the default AWS credential chain).
- `SECRETS_PROVIDER` selects between them and defaults to `env`.

## Why not the alternatives

**A `--import` preload** that fetches secrets and writes `/tmp/.env` works — Node
settles top-level `await` in an `--import` module before evaluating the main entry,
which was verified on Node 24.14.0 rather than assumed. It was rejected because it is
Lambda-shaped: it solves an ordering problem that only exists because resolution is
eager, and it leaves rotation fighting the frozen `getEnv()` cache. The port removes
the ordering problem instead of scheduling around it.

**Lambda environment variables from CDK** (`{{resolve:secretsmanager:...}}`) put
plaintext into `GetFunctionConfiguration` and the console, and rotation requires a
redeploy.

**The AWS Parameters and Secrets Lambda Extension** is distributed as a layer ARN.
Layers do not apply to container images, and it is not published as an ECR image the
way the Web Adapter is, so adopting it would mean extracting a layer zip at build time.

**An EFS-mounted `.env`** needs no code at all — `GRANT_ENV_FILE` already handles it
(`packages/@grantjs/env/src/load-env.ts:50-57`). Rejected for the VPC coupling and
cold-start cost, not for correctness. It remains available.

## Consequences

**The set of secrets needing resolution is much smaller than the env schema suggests.**
`STORAGE_S3_*`, `CACHE_DYNAMODB_*` and `JOBS_AWS_*` are already documented as
intentionally blank so the execution role supplies them
(`packages/@grantjs/env/src/schema.ts:132-134`). Only two keys are read through the
port today: `AUTH_MFA_SECRET_ENCRYPTION_KEY` and `GITHUB_CLIENT_SECRET`.

**`IGitHubOAuthService.isConfigured()` became async.** Determining whether GitHub OAuth
is configured requires resolving the client secret. Four handler call sites now await
it, and `IProjectOAuthProvider.getAuthorizeUrl` widened to `string | Promise<string>`
so a provider that resolves a secret can be async while the email provider stays
synchronous.

**Adoption is incremental.** `AwsSecretsManagerResolver` falls back to `process.env`
for any key the payload omits, so enabling it with an empty secret behaves exactly like
`EnvSecretResolver`, and keys move over one at a time.

**Rotation is bounded by `SECRETS_CACHE_TTL_SECONDS` (default 300).** This resolves
blocker 6 from the stack plan: the frozen `getEnv()` cache no longer pins secret values
for the life of the process, because secret values no longer pass through it.

## Notes for the security review

- `GITHUB_CLIENT_SECRET` was previously used to construct an `Octokit` instance in the
  `GitHubOAuthService` constructor. That instance was only ever read as a
  configured-ness flag — every GitHub call builds its own client from the user's access
  token — so it is now a direct predicate and the client-secret-authed client is gone.
- The resolver logs key names only, never values, and rejects a non-JSON payload
  without echoing it.
- **Pre-existing, unrelated, and worth fixing separately:**
  `printConfigSummary()` logs `DB_CONFIG.url.split('@')[1]`
  (`apps/api/src/config/env.config.ts:981`). `split('@')[1]` is the segment between the
  first and second `@`, so a password containing a raw `@` puts a fragment of itself
  into the log line.
