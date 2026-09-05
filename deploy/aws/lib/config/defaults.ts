/**
 * Environment defaults for the AWS target.
 *
 * The Helm chart's equivalent is the `config:` block in `values.yaml`. Parity with
 * it is an acceptance criterion: an adopter should not have to read source to learn
 * which settings this target needs.
 *
 * Every key here is a strategy phases A and B added as *additional* options —
 * nothing is replaced, and each one still defaults to its previous value in
 * `@grantjs/env`. What this file does is pick the AWS-appropriate option per key, in
 * one reviewable place, with the reason attached.
 */

import type { GrantEnv } from './props';

export const AWS_TARGET_ENV_DEFAULTS: GrantEnv = {
  NODE_ENV: 'production',

  // Phase B, ADR 0001. Concurrent Lambda cold starts must not each attempt to
  // migrate, and migrations do not fit a request-scoped invocation. The stack runs
  // `node dist/migrate.js` as a deploy-time one-shot instead.
  DB_BOOTSTRAP_ON_BOOT: 'false',

  // Phase A. DynamoDB rather than Redis, so a green-field deploy needs no
  // ElastiCache cluster. An adopter with an existing cluster overrides this with
  // `redis` and the REDIS_* keys.
  CACHE_STRATEGY: 'dynamodb',

  // S3 rather than local disk: a Lambda's filesystem is ephemeral and per-container.
  // This also drops the /storage route, which apps/api mounts only for the local
  // provider (apps/api/src/create-app.ts:157).
  STORAGE_PROVIDER: 's3',

  // Phase B, slice 7. Embedded Metric Format needs no SDK, no log-stream sequence
  // token, and nothing flushed before a freeze — none of which the pull-scraped
  // /metrics endpoint can offer on a frozen container.
  TELEMETRY_PROVIDER: 'emf',

  // Phase B, ADR 0004. Resolved per use through ISecretResolver, so a rotated secret
  // is picked up within the TTL rather than at the next redeploy.
  SECRETS_PROVIDER: 'aws-secrets-manager',

  // Phase B. A buffered batch is not delayed on a freezing container, it is lost —
  // and the spans lost are disproportionately those of the slowest requests.
  TRACING_SPAN_PROCESSOR: 'simple',

  // Prometheus pull-scraping has no analogue on Lambda; EMF above replaces it.
  METRICS_ENABLED: 'false',

  // The Lambda Web Adapter reads this to know where the app listens.
  API_PORT: '4000',

  // One execution environment serves one request at a time, so a pool larger than
  // this is never drawn on — it only reserves connections the cluster could give to
  // another environment. With pooling off by default (a proxy forfeits auto-pause),
  // every warm environment holds its own connections straight to Aurora. This value
  // times the function's reserved concurrency is what bounds a burst; see
  // `compute/api-function.ts` for the arithmetic against Aurora's max_connections.
  DB_POOL_MAX: '2',

  // Phase B. `node-cron` schedules timers inside the process, and a Lambda execution
  // environment is frozen between invocations and destroyed when idle — so a timer
  // fires only while the container happens to be thawed. That is what this target did
  // until the jobs function existed, and it is why scheduled work here was not
  // dependable. Under `aws` the adapter registers handlers and creates no timer:
  // recurrence is the six EventBridge rules, and one-off work goes over the queue.
  JOBS_PROVIDER: 'aws',

  // The Function URL answers the internet, so the shared secret CloudFront attaches is
  // the only thing in front of the origin. Required here means a secret that goes
  // missing refuses every request instead of quietly admitting everyone — the control
  // that replaces IAM must not be disableable by absence.
  SECURITY_ORIGIN_VERIFY_REQUIRED: 'true',
};
