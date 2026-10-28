# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-10-28-operator-set-email-brief.md](./2026-10-28-operator-set-email-brief.md). Gates 1–2 approved by Alejandro 2026-10-28.

Grounded on `origin/main` `eccfd7f5` (v1.18.9). Open-source language only — do not name customer tenants.

## Metadata

- **Slug**: `operator-set-email`
- **Story brief**: `plans/2026-10-28-operator-set-email-brief.md`
- **Status**: approved
- **Story trunk**: `feat/operator-set-email` from `main` **after v1.18.9** (already on `origin/main` as of this plan)
- **worktree_path**: not required unless another writer is on `main` / another story trunk in the same checkout

**Slug justification:** names the operator outcome (set a project user’s email), not a tactic (`auth-method-upsert`, `project-user-set-email-action`).

## Active roles

Only list roles that will run for this story:

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [x] Senior Backend
- [x] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

Architect stays off unless Gate 2 moves the action off `ProjectUser` or adds a `users.email` column. Neither is planned.

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

No db slice. Event catalog lives in `@grantjs/schema` (`EVENT_TYPES` / `EVENT_CATALOG`), so it ships with the schema slice, not constants. No standalone tests/docs slice: contract tests and docs live on the slice that introduces the behaviour (seed characterization on 1, catalog compile on 2, write unit/integration/e2e on 3, API-key read lock on 4, UI grant gating + permission i18n on 5).

| #     | Branch                              | Base                      | Concern                                            | Owner role | Review bar           | PR  |
| ----- | ----------------------------------- | ------------------------- | -------------------------------------------------- | ---------- | -------------------- | --- |
| 1     | `feat/operator-set-email-constants` | `feat/operator-set-email` | `SetEmail` action, seed mappings, RBAC docs        | Backend    | security-full        |     |
| 2     | `feat/operator-set-email-schema`    | prior slice               | GraphQL input/mutation, event type, codegen        | Backend    | security-full        |     |
| 3     | `feat/operator-set-email-api`       | prior slice               | createUser+setEmail+authz, event emit, write tests | Backend    | security-full        |     |
| 4     | `feat/operator-set-email-read`      | prior slice               | API-key nested `authenticationMethods` read lock   | Backend    | security-full        |     |
| 5     | `feat/operator-set-email-web`       | prior slice               | Create-user email field, set-email action, i18n    | Frontend   | light                |     |
| final | `feat/operator-set-email`           | `main`                    | integration                                        | Principal  | deep + security-full |     |

Prefer layer order: **db → schema → api → web**. This story has **no db migration**. Constants/permission seed is the first slice so schema and API can reference `ResourceAction.SetEmail` without a mixed constants+API mega-diff. Read is its own PR so the “keys already see mailboxes” contract is reviewable apart from the write path.

**Collapse rules:** Do not fold 1 into 2 (permission seed is the reviewable RBAC change). Do not fold 2 into 3 (codegen contract before implementation). Do not fold 3 into 4 (write vs documented read). Do not fold 4 into 5. Do not skip 5 — UI is in the spec. Do not add a db slice because uniqueness already lives on `user_authentication_methods`. Do not add a sixth tests/docs PR.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk — only after Alejandro Gate 1–2
git switch -c feat/operator-set-email main && git push -u origin feat/operator-set-email

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/operator-set-email feat/operator-set-email-constants

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/operator-set-email <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/operator-set-email-schema
# later:
gh stack add feat/operator-set-email-api
gh stack add feat/operator-set-email-read
gh stack add feat/operator-set-email-web

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions **before** writing a slice, not after — the branch you are about to work on must sit on the current tip of the slice below it:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking). **`--base` is not optional on `link`**. `gh stack submit --auto` opens PRs as **drafts**. Mark ready with `gh pr ready <pr>` for gate 3.

Never skip husky (`--no-verify`, `HUSKY=0`). Open PRs as `grantjs-agent` via `GRANTJS_AGENT_TOKEN` / `gh`. Agents never self-merge. Alejandro merges.

## Named contracts (do not rename in a slice)

| Kind         | Name                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Permission   | `ResourceAction.SetEmail` on `ResourceSlug.ProjectUser`                                                  |
| Mutation     | `setProjectUserEmail`                                                                                    |
| Create field | `CreateUserInput.email` (optional); REST `POST /users` `email`                                           |
| REST set     | `PUT /api/users/:id/email`                                                                               |
| Event        | `project.user_email_changed` (`webhookOnly` membership; `data.after.operation` `'added'` \| `'changed'`) |

Uniqueness quote the implementation must follow (`docs/architecture/security.md`):

> A provider can only be linked to one user account (no sharing), and a user can only have one method per provider (no duplicates).

Index: `user_auth_methods_provider_provider_id_unique` on `(provider, providerId) WHERE deletedAt IS NULL`. Operator path: normalize `trim().toLowerCase()` first (the index is case-sensitive; `findByProviderAndProviderId` uses exact `eq`), then `ConflictError('This authentication method is already connected to another account')` — never CDM catalog reuse.

## Slice notes

### 1 — Constants / permission seed (security-full)

- Owner files: `packages/@grantjs/constants/src/permissions/resources.ts` (`ResourceAction.SetEmail`; add to `ProjectUser.actions`), `groups.ts` (`ProjectUserOwner` / `ProjectUserAdmin` permissions + `assignedRoles`), `permissions.ts` (mapping templates, `condition: null`), `docs/architecture/rbac.md` (Project User groups currently “no additional permissions”; matrix currently read/query only), `docs/core-concepts/resources.md` (action table). Seed characterization in `packages/@grantjs/database/src/scripts/seed-permissions.test.ts` derives counts from constants — should stay green without a database source change. Patch changeset on `@grantjs/constants`.
- Today: `ProjectUser` actions are `Read` `Query` only. `ProjectUserOwner` / `Admin` / `Dev` / `Viewer` have **empty** `permissions` and **empty** `assignedRoles`. `ProjectUserCommon` grants read/query to all org roles. `UserDev` already grants `User:Create` to Organization Dev — that is why SetEmail must not follow Create’s Dev grant. Operator set-password action does **not** exist.
- Outcome:
  - `ResourceAction.SetEmail = 'SetEmail'`
  - `ProjectUser.actions` += `SetEmail`
  - `ProjectUserOwner`: permissions `[SetEmail]`, assignedRoles `[OrganizationOwner, PersonalAccountOwner, OrganizationAccountOwner]`
  - `ProjectUserAdmin`: permissions `[SetEmail]`, assignedRoles `[OrganizationAdmin]`
  - Dev / Viewer / Common **unchanged**
  - Docs match. No hard-coded role names in runtime code (none yet — this slice is catalog only)
- Older orgs: `seedAll` is instance-wide and idempotent; ADR 0001 (`DB_BOOTSTRAP_ON_BOOT`, default true) is how boot-time seed reaches existing deployments. Serverless must run migrate/seed with the flag. Document that in rbac.md in one sentence, not a new ADR.
- **Out of this slice:** GraphQL, handlers, web, events.
- Tests: constants unit if present; seed characterization still passes (counts come from mappings). No e2e yet (permission row does not exist in a running API until seed runs with this package).
- **UX:** no web files. Permission picker will miss i18n keys until slice 5 — acceptable on a stack.
- **Fan-out:** independent Security + Verifier after the author stops; they share the tree.

### 2 — Schema / codegen (security-full)

- Owner files: `packages/@grantjs/schema/src/schema/users/inputs/create-user.graphql` (optional `email: String`), new `set-project-user-email.graphql` mutation + input (`userId`, `email`, `scope`), operation documents for web/API consumers, `packages/@grantjs/schema/src/events/event-catalog.ts` (`project.user_email_changed` → `webhookOnly('membership')`). `pnpm --filter @grantjs/schema generate`. REST zod/OpenAPI **not** in this slice (they live in `apps/api`). Minor changeset on `@grantjs/schema`.
- **Lockstep API catalog files** (otherwise monorepo typecheck fails when `EVENT_TYPES` grows): `apps/api/src/lib/notifications/notification-email-families.ts` (`'project.user_email_changed': 'webhookOnly'`), and add the type to the hardcoded `webhookOnly` list in `apps/api/tests/unit/lib/events/event-catalog-coverage.test.ts` (that test asserts every _other_ catalog entry has a non-empty audience). Catalog coverage “every `EVENT_TYPES` member is in `EVENT_CATALOG`” must stay green. These two files are catalog compile, not emit.
- Today: `CreateUserInput` has no email. No set-email mutation. Event list has `project.user_added` / `profile_updated` / `updated` / `removed`, `user.email_verification_requested`, `user.password_changed` — nothing for operator email set.
- Outcome: additive GraphQL + event type only. Field descriptions: email is optional, project-scope create only, unverified, uniqueness as quoted. Event description: ids only, no address. Do **not** add `email` / `isVerified` on `ProjectUser` (read verdict: nested `User.authenticationMethods` already exists).
- **Out of this slice:** resolvers, seed, UI, event emit.
- **UX:** no web files (hooks wait for slice 5; they will import generated documents).
- **Fan-out:** independent Security + Verifier (event catalog is the webhook contract).

### 3 — API write: createUser + setEmail + authz (security-full)

- Owner files: `apps/api/src/handlers/users.handler.ts` (`createUser` email branch; new `setProjectUserEmail`; inject `IAuthService` for the extra check), `apps/api/src/graphql/resolvers/users/mutations/` + `mutations.ts` (`ProjectUser` + `SetEmail` on `setProjectUserEmail`; `createUser` transport stays `User:Create`), `apps/api/src/rest/routes/users.routes.ts` / `schemas` / `openapi` (`PUT /api/users/:id/email`; optional `email` on `POST /users`), `apps/api/src/services/user-authentication-methods.service.ts` (set-or-replace Email method, uniqueness **before** write, normalize, `isVerified: false` on change), `apps/api/src/services/project-users.service.ts` (membership + `resolveProjectScope` + publish `project.user_email_changed`), `packages/@grantjs/core/src/ports/services/user.service.port.ts` and `project.service.port.ts` (`IUserAuthenticationMethodService.setOrReplaceEmailMethod`, `IProjectUserService.publishProjectUserEmailChanged` — handlers inject **ports**). Docs: `docs/core-concepts/events-webhooks-notifications.md`. Patch `grant-api` + `@grantjs/core`.
- Layering: Handler orchestrates a transaction. Identity write in `UserAuthenticationMethodService` (reuse create uniqueness, **update** existing Email method rather than failing “user already has email”). Membership + explicit project scope + event in `ProjectUserService` (already publishes `project.user_*`). Do **not** call `UserProvisionCdmEntity.applyEmailIdentity`. Do **not** edit `project-user-api-key.cdm-entity.ts` or `api-keys.service.ts`. Do **not** expand `ProjectUserService`’s optional `IUserAuthenticationMethodRepository` for this write.
- Dual permission on create: transport still wraps `createUser` with `User:Create`. If `input.email` is set, handler `IAuthService.isAuthorized` `ProjectUser:SetEmail` **before any insert**; failure → `AuthorizationError`, no user row. Do not use `resolveActions` (first match wins — OR). Email outside project tenants → `ValidationError`. Validate with existing `emailSchema`; normalize `trim().toLowerCase()`. Empty string is invalid, not “absent”.
- Event: only when stored normalized `providerId` changes. `data.after = { projectId, userId, operation }`. `subjectUserId` set. No address in `data`, webhook envelope, or `createLogger` fields. Sentinel e2e. Existing auth-method audit may still record `providerId` (leave it; do not “fix” that table in this story).
- Tests (QA drives shape; Backend writes with the slice):
  - Uniqueness: other identity → 409 / `ConflictError`; same address no-op; add vs change; normalize case
  - Permission: Owner/Admin allow; Dev/Viewer deny; Dev allow after granting `ProjectUser:SetEmail` to that role’s group; `createUser`+email without SetEmail fails entirely; `createUser` without email still works for Dev
  - Membership: non-member → not found; org-scope create+email → validation
  - Event: added vs changed vs no-op; sentinel absent from `data` / webhook / logs
- **E2e lock (preferences):** new tests lock this contract; do not weaken existing identity / invitation / CDM email-reuse tests.
- **Out of this slice:** web components. CDM. Verification email. The nested-read lock (slice 4).
- **Fan-out:** independent Security + Verifier after the author stops. Security-full **before** gate 3.

### 4 — Read path lock (security-full)

- Owner files: e2e (and a short doc note in `docs/architecture/rbac.md` or `docs/architecture/security.md`) that an `OrganizationProject` API key with `User:Query` (standard Owner **and** Viewer / User Common) can request `users { authenticationMethods { provider providerId isVerified } }` for another member and get the mailbox. Same for `AccountProject`. Documents that this is `User:Query`, not `ProjectUserCommon`. A `ProjectUser`-tenant key only if that user holds `User:Query`. Do not add a ProjectUser field. Do not change `GetUsers` / `GetUsersList` to add `isVerified` for the dashboard (the lock test requests the field; the type already has it).
- Today (verified on `origin/main`): GraphQL `users` and REST `GET /users` authorize `User:Query` only; nested `authenticationMethods` is a repository relation with no extra check; `UserAuthenticationMethodCommon` is own-methods-only on the dedicated resource.
- **If this slice discovers keys cannot read nested methods, stop.** Amend the brief. Adding a gated `ProjectUser.email` field needs a schema change that this slice is not allowed to invent.
- **Out of this slice:** write path, web, CDM, tightening Viewer.
- Tests: the API-key nested read e2e above; include the sentinel address on a member and assert it _is_ visible on this authorized read (the event slice asserts it is _not_ in event/webhook/logs).
- **Fan-out:** independent Security + Verifier. Security-full **before** gate 3 — this slice is the “we are documenting that Viewer keys already see emails” review.

### 5 — Web / i18n (light)

- Owner files: `apps/web/components/features/user/user-create-general-card.tsx`, `apps/web/components/features/users/user-types.ts` / `user-create-viewer.tsx`, `apps/web/components/features/users/user-actions.tsx`, `apps/web/hooks/users/use-user-mutations.ts`, new set-email dialog following edit/delete dialogs, `apps/web/i18n/locales/{en,de}.json` (form labels, action, toasts, `permissions.names.projectUser.setEmail` + descriptions).
- Today: create form is name + tags/roles/groups; actions are edit/delete gated on `User:Update` / `User:Delete`.
- Outcome: optional email on **project** create, only if `useGrant(ResourceSlug.ProjectUser, ResourceAction.SetEmail)` (and still `User:Create`). Hide the field without the grant — do not submit email the API would reject. Set-email action on a project user, same grant, `enabled: hasBeenOpened` like existing actions. Organization-scoped create stays email-less.
- **Out of this slice:** showing the mailbox on the user card (mirror reads API; dashboard may already show `authenticationMethods` via `GetUsers` — do not expand that here).
- Tests: none required beyond existing UI patterns; Verifier typecheck/lint.
- **Fan-out:** Verifier after author. Security not required (API is the boundary; UI is hide-the-button).
- **UX:** this is the only slice that ships user-visible chrome.

## Out of this stack

These are explicit **non-slices**. Do not add them under a “while we’re here” at slice start.

| Item                                                             | Why it stays out                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Drizzle migration / `users.email` column**                     | Identity is `user_authentication_methods`; unique index exists             |
| **`ProjectUser.email` + `isVerified` field**                     | Nested `User.authenticationMethods` is already readable under `User:Query` |
| **Operator set-password**                                        | Separate story; not in-repo as a ResourceAction                            |
| **Email verification / sending mail**                            | Spec non-goal                                                              |
| **CDM reuse / `user-provision.cdm-entity.ts` behaviour change**  | Import-only exception; operator path must not copy it                      |
| **`project-user-api-key.cdm-entity.ts` / `api-keys.service.ts`** | Fingerprint story; coordinator stop-line                                   |
| **Tightening Viewer nested auth-method reads**                   | Existing User:Query contract; different story                              |
| **Notification inbox row for the event**                         | `webhookOnly`; operator action                                             |

## Dependencies / notes

- **Depends on v1.18.9 on `main`** (`#626` / `#629`). Trunk from current `origin/main`. Independent of `#625`.
- Slice 1 before 2 so schema/API import `ResourceAction.SetEmail`.
- Slice 2 before 3 so resolvers use generated types. Slice 2 also patches the two API catalog-compile files so `Record<EventType, …>` and the webhook-only audience test stay green.
- Slice 3 before 4 so the read lock can use a member whose email was just set (optional; the nested-read contract itself does not depend on SetEmail).
- Slice 3 before 5 so the UI calls a real mutation.
- **Atomicity:** createUser+email is one transaction (user + membership + Email method + event). Fail SetEmail before writes.
- **No customer tenant names** in repo plans, fixtures, PRs, or docs.
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.
- Fan-out that is free: Security and Verifier on slices 1–4 after the author stops writing. Do not put two writers in one tree.

## Human gates

- [x] Gate 2: Stack plan approved — Alejandro 2026-10-28.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep + security-full review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Remote slice branches deleted
- [ ] Remote story trunk deleted
- [ ] Stack plan status → `merged-to-main`
