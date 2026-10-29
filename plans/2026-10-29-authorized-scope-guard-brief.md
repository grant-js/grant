# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Grounded on `origin/main` at `af6c102f` (package version **v1.19.0**). Story shape: **pure API bug** (activation matrix in `docs/contributing/agentic-sdlc.md`): Backend + QA + Security + Verifier, one slice unless the client audit (criterion 5) forces a second. This file states the fix and its tests; per `SECURITY.md` the full analysis stays out of the public repository until the release, and the release notes or a security advisory disclose it afterwards.

## Metadata

- **Slug**: `authorized-scope-guard`
- **Date**: 2026-10-29
- **Author** (human / PM agent): PM agent (Claude, for Alejandro)
- **Status**: draft

## Objective

A scoped operation acts only in the scope the request was authorized in. Today a session request is authorized against the scope `scope-extractor` reads from the request (`x-scope-tenant` / `x-scope-id` headers first, then `scopeId` + `tenant` or `scope` query parameters, then `body.scope`, then GraphQL `variables.scope` / `variables.input.scope`), while the handler acts on the scope carried in the operation's own input (`input.scope`, `body.scope`). Nothing checks that the two agree. This story adds that check once, in the two transport guards, so that every scoped mutation and query — the roughly sixty inputs and query arguments that carry a `scope: Scope!` field — is covered without per-handler code, refuses `system` as a request-supplied tenant, and ships as a patch release (v1.19.1).

## Acceptance criteria

- [ ] **One generic guard in the transport layer, not per-handler checks.** `authorizeGraphQLResolver` (`apps/api/src/lib/authorization/graphql-guard.ts`) and `authorizeRestRoute` (`apps/api/src/lib/authorization/rest-guard.ts`) compare the scope the operation acts on with the authorized scope (`context.user.scope`, as the guard already reads it) and throw `AuthorizationError('Forbidden')` (REST: 403, code `FORBIDDEN`, the same body shape the guards use today) when they differ in `tenant` or `id`. The check runs **before** the resource resolver and before `isAuthorized`, so a refused request does neither a lookup nor a permission evaluation and the error does not say whether the target exists. "The scope the operation acts on" is, for GraphQL, `args.input.scope` or `args.scope` **from the resolver arguments** (inline literal arguments in the document never appear in `variables`, so reading `req.body` would miss them); for REST, `req.body.scope`, `req.body.input.scope` and the `scope` / `scopeId` + `tenant` query parameters. An operation whose arguments carry no scope is unaffected. Tenant and id are compared after `scope-extractor`'s `validated()` normalisation, so an unknown tenant in the input fails as it does on the request.
- [ ] **Covered by default, with the exceptions listed.** A unit test walks the executable schema (`makeExecutableSchema` as `sdl-contract.test.ts` does) and, for every `Mutation` and `Query` field whose arguments carry a `scope` (directly, or inside its input type), asserts that the registered resolver is wrapped by the guard. A second test does the same for every REST route whose zod schema has a `scope` field (`apps/api/src/rest/schemas/*.ts`): it must be mounted behind `authorizeRestRoute`. Operations that legitimately take a scope without an authorized one (candidates: `exchangeApiKey`, `createOrganization` under a personal account, auth flows) go in an explicit allowlist **in the test**, each with a one-line reason; the PR body repeats that list. A new scoped mutation that is not wrapped fails the test.
- [ ] **`system` is never a request-supplied tenant.** `scope-extractor.validated()` (`scope-extractor.ts:20-25`) treats `Tenant.System` from headers, query or body as absent (today `KNOWN_TENANTS` admits it, and `context.middleware.ts:98` then applies no RLS context for it). The system scope is constructed in code only (`SYSTEM_SCOPE` in `apps/api/src/lib/events/drizzle-event-publisher.ts`, `apps/api/src/constants/system.constants.ts`). The PR states what, if anything, legitimately sent `system` from a request (tests, CLI, `@grantjs/client`) and how `TokenType.System` tokens keep working: their scope comes from the token (`packages/@grantjs/core/src/core/grant.ts:78`), not from the request.
- [ ] **Token types behave as documented.** For `TokenType.Session` the authorized scope is the request scope; for `ApiKey`, `ProjectApp` and `System` it is the token's scope (`grant.ts:78`). The guard therefore also refuses an API-key request whose input names a scope other than the key's — the PR states this in the changeset and a test covers it.
- [ ] **Tests.** Unit, per transport: match → resolver/route runs; mismatch in `id` → refused, resource resolver and `isAuthorized` not called; mismatch in `tenant` → refused; no scope in the input → unchanged; GraphQL inline-literal `input.scope` that differs from the headers → refused. E2E (`apps/api/tests/e2e/`, needs Docker: host or desktop lane, state in the PR body whether it ran): a session user who is Owner of organization A sends organization-A scope headers and an input scope naming a project of organization B (synthetic fixtures), for `setProjectUserEmail`, `updateUser`, `deleteUser`, `createUser` and one REST route (`PATCH /api/users/:id`): refused, nothing written, no audit row, no event in the outbox; the same calls with matching header and input succeed; an API-key request keeps working with its own scope and is refused with another. `boot-parity.e2e.test.ts`'s route snapshot is unchanged (no route is added or removed).
- [ ] **Clients keep working.** The dashboard (`apps/web`, Apollo link that sets `x-scope-*`) and `@grantjs/client` are audited for every operation they issue: headers and input scope must agree. If any pair disagrees, the client is fixed in this story (a second slice, `grant-web` or `@grantjs/client` changeset), not left for a follow-up; the PR body lists what was checked and where.
- [ ] **Release.** Patch changeset for `grant-api` written for release notes, in the hardening voice: "Scoped operations now require the scope in the request input to match the scope the request was authorized in; `system` is no longer accepted as a request-supplied tenant." No changeset for ignored packages (`@grantjs/core` is in `.changeset/config.json` `ignore`). Docs: the request-scope section of `docs/contributing/rest-api.md` (or wherever `x-scope-tenant` / `x-scope-id` are documented; `grep -rn x-scope-tenant docs/`) states the rule in one paragraph. Released as v1.19.1.
- [ ] **RLS stays as it is in this story.** The PR states that it does not change any row-level-security policy and names the follow-up if the Security reviewer wants one (for example `project_users` under an organization scope, or policies on `users`, `user_authentication_methods`, `projects`). The guard is sufficient on its own for the acceptance here.
- [ ] **Hooks ran.** `git -c core.hooksPath=.husky` on every commit, `sh .husky/pre-push` and `pnpm release:check` by hand before every push; the PR body lists the checks that ran and those that did not.

## Non-goals

- Changing the precedence in `scope-extractor` (headers → query → body → variables) or dropping any of the sources; clients rely on each
- Row-level-security changes (stated as a follow-up, see the criterion above)
- The per-handler guards that `feat/operator-set-password` adds to `setProjectUserPassword` and `exportProjectUserCredentials`; once this story is on `main` they are redundant and the Principal decides at that story's Gate 4 whether to keep them as defence in depth
- `apps/web` product work beyond fixing a header/input disagreement the audit finds
- A `jti` denylist, session revocation or any auth-flow change
- Backfilling audit rows or events for past requests

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [x] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

**Why:** the guard sits in front of every scoped operation; a wrong comparison either keeps the gap open (compares the wrong field, skips a transport, misses inline literals) or breaks every dashboard call (compares fields the client never sends). The allowlist in the coverage test is the one place a scoped operation can opt out, so the Security reviewer reads it line by line. The `system` tenant change touches the RLS-bypass path in `context.middleware.ts`.

## Suggested active roles

Senior Backend, Senior QA, Senior Security (blocking, not the author), Verifier. Project Manager for this brief and the stack plan; Architect inactive (no boundary changes).

## Human gate

- [ ] Gate 1: Story brief approved — stop here until Alejandro confirms before stack planning.
- [ ] Gate 4: Story → `main` — not opened; agents do not merge.
