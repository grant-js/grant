---
'grant-api': patch
---

Add `DB_BOOTSTRAP_ON_BOOT` and a standalone migrate entrypoint.

Migrations and the core seed still run at API start by default, so no existing
deployment changes behavior. Setting `DB_BOOTSTRAP_ON_BOOT=false` skips them, for
deployments that run migrations as a separate step — a Helm hook Job, an ECS one-off
task, or any serverless target where concurrent cold starts must not each attempt to
migrate.

`node dist/migrate.js` is that separate step. It runs the same idempotent,
advisory-locked bootstrap and exits 0 or 1. It exists because
`pnpm --filter @grantjs/database db:migrate` cannot run inside the production image:
that script invokes `drizzle-kit`, a devDependency the runner stage prunes away.

Setting the flag to `false` without running the migrate step will start the API
against an unmigrated database.
