---
'grant-api': minor
---

Resolve deployment secrets through a new `ISecretResolver` port instead of reading them from configuration at module scope.

`SECRETS_PROVIDER` defaults to `env`, which reads `process.env` exactly as before — existing deployments are unaffected. Setting it to `aws-secrets-manager` resolves secrets from a single JSON secret per use, falling back to the environment for any key the payload omits, so secrets can move over one at a time.

Because resolution is now per-use rather than once at process start, a rotated secret is picked up within `SECRETS_CACHE_TTL_SECONDS` without a redeploy.

`IGitHubOAuthService.isConfigured()` now returns `Promise<boolean>`, since determining whether GitHub OAuth is configured requires resolving the client secret.
