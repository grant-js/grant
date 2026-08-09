# Story brief — `@grantjs/core` code quality remediation

## Metadata

- **Slug**: `core-code-quality`
- **Date**: 2026-08-09
- **Author**: PM agent (audit pass 3)
- **Status**: approved (2026-08-09, Ale Heredia)
- **Findings**: [`docs/contributing/code-quality/core.md`](../docs/contributing/code-quality/core.md)

## Objective

Act on the pass-3 audit of `packages/@grantjs/core`: lock in the package DAG boundary (currently 100% clean, currently unguarded), fix the one correctness bug the coverage lens surfaced, correct two stale `AGENTS.md` claims, delete an unreachable "backward-compatible" port barrel, and land the mechanical Tier 2/3 cleanups — without changing any port's public shape beyond what's explicitly called out below.

## Acceptance criteria

- [ ] `eslint.config.mjs` gains a `packages/@grantjs/core/**` (or `packages/@grantjs/**`, if sized generously) scope banning `@grantjs/{cache,storage,email,jobs,logger,errors,database}` imports — the boundary is clean today, so this is a pure guardrail add, not a migration
- [ ] A `dead-code:core` script (or `dead-code:packages`) wired into CI and the pre-push hook alongside the existing `dead-code:api`/`dead-code:web`, using the `packages/@grantjs/*` `knip.json` entry that's already configured but unused
- [ ] `src/errors/grant-exception.test.ts` (currently uncommitted from the audit, 22 tests, 100% line coverage on `grant-exception.ts`) lands as part of this story, not carried as a loose change
- [ ] 0.1 decided and fixed: `NotFoundError`'s constructor distinguishes "no id" from "empty-string id" (`id !== undefined` instead of the current truthy check), with the characterization test updated to assert the corrected behavior
- [ ] `AGENTS.md` corrected: `IStorageAdapter`→`IFileStorageService`, `IEmailAdapter`→`IEmailService`; the workflow-step-4 sentence instructing contributors to maintain `ports/service.port.ts` removed
- [ ] `ports/service.port.ts` deleted (zero importers, unreachable via `package.json`'s `exports` map — verified dead, not just unused)
- [ ] `AAL_RANK` (`core/aal.ts`) loses its `export` keyword
- [ ] `GrantException`'s 12 subclasses stop hand-writing `this.name = 'X'`; the base constructor sets it once via `new.target.name`
- [ ] `types/index.ts`'s `GrantService` interface is deleted; its 3 internal consumers (`core/grant.ts`, `token-manager.ts`, `permission-checker.ts`) and their 3 test files import `IGrantService` from `ports/services/grant.service.port` instead
- [ ] `ports/services/webhook-subscription.service.port.ts`'s hand-rolled `WebhookDeliveryPage` is replaced with the codegen'd `@grantjs/schema` type of the same name
- [ ] `ports/services/user.service.port.ts`'s `DeleteParams` declaration is deleted; its 9 cross-domain importers and 8 internal usages re-point to `ports/repositories/common.ts`
- [ ] `AuthorizationError`'s constructor is reordered to `(message?, reason?, metadata?, originalError?)` so `originalError` is last like its 11 siblings; the 3 call sites currently passing an explicit `undefined` placeholder (`mfa-graphql-guard.ts:65`, `min-aal-at-login.ts:91,198`) are updated in the same commit
- [ ] `CONCEPTS.md` gains: the `IOrganizationUserService`/`IOrganizationMemberService` port-layer citations added to the existing member/user table, and a new naming-convention entry recording `get`=primary-key/`find`=secondary-key as the intended (mostly-followed) distinction — no method renamed this story
- [ ] `pnpm --filter @grantjs/core exec tsc --noEmit`, lint, and unit tests green at every slice; `pnpm --filter grant-api exec tsc --noEmit` also re-checked on any slice touching a port/exception signature, since every change here is consumed by `apps/api`

## Non-goals

- Collapsing the 5 `I*TagRepository` interfaces into a generic base — the audit sized this honestly: the only extraction that doesn't rename ~200 call sites across `apps/api` is a new generic-method-name pattern this codebase doesn't use anywhere else. Worth a human appetite call at stack-plan time, but not assumed as in-scope work here.
- Backporting the 3 missing `I*TagRepository` methods to `IAccountTagRepository`/`IOrganizationTagRepository`/`IProjectTagRepository`, or adding the missing `transaction?` parameter to `getProjectTagIntersection` — both are real, both ship alongside the Tier 2 decision above if it's taken, not independently.
- Renaming any `find*By*`/`get*By*` method — CONCEPTS.md records the convention; 54 call sites across `apps/api` implement these interfaces, so a rename is its own story with its own risk assessment, per the rubric's Tier 5 rule.
- Fixing `apps/api/src/types/common.ts`'s third `DeleteParams` declaration — outside this pass's package boundary, flagged for whoever next touches `apps/api`'s own types.
- Widening guardrails to `packages/@grantjs/database`, `@grantjs/schema`, or the adapter packages — that's each of those passes' own first slice, not this one's.
- Bringing `packages/@grantjs/server` into scope over its `AuthenticationError`/`AuthorizationError`/etc. naming collision — it's a standalone published SDK with no dependency on `@grantjs/core`, outside this pass's DAG.

## Risk flags

- [x] Auth / sessions / MFA / AAL — `AuthorizationError`'s constructor is called directly from `apps/api/src/lib/authorization/mfa-graphql-guard.ts` and `min-aal-at-login.ts`; the acceptance-criteria reorder is non-behavioral (same values, new positions) but touches a constructor signature used across every AAL/MFA enforcement path in the app, and `NotFoundError`'s fix changes message text on a class thrown ~30+ places. Both slices should carry the `security-full` bar even though neither is a design change to auth logic itself.
- [ ] API keys / tokens
- [ ] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC — not blocking, but flagging: `IOrganizationUserService`/`IOrganizationMemberService` are cited in the `CONCEPTS.md` update; no port shape changes, documentation only.
- [ ] GDPR export / deletion / PII

Only the `NotFoundError` and `AuthorizationError` slices carry a blocking `security-full` bar. Everything else in this story is `light`.

## Suggested active roles

- Project Manager, Principal Engineer
- Senior Backend (all implementation slices — this is domain/port-layer TypeScript, the closest analog to `apps/api`'s own backend work)
- Senior Security (the `NotFoundError` and `AuthorizationError` slices — blocking, independent review per the `security-full` rule)
- Senior QA (regression coverage for both Tier 0/decide-then-fix items; owns the residual `grant.ts`/`token-manager.ts` branch-coverage backlog noted in `core.md`'s Tier 6, not required this story)
- Architect (the guardrail-widening slice, and the two `AGENTS.md` doc corrections — the same role that owns `apps/api`'s own layering doc)
- Verifier (after each slice)

No Frontend: `apps/web` does not depend on `@grantjs/core` for anything this pass touches (`AGENTS.md`'s one documented exception — `permissionConditionSchema` — is untouched by every finding above).

## Human gate

- [x] Gate 1: Story brief approved — 2026-08-09, Ale Heredia. Stack planning may proceed.
