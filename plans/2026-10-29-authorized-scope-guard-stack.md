# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-10-29-authorized-scope-guard-brief.md](./2026-10-29-authorized-scope-guard-brief.md). Gate 1 approved by Alejandro 2026-10-29 (verification option (a)).

Grounded on `origin/main` `03103793` (after v1.20.0, tag commit `8e9047b1`). Open-source language only — do not name customer tenants. Per `SECURITY.md` the PR bodies describe the fix and its tests, not an exploit walkthrough; the advisory follows the release.

## Metadata

- **Slug**: `authorized-scope-guard`
- **Story brief**: `plans/2026-10-29-authorized-scope-guard-brief.md`
- **Status**: approved (Gate 2, Alejandro 2026-10-29); in-progress from slice 1
- **Story trunk**: `feat/authorized-scope-guard` from `main` at `03103793`
- **worktree_path**: `/workspace/worktrees/grant-platform-fix-authorized-scope-guard` (exists; holds the trunk)
- **Release**: patch, **v1.20.1** (`grant-api` changesets only unless slice 2's client audit finds a web mismatch)

**Slug justification:** names the control (one guard on the authorized scope), not the symptom. The set-email guardrails ride along because they are the hardening the same review found and they ship in the same patch.

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect — not needed: option (a) changes no semantics, ADR 0011 stays as it is
- [x] Senior Backend
- [ ] Senior Frontend — only if slice 2's client audit finds a header/input disagreement (then a `-web` slice is added with `gh stack add`)
- [x] Senior QA
- [x] Senior Security — blocking on slices 1–3, not the author
- [x] Verifier

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

Order: the smallest change to the trust boundary first (`system` tenant), then the guard that every scoped operation inherits, then the removal of the specific guards it replaces, then the set-email hardening in two PRs (the audit and limit, which touch existing paths; the new notice e-mail, which adds a port method and a template). No standalone tests or docs slice: tests and docs ship with the slice that introduces the behaviour.

| #     | Branch                               | Base                          | Concern                                                                                                                   | Owner role | Review bar           | PR  |
| ----- | ------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------- | --- |
| 1     | `feat/authorized-scope-guard-system` | `feat/authorized-scope-guard` | `system` is never a request-supplied tenant (`scope-extractor.validated()`), tests, who sent it today                     | Backend    | security-full        |     |
| 2     | `feat/authorized-scope-guard-guard`  | prior slice                   | the generic comparison in both transport guards, coverage tests with allowlist, e2e matrix, client audit, docs, changeset | Backend    | security-full        |     |
| 3     | `feat/authorized-scope-guard-remove` | prior slice                   | remove D21's `authorizedScope` parameters and per-handler checks; their tests move to the generic guard's                 | Backend    | security-full        |     |
| 4     | `feat/authorized-scope-guard-audit`  | prior slice                   | set-email audit row named and asserted, tenant rate limit on set-email and create-user, rbac.md paragraph for option (a)  | Backend    | light                |     |
| 5     | `feat/authorized-scope-guard-notice` | prior slice                   | `IEmailService.sendProjectEmailChanged`, template en/de, after-commit best-effort send on `changed`, tests                | Backend    | light                |     |
| final | `feat/authorized-scope-guard`        | `main`                        | integration                                                                                                               | Principal  | deep + security-full |     |

**Collapse rules:** Do not fold 1 into 2 — the `system` change touches the RLS-bypass path in `context.middleware.ts` and must be read on its own. **Do not fold 3 into 2**: a reviewer must see the generic guard complete and tested before reading a removal, and the removal diff must be nothing but removal. 4 and 5 may be folded into one PR if the same Backend writes both in one sitting; keep the template and the port method in their own commit either way. Do not add a sixth tests/docs PR.

**Fan-out:** every slice is serial on one tree (one writer). Security and Verifier run after the author stops on slices 1–3; Verifier only on 4–5 (Security reads 5's template for leakage of the new address, as a comment, not a gate). Slices 4–5 do not depend on 1–3 in code, but they share `users.handler.ts` and the e2e setup, so they are not written in parallel.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk — lives in the worktree; pushed at the start of slice 1 (after Gate 2)
cd /workspace/worktrees/grant-platform-fix-authorized-scope-guard
git push -u origin feat/authorized-scope-guard

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/authorized-scope-guard feat/authorized-scope-guard-system

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/authorized-scope-guard <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/authorized-scope-guard-guard
# later, one at a time:
gh stack add feat/authorized-scope-guard-remove
gh stack add feat/authorized-scope-guard-audit
gh stack add feat/authorized-scope-guard-notice

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions **before** writing a slice, not after:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking). **`--base` is not optional on `link`**. `gh stack submit --auto` opens PRs as **drafts**. Mark ready with `gh pr ready <pr>` for gate 3.

Hooks: `git -c core.hooksPath=.husky commit` on every commit, `sh .husky/pre-push` by hand before every push, `pnpm release:check` whenever a changeset is in the diff. Never `--no-verify`, never `HUSKY=0`. Fresh slice worktrees need `pnpm install --frozen-lockfile --ignore-scripts` before the first commit (the pre-commit hook runs prettier). Any REST route change must regenerate `apps/api/tests/e2e/__snapshots__/boot-parity.e2e.test.ts.snap` (this story adds or removes **no** route, so the snapshot must be unchanged — a diff there is a mistake). Agents never self-merge. Alejandro merges.

## Named contracts (do not rename in a slice)

| Kind               | Name                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Guard error        | `AuthorizationError('Forbidden')` — REST 403, code `FORBIDDEN`, the body shape the guards use today                               |
| Guard inputs       | GraphQL: `args.input.scope` or `args.scope`; REST: `req.body.scope`, `req.body.input.scope`, query `scope` / `scopeId` + `tenant` |
| Authorized scope   | `context.user.scope` (session: request scope; API key / project app / system: token scope, `grant.ts:78`)                         |
| Allowlist          | one exported constant in the coverage test, each entry `{ operation, reason }`; the PR body repeats it                            |
| Audit metadata     | `metadata.operation: 'operator-set-email'` and `'operator-create-user'` on `user_authentication_method_audit_logs` rows           |
| E-mail port method | `IEmailService.sendProjectEmailChanged({ to: previousAddress, projectName, locale })` — no link, no new address                   |
| Template           | `apps/api/src/lib/email/templates/project-email-changed.template.ts`; i18n keys `email.projectEmailChanged.*` (en, de)            |
| Rate-limit bucket  | the existing `tenantRateLimitMiddleware` bucket keyed on `context.user.scope`; limit stated in slice 4's PR body                  |

## Slice notes

### 1 — `system` is never a request-supplied tenant (security-full)

- Owner files: `apps/api/src/lib/authorization/scope-extractor.ts` (`validated()`, `:20-25`: `Tenant.System` from headers, query, body or variables is treated as absent), `apps/api/src/middleware/context.middleware.ts:98` (the "no RLS context for system" branch is then reachable only from token-derived scopes; add a comment, change no behaviour), unit tests for the extractor (header, query, body and variables each with `system` → absent; the other tenants unchanged).
- Precondition, in the PR body: `git grep -n "Tenant.System\|'system'" apps packages/@grantjs/client` — what, if anything, sends `system` from a request today (tests, CLI, `@grantjs/client`); each hit is either confirmed token-derived or fixed here. `TokenType.System` tokens keep their scope from the token (`packages/@grantjs/core/src/core/grant.ts:78`); a test asserts a system-token request still runs with the system scope after the change.
- **Out of this slice:** the comparison guard.
- **Fan-out:** Security + Verifier after the author stops.

### 2 — The generic guard (security-full)

- Owner files: `apps/api/src/lib/authorization/graphql-guard.ts` (`authorizeGraphQLResolver`: read the operation scope from `args` — inline literals never reach `req.body.variables` — normalise through the extractor's validation, compare `tenant` and `id` with `context.user.scope`, throw before the resource resolver and before `isAuthorized`), `apps/api/src/lib/authorization/rest-guard.ts` (`authorizeRestRoute`: the same from `req.body.scope`, `req.body.input.scope`, and the `scope` / `scopeId` + `tenant` query parameters), a shared helper for the comparison so the two guards cannot drift (one function, two callers — not two copies).
- Coverage tests (QA shapes, Backend writes): (i) walk the executable schema (`makeExecutableSchema` as `packages/@grantjs/schema` `sdl-contract.test.ts` does) and, for every `Mutation` and `Query` field whose arguments carry a `scope` directly or inside its input type, assert the registered resolver is wrapped by the guard (wrapper marks itself, e.g. a symbol on the returned function); (ii) walk `apps/api/src/rest/schemas/*.ts` for zod schemas with a `scope` field and assert each route using one is mounted behind `authorizeRestRoute` (the route table is introspectable from the Express app the boot-parity test already builds). Operations that take a scope without an authorized one go in the **allowlist constant** with a one-line reason each (candidates: `exchangeApiKey`, `createOrganization` under a personal account, the auth mutations); the PR body repeats the list. A new scoped operation that is not wrapped fails the test.
- Unit tests per transport: match → resolver/route runs; mismatch in `id` → refused, resource resolver and `isAuthorized` not called; mismatch in `tenant` → refused; no scope in the input → unchanged; GraphQL inline-literal `input.scope` that differs from the headers → refused; API-key request whose input names another scope than the key's → refused; same scope → allowed.
- E2E (`apps/api/tests/e2e/scenarios/authorized-scope-guard.e2e.test.ts`, Docker: host or desktop lane, state in the PR body whether it ran): a session user who is Owner of organization A sends organization-A scope headers and an input naming a project of organization B, for `setProjectUserEmail`, `updateUser`, `deleteUser`, `createUser`, `setProjectUserPassword`, `exportProjectUserCredentials` and one REST route (`PATCH /api/users/:id`): refused, nothing written, no audit row, no event in the outbox; the same calls with matching scopes succeed; an API-key request keeps working with its own scope and is refused with another. The two D21 operations are in this matrix **before** slice 3 removes their own checks.
- Client audit (brief criterion 5), stated in the PR body: `apps/web` sets no `x-scope-*` header (pre-audit found none); confirm the extractor's `variables` fallback is what authorizes a dashboard request and that it reads the same field the handler acts on for both `variables.scope` and `variables.input.scope`; confirm `@grantjs/client` sends one scope per call. If either finding is wrong, stop and `gh stack add feat/authorized-scope-guard-web` after this slice (Frontend; `grant-web` patch changeset).
- Docs: one paragraph on the rule where `x-scope-tenant` / `x-scope-id` are documented (`grep -rn x-scope-tenant docs/`; else `docs/contributing/rest-api.md` under request scope). Changeset: `grant-api` patch in the hardening voice from the brief. `boot-parity` snapshot unchanged.
- **Out of this slice:** removing D21's checks (slice 3), RLS policies (stated as a follow-up in the PR body).
- **Fan-out:** Security + Verifier after the author stops; Security reads the allowlist line by line. Security-full **before** gate 3.

### 3 — Remove the specific guards (security-full)

- Owner files: `apps/api/src/handlers/users.handler.ts` (`setProjectUserPassword` `:475`, `exportProjectUserCredentials` `:523`: drop the `authorizedScope` parameter and the comparison), `apps/api/src/graphql/resolvers/users/mutations/set-project-user-password.resolver.ts:9`, `apps/api/src/graphql/resolvers/project-users/queries/export-project-user-credentials.resolver.ts:9`, the two REST routes in `apps/api/src/rest/routes/users.routes.ts` that pass `context.user?.scope`, the handler unit tests that assert the per-handler `Forbidden` (deleted; the behaviour is asserted by slice 2's guard tests and e2e matrix), `docs/architecture/rbac.md` if it describes the per-handler check.
- The diff is **removal only**: no new behaviour, no renamed symbol. The PR body links slice 2's e2e cases for both operations as the proof that coverage did not drop. `boot-parity` snapshot unchanged (no route change).
- **Fan-out:** Security confirms nothing else guarded these two operations; Verifier runs the suite.

### 4 — Set-email audit, limit and the option (a) paragraph (light)

- Owner files: `apps/api/src/services/user-authentication-method.service.ts` (`setOrReplaceEmailMethod` → `logUpdate` gains `metadata.operation`; the two callers pass `'operator-set-email'` and `'operator-create-user'`), `apps/api/tests/e2e/scenarios/operator-set-email.e2e.test.ts` (new assertions: exactly one `user_authentication_method_audit_logs` row per successful call, `performed_by` = operator, old and new address in `old_values` / `new_values`, `metadata.operation` set; **no row** on a refused call: non-member, conflict, scope mismatch — the last one needs slice 2 below it, which is why 4 sits above 2), `apps/api/src/middleware/rate-limit.middleware.ts` + its REST and GraphQL mounting for `setProjectUserEmail`, `PUT /api/users/:id/email` and `createUser` (the existing tenant bucket; limit stated in the PR body; a test that the 429 arrives), `docs/architecture/rbac.md` (one paragraph next to `ProjectUser:SetEmail`: an operator-set address is unverified; where that matters; how the user clears it — option (a)).
- Changeset: `grant-api` patch (one changeset may cover 4 and 5 if they merge close together; otherwise one each).
- **Out of this slice:** the notice e-mail; any change to the conflict message (shared with the self-service connect flow, stays as it is).
- **Fan-out:** Verifier after the author.

### 5 — Notice to the previous address (light)

- Owner files: `packages/@grantjs/core/src/ports/email.port.ts` (`sendProjectEmailChanged`), `apps/api/src/lib/email/templates/project-email-changed.template.ts` modelled on `project-password-reset.template.ts` (branded, localised; i18n keys `email.projectEmailChanged.*` en and de; body: the sign-in e-mail for the app was changed by an administrator, whom to contact; **no link, not the new address**), every `IEmailService` implementation and test double, `user-authentication-method.service.ts` or its caller: when `operation === 'changed'` (not `added`, not no-op), enqueue the send on the after-commit queue to the **previous** address; a failure is logged and never fails the mutation.
- Tests: unit (sent once on `changed`; not on `added` or no-op; to the old address; rendered body free of the new address); e2e asserts the mail sink has one message to the previous address after a successful change and none after a refused call. The notification system is **not** used (it resolves recipients by user id, which now points at the new address; `project.user_email_changed` stays `webhookOnly`).
- Changeset: `grant-api` patch (see slice 4).
- **Fan-out:** Verifier after the author; Security reads the template for leakage (comment).

## Out of this stack

| Item                                                                                                   | Why it stays out                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **RLS policy changes** (`project_users` under organization scope…)                                     | Brief non-goal; stated as a follow-up in slice 2's PR body for the Security reviewer                                                          |
| **Event-actor FK** (`DrizzleEventPublisher.resolveActorId`, `event_log.actor_user_id`, migration 0075) | Known pre-existing gap from D21's review; not in this brief. Candidate for its own small fix after v1.20.1 unless Alejandro adds it at Gate 2 |
| **Session revocation / `jti` denylist on set-email**                                                   | Brief non-goal                                                                                                                                |
| **Verification mail or trusted-operator flag (options b, c)**                                          | Option (a) chosen                                                                                                                             |
| **Changing scope-extractor precedence**                                                                | Brief non-goal; clients rely on each source                                                                                                   |
| **A `-web` slice**                                                                                     | Only if slice 2's audit contradicts the pre-audit                                                                                             |

## Dependencies / notes

- **Depends on v1.20.0 on `main`** (#648, #649). Trunk from `03103793`.
- Slice 1 before 2 so the guard's normalisation can rely on `system` being absent from request-derived scopes.
- Slice 2 before 3 so the D21 operations are covered by the generic tests before their own checks go.
- Slice 2 before 4 so the "no audit row on scope mismatch" assertion has the guard beneath it.
- Slices 4 and 5 are independent of each other in code; 5 after 4 only to keep one writer per tree.
- **Atomicity:** the guard runs before any read; the audit row stays in the set-email transaction; the notice is after-commit and best-effort.
- **Test infrastructure:** e2e needs the Docker stack (`pnpm test:e2e:up`, AGENTS.md § Testing); the executor states in each PR body whether e2e ran.
- **No customer tenant names** in plans, fixtures, PRs or docs. PR bodies: fix and tests, no exploit walkthrough (`SECURITY.md`).
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.
- Release: `chore: version packages` → **v1.20.1**; then pin in grant-etl `grant-version.json`, images, staging deploy (the usual bump procedure); release notes carry the hardening sentence from the changeset.

## Human gates

- [x] Gate 2: Stack plan approved — Alejandro, 2026-10-29, as written.
- [ ] Gate 3: Stack PRs merged into trunk (security-full on 1–3, light on 4–5).
- [ ] Gate 4: Story → `main` deep + security-full review complete.

## Cleanup

- [ ] `git worktree remove /workspace/worktrees/grant-platform-fix-authorized-scope-guard`
- [ ] Local slice branches deleted
- [ ] Remote slice branches deleted
- [ ] Remote story trunk deleted
- [ ] Stack plan status → `merged-to-main`
