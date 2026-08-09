# Story brief — Web code quality remediation

## Metadata

- **Slug**: `web-code-quality`
- **Date**: 2026-08-08
- **Author**: PM agent (audit pass 2)
- **Status**: approved (2026-08-08, Ale Heredia)
- **Findings**: [`docs/contributing/code-quality/web.md`](../docs/contributing/code-quality/web.md)

## Objective

Act on the pass-2 audit of `apps/web`: fix three correctness bugs (one security-relevant), commit the in-pass Vitest fix that unblocked component testing, widen the `apps/api`-scoped guardrails to `apps/web`, and collapse the largest blocks of hand-copied CRUD scaffolding — without changing any component's public props or user-visible behavior beyond what the bug fixes require.

## Acceptance criteria

- [ ] All three Tier 0 bugs fixed, each with a regression test:
  - 0.1 `SessionRestoreGate` no longer silently re-authenticates after `clearAuth()` when the refresh cookie was never revoked
  - 0.2 The six RBAC list viewers surface `error` from their query hook instead of rendering a permission-denied response as an empty list
  - 0.3 `use-tags.ts` returns the server's `hasNextPage`; `use-paginated-tags.ts` stops recomputing it independently
- [ ] `apps/web/vitest.config.ts` (JSX fix) and `session-restore-gate.test.tsx` — currently uncommitted from the audit — land as part of this story, not carried as loose changes
- [ ] `eslint.config.mjs` gains an `apps/web/**` scope: at minimum the hooks-only data-fetching boundary (4 real bypass sites out of ~130+ files that touch entity data) and the import-discipline rules that make sense for the frontend
- [ ] `knip --workspace apps/web` (already configured, already clean) is wired into CI/pre-push the same way `dead-code:api` is, so the currently-clean state is locked in
- [ ] Confirmed-dead surface removed: 5 superseded `editXSchema`/`XEditFormValues` pairs, `button-group.tsx`, `carousel.tsx` (+ `embla-carousel-react`), `styles/tokens.ts` (or `tailwind.config.ts`'s inline duplicate — pick one and delete the other), 4 more unused dependencies, `@testing-library/user-event`, the stray `eslint-config-next` entry
- [ ] Tier 2 helpers land where sized against the call site with no behavior change: `usePaginationProps` (14 sites, 6→2 lines each) at minimum; store/hook factories evaluated after opening the two hardest instances (`tags.store.ts`'s extra fields, its divergent URL-parsing) rather than assumed
- [ ] Tier 3 style questions get an explicit decision, recorded in `CONCEPTS.md` or inline, even where the code doesn't change this story: URL-synced pagination on the 4 stores missing it, `tags.store.ts`'s URL-parsing style, whether `apps/web` adopts a raw-error/`console.*` convention, whether the one `@grantjs/core` import should route through `@grantjs/schema` instead
- [ ] `pnpm --filter grant-web exec tsc --noEmit`, lint, and unit tests green at every slice

## Non-goals

- Renaming the "workspace" UI term — it never reaches the contract; a doc note is enough, not a rename.
- Translating the 252 missing German i18n keys the audit found — that's a content gap for the doc/i18n owner, not a code-quality fix, and it isn't a defect in the pattern the way the Tier 0–4 findings are.
- Collapsing the detail-scoped stores (`group.store.ts`, `role.store.ts`, `user.store.ts`, etc.) — the audit did not verify these are near-identical the way the list stores are; sizing that work is its own look.
- Deciding whether `apps/web` needs a formal domain-exception hierarchy analogous to `apps/api`'s `GrantException` tree — bigger design conversation than this story, noted as a Tier 3 open question only.
- "Fixing" the two borderline bypass sites (`mfa-step-up-dialog.tsx`'s second Apollo client, `notification-bell.tsx`'s imperative preview query) unless the stack plan decides they're actually wrong — both have a plausible rationale the audit didn't reject outright.
- Widening guardrails to `packages/` — that's a later pass's first slice, not this one's.

## Risk flags

- [x] Auth / sessions / MFA / AAL — 0.1 is `SessionRestoreGate`, the app's only client-side auth gate; no `middleware.ts` exists anywhere in `apps/web`, so this component alone decides whether protected content renders
- [ ] API keys / tokens
- [ ] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC — not checked as blocking, but flagging: 0.2 touches how six RBAC list viewers surface permission-denied responses. No data exposure risk (the current bug fails toward _less_ information, not more), but whoever takes that slice should stay aware they're changing error-surfacing behavior on RBAC-scoped queries, not just wiring up a missing UI state.
- [ ] GDPR export / deletion / PII

Only the slice touching 0.1 carries a blocking `security-full` bar. Everything else in this story is `light`.

## Suggested active roles

- Project Manager, Principal Engineer
- Senior Frontend (all implementation slices)
- Senior Security (the 0.1 slice — blocking, independent of whoever writes the fix, per the `security-full` rule pass 1 had to relearn: author-gathered evidence does not satisfy this bar)
- Senior QA (regression tests for all three Tier 0 bugs; owns extending coverage past `SessionRestoreGate` per the Tier 6 backlog — `lib/apollo-client.ts` is the next-highest-risk untested surface)
- Architect (only for the slice that turns the hooks-only pattern into a written/lint-enforced boundary — there's no existing doc to extend, unlike `apps/api`'s `AGENTS.md`)
- Verifier (after each slice)

No Backend: this story doesn't touch `apps/api`, `@grantjs/schema`, or any contract. If 0.1's fix turns out to need a server-side session-revocation change (one of the two options the findings doc leaves open), that's scope creep into a Backend slice and should be caught at stack-plan time, not assumed here.

## Human gate

- [x] Gate 1: Story brief approved — 2026-08-08, Ale Heredia. Stack planning may proceed.
