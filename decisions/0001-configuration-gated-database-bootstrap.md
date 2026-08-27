# 0001 — Boot-time database bootstrap becomes configuration-gated

- **Status**: Accepted
- **Date**: 2026-08-25
- **Context**: phase B of the AWS serverless target
  (`plans/2026-08-21-aws-lambda-runtime-brief.md`)

## Context

`createApp()` calls `bootstrapDatabase()` before the app is returned — migrations,
the RLS role grant, and the core seed, all inside a PostgreSQL session advisory lock.

That call carries a decision recorded in a comment, and it was a deliberate one:

> Sole migrate/seed path for Kubernetes (no Helm hook Job); PostgreSQL advisory lock
> is safe for multiple replicas.

It is a good decision for the deployment it was written for. A Helm hook Job is a
separate object with its own failure mode, its own RBAC, and its own ordering
problem. Folding migration into container start means a replica cannot serve traffic
against a schema it has not migrated, and the advisory lock makes the race across
replicas a non-issue. Nothing about that reasoning has stopped being true.

It does not survive a serverless target:

1. **Concurrent cold starts.** Lambda scales by starting containers in parallel. Ten
   simultaneous cold starts means ten processes contending for one advisory lock,
   nine of them blocked inside the request that triggered them. The lock keeps the
   database correct and makes latency unpredictable.
2. **Migrations do not fit an invocation.** A long migration against a large table
   can exceed the function timeout. A migration interrupted at the timeout leaves
   Drizzle's history table and the schema disagreeing, on a code path reached by an
   ordinary user request.
3. **Least privilege.** Migrating requires DDL. Every Lambda invocation would need a
   role that can `ALTER TABLE`, permanently, to cover a case that applies to the
   first invocation after a deploy.

## Decision

`bootstrapDatabase()` at boot is gated on **`DB_BOOTSTRAP_ON_BOOT`, defaulting to
`true`**. The call site and its behavior are otherwise unchanged.

A standalone entrypoint, `apps/api/src/migrate.ts` → `node dist/migrate.js`, runs the
same `bootstrapDatabase()` and exits 0 or 1.

This **reverses the "no Helm hook Job" half** of the original decision — the option
now exists — while leaving its default intact. Kubernetes deployments that change
nothing behave exactly as before.

The standalone runner exists because `pnpm --filter @grantjs/database db:migrate`
**cannot run in the production image**: it shells out to `drizzle-kit`, a
devDependency, and the runner stage installs production dependencies only
(`apps/api/Dockerfile:68`). `bootstrapDatabase()` uses `drizzle-orm`'s migrator,
which is a real dependency. Anyone reaching for the package script in a container
will find it missing; that is the trap this entrypoint removes.

## Consequences

**Good.** The serverless target gets a migrate step that runs once per deploy under a
DDL-capable role, while invocations run under a role that needs no DDL. `migrate.js`
is also the natural ECS one-off task and Helm hook Job entrypoint if a Kubernetes
operator ever wants one.

**Bad, and this is the real cost.** A second way to be wrong now exists: setting
`DB_BOOTSTRAP_ON_BOOT=false` and forgetting to run the migrate step starts an API
against an unmigrated database. The failure is not a clean boot error — it is
whatever query first hits a missing column, at request time. The gate is one boolean
away from a foot-gun, which is precisely why the default is `true` and why the
serverless deployment (phase C) must wire the migrate step and the flag **together**,
never the flag alone.

**Neutral.** Both paths take the same advisory lock, so a boot-time bootstrap and a
standalone run cannot corrupt each other during a rollout that mixes them.

## Alternatives considered

**Leave the call in the entrypoint and let the Lambda handler skip it.** Rejected:
the two paths would silently diverge in database-readiness semantics with nothing
observing the difference. A configuration flag makes the divergence a stated,
reviewable choice instead of a property of which file you happened to start.

**Always bootstrap, and accept lock contention on cold start.** Rejected on
consequence 2 — correctness, not latency. An interrupted migration is a worse outcome
than a slow start.

**Detect Lambda at runtime (`AWS_LAMBDA_FUNCTION_NAME`) and skip automatically.**
Rejected. It makes behavior depend on ambient environment rather than stated
configuration, and it silently does the right thing for one runtime while giving
every other serverless host the wrong default. The program's guiding constraint is
that capabilities are selected by configuration.
