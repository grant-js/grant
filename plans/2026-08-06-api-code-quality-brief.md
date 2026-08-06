# Story brief — API code quality remediation

## Metadata

- **Slug**: `api-code-quality`
- **Date**: 2026-08-06
- **Author**: PM agent (audit pass 1)
- **Status**: approved (2026-08-06, Ale Heredia)
- **Findings**: [`docs/contributing/code-quality/api.md`](../docs/contributing/code-quality/api.md)

## Objective

Act on the pass-1 audit of `apps/api`: fix three correctness bugs, close the guardrail gaps that `AGENTS.md` already documents, add lint rules so the closed gaps stay closed, and collapse the largest blocks of hand-copied scaffolding — without changing any public contract.

## Acceptance criteria

- [ ] All three Tier 0 bugs fixed, each with a regression test
- [ ] `@/lib/errors` re-exports the four missing domain errors, making the import rule followable
- [ ] Zero domain-error imports from `@grantjs/core` outside `lib/errors/`
- [ ] Zero raw `throw new Error(` in `apps/api/src`
- [ ] Request-scoped code logs through `context.requestLogger`; dead logger fields removed
- [ ] Every service has an `I*Service` port under `ports/services/`
- [ ] Magic URLs, TTLs, and page-size defaults moved into `config/env.config.ts`; the 10-vs-50 default-limit conflict resolved
- [ ] Lint rules land for: floating promises, the import table, the layer DAG, dead exports
- [ ] Dead exports removed; orphaned REST schemas either wired to a route or deleted
- [ ] Tier 2 helpers extracted with **no change to handler-facing method names** and no net behaviour change
- [ ] Pagination has one documented implementation
- [ ] `project-import` and `project-sync-job` validate CDM payloads with zod at the service boundary
- [ ] `pnpm --filter grant-api exec tsc --noEmit`, unit, integration, and `pnpm test:e2e` all green at every slice

## Non-goals

- Renaming anything on the public contract — `organizationMembers`, the JWKS `/org/:orgId/prj/:projectId/` path, the `'org-prj-'` key prefix, and the REST sync vocabulary stay as they are. [`CONCEPTS.md`](../CONCEPTS.md) records them; changing them is its own story.
- Introducing base classes or codegen for the CRUD layers. Abstractions in this story are **helpers existing classes opt into**.
- Unifying the `organization-users` / `organization-members` dual stack.
- Backfilling the missing domain events (`tag.*`, `project.created`, `user.created`) — that changes what consumers observe and needs its own decision.
- Rewriting `rest/openapi/` (8,197 lines). Its size is noted; restructuring it is out of scope.

## Risk flags

- [x] Auth / sessions / MFA / AAL — slice 2 touches `auth.routes.ts` and `rest/utils/auth.ts` logging; slice 5 touches authorization-result cache invalidation
- [x] API keys / tokens — `api-keys.service.ts` error imports; signing-key cache invalidation
- [x] Tenancy / RLS / org scoping — slice 5 refactors `CacheHandler`, which resolves every scoped ID set
- [x] Permissions / RBAC — same
- [ ] GDPR export / deletion / PII

Slices 5 and 8 carry the real risk. `CacheHandler` decides what every caller is allowed to see, and slice 8 adds a validation boundary to externally-supplied CDM payloads.

## Suggested active roles

- Project Manager, Principal Engineer
- Senior Backend (all implementation slices)
- Senior Security (slices 5 and 8 — blocking)
- Senior QA (slice 9, plus regression tests in slice 1)
- Verifier (after each slice)

No Frontend: `apps/web` is untouched by this story and gets its own audit pass.

## Human gate

- [x] Gate 1: Story brief approved — 2026-08-06. Stack planning may proceed.
