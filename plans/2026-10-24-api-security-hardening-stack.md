# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact.

Story brief: [2026-10-24-api-security-hardening-brief.md](./2026-10-24-api-security-hardening-brief.md). Audit: [API security and performance audit](./api-security-performance-audit.md).

## Metadata

- **Slug**: `api-security-hardening`
- **Story brief**: `plans/2026-10-24-api-security-hardening-brief.md` (store copy linked above; copy into repo `plans/` with the first slice)
- **Status**: approved — Gate 2 passed 2026-10-24 by Alejandro / in-progress
- **Story trunk**: `feat/api-security-hardening`
- **worktree_path**: not required unless another writer is on `main` / another story trunk in the same checkout

## Active roles

Only list roles that will run for this story:

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [x] Senior Backend
- [ ] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

## Ordered slices (PRs)

One audit finding per slice. Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

| #     | Branch                                         | Base                          | Concern                          | Audit  | Owner role | Review bar           | PR                                                 |
| ----- | ---------------------------------------------- | ----------------------------- | -------------------------------- | ------ | ---------- | -------------------- | -------------------------------------------------- |
| 1     | `feat/api-security-hardening-refresh-verified` | `feat/api-security-hardening` | refresh `isVerified`             | H1     | Backend    | security-full        | [#570](https://github.com/grant-js/grant/pull/570) |
| 2     | `feat/api-security-hardening-project-app-bind` | prior slice                   | project-app mutate binds project | H2     | Backend    | security-full        | [#571](https://github.com/grant-js/grant/pull/571) |
| 3     | `feat/api-security-hardening-project-app-rls`  | prior slice                   | RLS on `project_apps`            | H2     | Backend    | security-full        |                                                    |
| 4     | `feat/api-security-hardening-gql-auth-limit`   | prior slice                   | GraphQL auth rate-limit bucket   | M1     | Backend    | security-full        |                                                    |
| 5     | `feat/api-security-hardening-platform-lockout` | prior slice                   | platform password lockout        | M2     | Backend    | security-full        |                                                    |
| 6     | `feat/api-security-hardening-mfa-verify`       | prior slice                   | MFA verify attempt budget        | M3     | Backend    | security-full        |                                                    |
| 7     | `feat/api-security-hardening-app-scopes`       | prior slice                   | empty scopes fail closed         | M4     | Backend    | security-full        |                                                    |
| 8     | `feat/api-security-hardening-oauth-refresh`    | prior slice                   | refresh ∩ current app.scopes     | M5     | Backend    | security-full        |                                                    |
| 9     | `feat/api-security-hardening-cache-delete`     | prior slice                   | invalidate authz cache on delete | M6     | Backend    | security-full        |                                                    |
| 10    | `feat/api-security-hardening-gql-cost`         | prior slice                   | query cost + clamp `limit`       | M7     | Backend    | security-full        |                                                    |
| 11    | `feat/api-security-hardening-org-members`      | prior slice                   | org member list SQL page         | M8     | Backend    | light                |                                                    |
| 12    | `feat/api-security-hardening-tenant-lists`     | prior slice                   | tenant lists page in DB          | M9     | Backend    | light                |                                                    |
| 13    | `feat/api-security-hardening-cascade-chunk`    | prior slice                   | chunk IAM cascade + outbox       | M10    | Backend    | security-full        |                                                    |
| 14    | `feat/api-security-hardening-min-aal`          | prior slice                   | unnamed GraphQL min-AAL          | L1     | Backend    | security-full        |                                                    |
| 15    | `feat/api-security-hardening-refresh-reuse`    | prior slice                   | revoke family on refresh reuse   | L2     | Backend    | security-full        |                                                    |
| 16    | `feat/api-security-hardening-jwks-cache`       | prior slice                   | JWKS HTTP short-TTL cache        | L5     | Backend    | light                |                                                    |
| 17    | `feat/api-security-hardening-docs`             | prior slice                   | residual JWT window + trusted IP | L3, L4 | Backend    | light                |                                                    |
| final | `feat/api-security-hardening`                  | `main`                        | integration                      | all    | Principal  | deep + security-full |                                                    |

Prefer layer order: **db → schema → api → web**. This story is almost all API. The only database slice is #3 (RLS), stacked after the application bind in #2 so the hole is closed before the policy lands.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk
git switch -c feat/api-security-hardening main && git push -u origin feat/api-security-hardening

# Copy store plans into repo if they are not there yet:
#   plans/2026-10-24-api-security-hardening-brief.md
#   plans/2026-10-24-api-security-hardening-stack.md

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/api-security-hardening feat/api-security-hardening-refresh-verified

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/api-security-hardening <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/api-security-hardening-project-app-bind

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions **before** writing a slice, not after — the branch you are about to work on must sit on the current tip of the slice below it:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking) (repo path once this file lives in `plans/`). **`--base` is not optional on `link`**. `gh stack submit --auto` opens PRs as **drafts**. Mark ready with `gh pr ready <pr>` for gate 3.

Principal issues a [slice brief](../docs/contributing/templates/slice-brief.md) when that slice starts — not all 17 up front.

## Slice notes

### 1 — refresh `isVerified` (H1)

- `AuthHandler.refreshSession` (`apps/api/src/handlers/auth.handler.ts`): stop passing `undefined` for `isVerified`.
- `UserSessionService.refreshSessionByRefreshToken` / `signSession` (`apps/api/src/services/user-sessions.service.ts`): mint from the session’s authentication method, same source as login. Never default `true`.
- Tests: unverified refresh keeps the claim false; verified refresh stays true; `mfaVerified` still comes from `user_sessions.mfaVerifiedAt`.
- **UX:** no web file changes. Do not touch `mfa-step-up-dialog`, `/auth/mfa`, or `shouldOpenInAppMfaStepUp`.

### 2 — project-app bind (H2 application)

- `ProjectAppsHandler.updateProjectApp` / `deleteProjectApp`: require `existing.projectId ===` scoped project (mirror `assertProjectAppPictureScope`).
- `ProjectAppRepository.updateProjectApp` / `softDeleteProjectApp`: persist with `{ id, projectId }`, not `{ id }` only.
- Resolver still authorizes the request-scope project; the load/mutate must match `app.projectId`.
- Tests: cross-project id is not-found / forbidden; same-project update/delete still works.

### 3 — project-app RLS (H2 database)

- Enable RLS on `public.project_apps` (and related OAuth tables if they share the same hole). Policy: `project_id` = request project setting, same pattern as other tenant pivots.
- Migration via `pnpm --filter @grantjs/database db:generate`.
- No handler behavior change beyond #2.

### 4 — GraphQL auth rate limit (M1)

- `AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS` / GraphQL middleware: apply the auth bucket (default 20 / 15 min) to `login`, `register`, `refreshSession` by operation name, and to unnamed documents that are those operations.
- REST paths stay as they are.

### 5 — platform lockout (M2)

- `AuthHandler.login`: record-before-verify, out of the request transaction, keyed by resolved user id. Reuse `CredentialLockoutService` and `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` / `AUTH_LOCKOUT_DURATION_MINUTES`.
- Update `docs/architecture/security.md` (today: “Platform (console) login does not enforce them yet”).

### 6 — MFA verify budget (M3)

- Wire `verifyMaxAttempts` / `verifyWindowMinutes` on `UserMfaService.verifyTotp` and recovery-verify (platform and project).
- Per-user or per-session rolling window. Docs already describe the knobs.

### 7 — empty scopes fail closed (M4)

- `ProjectOAuthHandler.signProjectScopedToken`: refuse to mint `projectApp` when `getGrantedScopeSlugs` is empty.
- `Grant.isAuthorized`: deny when `type === ProjectApp` and `scopes` is missing or empty (today it skips the cap when `length === 0`).

### 8 — OAuth refresh ∩ app allowlist (M5)

- `ProjectOAuthHandler.exchangeRefreshToken`: always intersect `grant.scopes` with current `app.scopes`. Empty `app.scopes` ⇒ no OAuth scopes (not “keep stored grant”).
- After #7 so mint and refresh share the fail-closed rule.

### 9 — authz cache on delete (M6)

- `RoleHandler.deleteRole` / `GroupHandler.deleteGroup` (and permission delete): after cascade, call `invalidatePermissionsCacheForAllScopes` (or equivalent by affected user ids). Assign/revoke already do this.

### 10 — GraphQL cost + clamp `limit` (M7)

- Apollo `validationRules` / cost plugin in `apps/api/src/create-app.ts`.
- `EntityRepository.query`: clamp `limit` to `PAGINATION_MAX_PAGE_SIZE`; reject or cap `-1` outside break-glass admin tools.
- REST schemas that already cap at 100 stay.

### 11 — org member list (M8)

- `OrganizationMemberRepository.getOrganizationMembers`: page in SQL (union + order + limit/offset or keyset). Batch-load users and roles for the page. Disallow `limit: -1` on public APIs.

### 12 — tenant lists (M9)

- `CacheHandler` tenant maps / `UsersHandler.getUsers`: do not materialize every tenant id for a page. Load `project_users` only for the page’s user ids.

### 13 — IAM cascade chunk (M10)

- `GroupHandler.deleteGroup` (and similar fans): keep one event per subject; `publishMany` and/or chunk so the transaction and relay stay bounded. Do not drop events.

### 14 — min-AAL unnamed (L1)

- `assertMinAalAtLoginGraphql`: fail closed when `operationName` is null/empty if `AUTH_MIN_AAL_AT_LOGIN=aal2`. Allowlist `Me`, `VerifyMfa`, `RefreshSession`, recovery. REST unchanged.

### 15 — refresh reuse revoke (L2)

- `UserSessionService.refreshSessionByRefreshToken` and `ProjectOAuthGrantService.rotateByRefreshToken`: on reuse of a rotated secret, revoke the session or grant family. Optional row-lock / CAS on rotation.

### 16 — JWKS cache (L5)

- Short-TTL cache of `getPublicKeysForJwks` payload per issuer. In-process `kid` cache stays. HTTP `Cache-Control` stays.

### 17 — docs residuals (L3, L4)

- Security docs: revoked API keys/grants leave access JWTs valid until `exp` (no new denylist).
- Production: set `SECURITY_TRUSTED_CLIENT_IP_HEADER` to an edge-overwritten value; do not trust leftmost XFF.

## Dependencies / notes

- #1 is first because it is High and UX-constrained (MFA unchanged; unverified API wall after refresh is the fix).
- #2 before #3: close mutate-by-id in application code, then add RLS.
- #7 before #8: one fail-closed rule for mint and refresh.
- #11–#12 are performance (light bar). They stay in this story because the audit filed them with the security pass; they must not change authorization outcomes.
- #13 stays security-full (outbox / webhook volume).
- Copy this brief + stack into repo `plans/` on the trunk (or slice 1) so other harnesses can resume.
- Agents never self-merge. Reviews as `grantjs-agent` via `GRANTJS_AGENT_TOKEN` / `gh`.

## Human gates

- [x] Gate 2: Stack plan approved — 2026-10-24 by Alejandro.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
