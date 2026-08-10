# Story brief — `@grantjs/database` code quality remediation

## Metadata

- **Slug**: `database-code-quality`
- **Date**: 2026-08-10
- **Author**: PM agent (audit pass 4)
- **Status**: pending approval
- **Findings**: [`docs/contributing/code-quality/database.md`](../docs/contributing/code-quality/database.md)

## Objective

Act on the pass-4 audit of `packages/@grantjs/database`: widen the guardrails to this package, land the test harness the audit produced and finish the coverage lens it could not complete, remove one config-level footgun sitting on a destructive operation, and correct two stale `AGENTS.md` claims — without changing any table, column, or migration.

**The most important acceptance criterion is the coverage one.** Lens 7 produced a Tier 0 finding in all three prior passes and was cut short here; this story is where that work actually happens, not a formality.

## Acceptance criteria

- [ ] `eslint.config.mjs` gains a `packages/@grantjs/database/**` scope with the DAG-boundary `no-restricted-imports` rule, following pass 3's template — **and the new rule is proven to fire by planting a violation**, not merely by a green run (pass 3's carried-forward input)
- [ ] `dead-code:database` script wired into CI and `.husky/pre-push` alongside `dead-code:{api,web,core}`; `zod` removed from `package.json` (knip's one finding) so the script lands green
- [ ] The audit's uncommitted test harness lands: `vitest.config.ts`, `src/test-support/fake-db.ts`, `src/grant-rls-login-role.lib.test.ts`, `src/scripts/seed-permissions.test.ts`, and the `test`/`test:coverage` scripts + `vitest` devDependency. **`probe.tmp.ts` is scratch and must be deleted, not committed.** Currently 46/46 passing
- [ ] **Coverage lens completed** — characterization tests for the surfaces the audit could not reach, in risk order: the remaining 3 `src/scripts/` files (**seed idempotency on a second run is the specific question**), `bootstrap.ts` (runs on API startup), `connection/` (including the module-level singleton's re-initialization path), and `demo-refresh.ts`. Any Tier 0 defect surfaced is reported, not silently fixed — characterize first, then decide
- [ ] `drizzle.config.cjs` resolved: deleted, or made to delegate to `resolveDatabaseUrl` rather than duplicating a weaker `process.env.DB_URL` lookup. **Before deleting, confirm no deployment/Docker path invokes it** — "no references" is weak evidence for an auto-discovered config file
- [ ] `AGENTS.md`'s package dependency graph corrected: add `@grantjs/env` (absent entirely) and the `database → @grantjs/constants` edge
- [ ] Tier 3 decisions recorded, code change optional: the `options.env ?? getEnv()` fallback in `grant-rls-login-role.lib.ts` vs. `connection.ts`'s strict injection, and whether the 3 tables without `deletedAt` (`notifications`, `notification_preferences`, `webhook_delivery_attempts`) reflect a deliberate retention policy
- [ ] `CONCEPTS.md`'s `member`/`user` entry gains the physical-table citation (`organization_users`) and a note that reconciling it now costs a migration, not a rename
- [ ] `pnpm --filter @grantjs/database exec tsc --noEmit`, lint, and tests green at every slice; `pnpm --filter grant-api exec tsc --noEmit` re-checked on any slice touching package exports

## Non-goals

- **Any table, column, or migration change.** Nothing in this story alters schema. The `member`/`user` fork is glossary-only per Tier 5; the 3 soft-delete opt-outs get a recorded decision, not a new column.
- **The audit-log table factory (Tier 2.1).** 53 tables × 18 lines diffing to 0 is real, but `drizzle-kit` generates migrations by static analysis and a factory-built table may be invisible to it — failure mode is a missing or destructive migration. If anyone wants this, it is a **spike** (build one factory table, run `db:generate`, diff the emitted SQL) with its own brief, not a slice here.
- **Auditing the 2,772 lines of migration SQL.** No lens covers it; it likely needs its own lens. Recorded as owed, out of scope now.
- **Claiming any table is dead.** `knip` cannot see Drizzle relations or SQL-string references; a real answer needs a different method.
- Widening guardrails to `@grantjs/schema` or the adapter packages — each is that pass's own first slice.

## Risk flags

- [x] **Tenancy / RLS / org scoping** — `grant-rls-login-role.lib.ts` is row-level-security logic, and `db:migrate` runs `grant-rls-login-role.ts` as its second step. Any slice touching RLS or the drizzle config carries a **security-full** bar. The config finding is specifically dangerous because it sits on a destructive operation.
- [x] **Data integrity / destructive operations** — `db:migrate`, `db:reset`, and `demo-refresh.ts` are all destructive. Tests for these must not require, or accidentally reach, a live database; the audit's `fake-db.ts` exists precisely so they don't.
- [ ] Auth / sessions / MFA / AAL
- [ ] API keys / tokens
- [ ] Permissions / RBAC — not blocking; the seed defines system roles/permissions, but this story only characterizes it, changing nothing.
- [ ] GDPR export / deletion / PII

Slices touching RLS or the drizzle config carry `security-full`. Everything else is `light`.

## Suggested active roles

- Project Manager, Principal Engineer
- Senior Backend (guardrails, config, doc corrections)
- **Senior QA — the load-bearing role this story.** Owns completing the coverage lens, especially seed idempotency. This is not a "write some tests" assignment; it is the lens that has found a real bug in every prior pass and it is being run late
- Senior Security (RLS and drizzle-config slices — blocking, independent of the author)
- Architect (the `AGENTS.md` DAG correction)
- Verifier (after each slice)

No Frontend: `apps/web` has zero `@grantjs/database` imports (verified).

## Note on how this brief was produced

Pass 4's three lens agents terminated early on a session limit. Lenses 1–6 were re-run inline and are complete; **lens 7 is genuinely partial**, which is why its completion is an acceptance criterion rather than a backlog item. The absence of a Tier 0 finding in the findings document means "not yet looked hard enough," not "none exist" — treat that as an open question this story closes.

## Human gate

- [ ] Gate 1: Story brief approval pending.
