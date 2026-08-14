# Story brief — Database code-quality follow-ups

## Metadata

- **Slug**: `database-cq-followups`
- **Date**: 2026-08-14
- **Author**: agent (from pass-4 backlog) / human request
- **Status**: approved
- **Parent**: [`plans/2026-08-10-database-code-quality-stack.md`](./2026-08-10-database-code-quality-stack.md) (merged #256)
- **Findings home**: [`docs/contributing/code-quality/database.md` § Backlog](../docs/contributing/code-quality/database.md#backlog)

## Objective

Close the actionable backlog left by pass 4: fix the five characterized-but-unfixed behaviors in `@grantjs/database`, remove `ApiKeyDev`'s dead conditions from `@grantjs/constants`, and resolve (or document) the live Project/Tag permission-condition collision.

## Acceptance criteria

- [ ] `bootstrapDatabase` and `runDemoRefresh` hold advisory locks on a **session-pinned** connection (lock and unlock cannot land on different pool backends).
- [ ] `runDemoRefresh`'s truncate + reseed run inside a transaction so a mid-run failure does not leave an empty database.
- [ ] Connection module: `getDatabase()` names `initializeDBConnection` and throws `ConfigurationError`; empty connection string throws `ConfigurationError`; re-init with a **different** connection string throws instead of silently returning the existing pool; logger is not overwritten on a no-op re-init; a failed `closeDatabase()` clears the singleton so retry can open a new pool.
- [ ] `ensureSystemUser` restores a soft-deleted system user (fixed id cannot be re-inserted); characterization tests updated from CHARACTERIZATION to asserting the new behavior.
- [ ] `ApiKeyDev` Delete/Revoke conditions are `null` (same as Owner/Admin) — dead `resource.createdBy` removed from `@grantjs/constants`.
- [ ] Project/Tag `resource.scope.projects` / `resource.scope.tags` collision traced; either a constants/seed fix lands or a recorded decision explains why current behavior is safe.
- [ ] Pass-4 backlog section updated to mark closed items; characterization tests that pinned old behavior updated.
- [ ] No schema / migration changes.

## Non-goals

- Audit-log table factory (`db:generate` spike) — still its own story.
- Auditing the 79 migration SQL files — needs a new lens.
- Cross-referencing unread tables — later pass method work.
- Widening guardrails to `@grantjs/schema` / adapters — each unit's own first slice.
- Rubric lens-command SQL under-count — rubric method section, not this story.
- Per-group permission conditions (schema change to `group_permissions`) — out of scope.

## Risk flags

- [x] Permissions / RBAC — ApiKeyDev cleanup; Project/Tag collision slice
- [x] Tenancy / RLS / org scoping — advisory lock on bootstrap (every API start); Project scope resolution
- [ ] Auth / sessions / MFA / AAL
- [ ] API keys / tokens — ApiKeyDev constants only (dead config; zero runtime effect today)
- [ ] GDPR export / deletion / PII
- [ ] None of the above

## Suggested active roles

- Project Manager, Principal Engineer, Senior Backend, Senior Security (slices 2 and 5), Senior QA (test updates), Verifier

## Human gate

- [x] Gate 1: Story brief approved — 2026-08-14, via explicit request to implement follow-ups and open PRs.
