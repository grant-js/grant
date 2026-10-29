# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-10-28-operator-set-password-brief.md](./2026-10-28-operator-set-password-brief.md). Gates 1–2 approved by Alejandro 2026-10-28.

Grounded on `origin/main` `af6c102f` (v1.19.0). Open-source language only — do not name customer tenants.

## Metadata

- **Slug**: `operator-set-password`
- **Story brief**: `plans/2026-10-28-operator-set-password-brief.md`
- **Status**: approved
- **Story trunk**: `feat/operator-set-password` from `main` **at v1.19.0** (`af6c102f`)
- **worktree_path**: `/workspace/worktrees/grant-platform-feat-operator-set-password` (created; the main checkout stays free for other stories)

**Slug justification:** names the operator outcome (set a project user's password), parallel to `operator-set-email`; the export and the event are what make that outcome usable by a mirror, not separate products.

## Active roles

Only list roles that will run for this story:

- [x] Project Manager
- [x] Principal Engineer
- [x] Architect — ADR amendment (slice 6) only
- [x] Senior Backend
- [x] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

Layer order **db → constants → schema → api → web**, as `operator-set-email` did, plus a db slice this time: `admin-set` is a CHECK-constrained value. The API is split in two PRs — the write path (set + event) and the read path (export + fingerprint + ADR) — because they have different threat models and the second is the one a reviewer must read slowest. No standalone tests/docs slice: tests and docs ship with the slice that introduces the behaviour.

| #     | Branch                                  | Base                         | Concern                                                                                   | Owner role | Review bar           | PR  |
| ----- | --------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- | ---------- | -------------------- | --- |
| 1     | `feat/operator-set-password-db`         | `feat/operator-set-password` | `admin-set` source: port list, CHECK constraints, migration, schema tests                 | Backend    | light                |     |
| 2     | `feat/operator-set-password-constants`  | prior slice                  | `SetPassword` + `ExportCredentials` actions, groups, mappings, RBAC docs                  | Backend    | security-full        |     |
| 3     | `feat/operator-set-password-schema`     | prior slice                  | GraphQL mutation/query/input/enum/field, event type, codegen, lockstep files              | Backend    | security-full        |     |
| 4     | `feat/operator-set-password-api-set`    | prior slice                  | set handler + REST PUT, grant revocation, change-only event in `CredentialService`, tests | Backend    | security-full        |     |
| 5     | `feat/operator-set-password-api-export` | prior slice                  | export query + REST POST, audit `export` row, fingerprint field gating, tests             | Backend    | security-full        |     |
| 6     | `feat/operator-set-password-adr`        | prior slice                  | ADR 0010/0011 amendment, events/resources docs                                            | Architect  | light                |     |
| 7     | `feat/operator-set-password-web`        | prior slice                  | "Set password" action + dialog, i18n en/de                                                | Frontend   | light                |     |
| final | `feat/operator-set-password`            | `main`                       | integration                                                                               | Principal  | deep + security-full |     |

**Collapse rules:** Do not fold 1 into 2 (a migration is its own reviewable diff). Do not fold 2 into 3 (permission catalog before contract). Do not fold 3 into 4 (codegen contract before implementation). **Do not fold 5 into 4** — writing a credential and reading hashes out are reviewed by different people with different questions. 6 may be folded into 5 if the Architect and Backend are the same writer in the same tree; keep the ADR text reviewable in its own commit either way. Do not skip 7 — the UI is in the spec. Do not add an eighth tests/docs PR.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk — pushed 2026-10-28 after Gates 1–2 (branch lives in the worktree)
cd /workspace/worktrees/grant-platform-feat-operator-set-password
git push -u origin feat/operator-set-password

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/operator-set-password feat/operator-set-password-db

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/operator-set-password <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/operator-set-password-constants
# later, one at a time:
gh stack add feat/operator-set-password-schema
gh stack add feat/operator-set-password-api-set
gh stack add feat/operator-set-password-api-export
gh stack add feat/operator-set-password-adr
gh stack add feat/operator-set-password-web

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions **before** writing a slice, not after — the branch you are about to work on must sit on the current tip of the slice below it:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking). **`--base` is not optional on `link`**. `gh stack submit --auto` opens PRs as **drafts**. Mark ready with `gh pr ready <pr>` for gate 3.

Hooks: this worktree has `core.hooksPath` **unset** and the `.husky/*` files are executable on `main`, so `git -c core.hooksPath=.husky commit` on every commit and `sh .husky/pre-push` by hand before every push (the hooks do not run otherwise); `pnpm release:check` whenever a changeset is in the diff. Never `--no-verify`, never `HUSKY=0`. Open PRs as `grantjs-agent` via `GRANTJS_AGENT_TOKEN` / `gh`. Agents never self-merge. Alejandro merges.

## Named contracts (do not rename in a slice)

| Kind                | Name                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| Permission (set)    | `ResourceAction.SetPassword` on `ResourceSlug.ProjectUser`                                              |
| Permission (export) | `ResourceAction.ExportCredentials` on `ResourceSlug.ProjectUser` — no standard group                    |
| Source              | `'admin-set'`                                                                                           |
| Mutation            | `setProjectUserPassword(input: SetProjectUserPasswordInput!): User!` — `{ userId, password, scope }`    |
| REST set            | `PUT /api/users/:id/password` — body `{ password }`                                                     |
| Query               | `exportProjectUserCredentials(input: ExportProjectUserCredentialsInput!)` — `{ scope, userIds, kinds }` |
| REST export         | `POST /api/users/credentials/export` — body `{ userIds, kinds }`                                        |
| Enum                | `CredentialKind { PASSWORD }`                                                                           |
| Field               | `User.passwordCredential: ProjectUserPasswordCredential` — `{ source, updatedAt, fingerprint }`         |
| Event               | `project.user_password_set` (`webhookOnly('membership')`; `data.after = { projectId, userId, source }`) |
| Audit action        | `export` (new logger method; `project_user_credential_audit_logs`)                                      |

Fingerprint: `sha256(hash).hex()` over the stored bcrypt string, lowercase. Event payload keys must not contain `password`, `hash` or `secret` (`webhook-redaction.lib.ts:14-29` would redact them, and a redacted key is a smell, not a control).

## Slice notes

### 1 — `admin-set` source (light)

- Owner files: `packages/@grantjs/core/src/ports/repositories/credential.repository.port.ts:14-23` (`CREDENTIAL_SOURCES` += `'admin-set'`; doc the meaning: an operator wrote it, final w.r.t. import); `packages/@grantjs/database/src/schemas/project-user-credentials.schema.ts:53` and `user-credentials.schema.ts:46` (CHECK constraints derive from the list — confirm; if they are literal, update both); new migration via `pnpm --filter @grantjs/database run db:generate` (expected: drop + re-add the two CHECK constraints; **no data change**); `packages/@grantjs/database/src/schemas/credentials.schema.test.ts:100` (pinned list); `apps/api/src/services/credentials.schemas.ts:17` and `apps/api/src/rest/schemas/users.schemas.ts:298` if they enumerate literally. No changeset: both packages are in `.changeset/config.json` `ignore` (a changeset naming them fails `release:check`).
- Today: six sources; the import guard is by `source !== 'cdm-import'` (`credentials.service.ts:285-287`, `project-user-credentials.repository.ts:183-185`), so the new value is covered without a code change.
- Tests: schema test lists seven sources; a repository/integration test "import never overwrites `admin-set`" may land here or in slice 4 (QA decides; it must exist by slice 4).
- **Out of this slice:** permissions, API, event.
- **Fan-out:** Verifier after author. Security not needed (no behaviour).

### 2 — Constants / permission seed (security-full)

- Owner files: `packages/@grantjs/constants/src/permissions/resources.ts` (`ResourceAction.SetPassword`, `ResourceAction.ExportCredentials`; `ProjectUser.actions` += both), `groups.ts:599-612` (`ProjectUserOwner` / `ProjectUserAdmin` permissions += `SetPassword`; `assignedRoles` unchanged from `#637`), `permissions.ts:1205-1219` (mapping templates, `condition: null`; **no** template places `ExportCredentials`), `docs/architecture/rbac.md`, `docs/core-concepts/resources.md`. Seed characterization `packages/@grantjs/database/src/scripts/seed-permissions.test.ts` derives counts from constants. No changeset: `@grantjs/constants` is an ignored package; the permission change is described in slice 4's `grant-api` changeset.
- **Correction 2026-10-28:** the seed creates `permissions` rows only from group templates (`PERMISSION_MAPPINGS`), so an action with no template gets no row (as `User:ExportData` today). This slice therefore adds `STANDALONE_PERMISSIONS` in `@grantjs/constants` and seed support in `seed-permissions.ts` (a row, no `group_permissions` link). Verification commands use `pnpm --filter <pkg> run <script>`.
- Outcome: `ProjectUser.actions = [Read, Query, SetEmail, SetPassword, ExportCredentials]`; Owner/Admin groups `[SetEmail, SetPassword]`; Dev / Viewer / Common unchanged; `ExportCredentials` exists as a permission row with **no** group — granted per organization through the groups UI/API.
- Document in rbac.md: why `ExportCredentials` has no default holder (it reads hashes), and that `seedAll` on boot is how both reach existing deployments (one sentence, as for SetEmail).
- **Out of this slice:** GraphQL, handlers, web, events.
- **Fan-out:** Security + Verifier after the author stops; they share the tree.

### 3 — Schema / codegen (security-full)

- Owner files: `packages/@grantjs/schema/src/schema/users/inputs/set-project-user-password.graphql`, `.../mutations/set-project-user-password.graphql`, `.../users/types/user.graphql` (`passwordCredential: ProjectUserPasswordCredential`), new `project-users/types/project-user-password-credential.graphql`, `.../project-users/{inputs,queries,types}/export-project-user-credentials.graphql` (`CredentialKind` enum, input, `ProjectUserCredentialExport { users: [ExportedProjectUserCredential!]! }`, `ExportedProjectUserCredential { userId, password: ExportedPasswordCredential }`, `ExportedPasswordCredential { algorithm, hash }`), operation documents `operations/users/setProjectUserPassword.graphql` and `operations/project-users/exportProjectUserCredentials.graphql`, `src/events/event-catalog.ts` (`project.user_password_set` → `webhookOnly('membership')`). `pnpm --filter @grantjs/schema run generate`. Minor changeset `@grantjs/schema`.
- **Lockstep API files** (monorepo typecheck fails when `EVENT_TYPES` grows): `apps/api/src/lib/notifications/notification-email-families.ts` (`'project.user_password_set': 'webhookOnly'`), `apps/api/tests/unit/lib/events/event-catalog-coverage.test.ts` (webhook-only list), `apps/api/src/graphql/resolvers/users/mutations/index.ts` + `mutations.ts` / `queries.ts` wiring so codegen'd resolver types compile — resolvers may be stubs that throw `NotImplemented` **only if** the typecheck demands a registration; prefer registering in slices 4/5.
- **Correction 2026-10-29:** `passwordCredential` moved from `ProjectUser` to `User` (resolved in the request's project scope), because no query or mutation returns `ProjectUser`; the field was unreachable there (brief decision 8).
- Descriptions on every new field state: password never returned; export is the audited exception; fingerprint is not a secret; event is ids + source. `sdl-contract.test.ts` updated.
- **Out of this slice:** handlers, seed, UI, emit.
- **Fan-out:** Security + Verifier (event and export types are the webhook/API contract).

### 4 — API write: set password + event (security-full)

- Owner files: `apps/api/src/handlers/users.handler.ts` (`setProjectUserPassword`: scope assert reused from set-email → membership → `validateSecretInput(passwordPolicySchema)` → transaction: `credentials.setPassword(source 'admin-set')`, `projectOAuthGrants.revokeAllForUserInProject`), `apps/api/src/graphql/resolvers/users/mutations/set-project-user-password.resolver.ts` + `mutations.ts` (`requireEmailThenMfaGraphQL(…, authorizeGraphQLResolver({ resource: ProjectUser, action: SetPassword }))` exactly like `:122-129`), `apps/api/src/rest/routes/users.routes.ts` / `schemas` / `openapi` (`PUT /:id/password`, `authorizeRestRoute` SetPassword, body validated with `passwordPolicySchema` at the service, never logged by the validate middleware — confirm the REST `validate()` error path does not echo the body), `apps/api/src/services/credentials.service.ts` (`write`: after `upsert`, if `scope.scope === 'project'` and `existing?.hash !== record.hash`, publish `project.user_password_set` with `{ projectId, userId, source }`; inject the events port and the project-scope resolver — or, if the Principal rules the service must stay event-free, add a `IProjectUserService.publishProjectUserPasswordSet` and call it from `setPassword`/`importProjectPasswordHashes`/`completeReset` with the same change-only rule — one place is preferred), `packages/@grantjs/core/src/ports/services/{credential,project}.service.port.ts`. Docs: `docs/core-concepts/events-webhooks-notifications.md`. Patch `grant-api`, `@grantjs/core`.
- Import path: `importProjectPasswordHashes` (`credentials.service.ts:242-305`) goes through `upsertImported`, which returns `null` when the guard wins — no event then; when it replaces, `existing` is the `cdm-import` row and the change-only rule applies. Verify the import's per-row loop can see `existing.hash` without a second query per row (it already loads existing at `:285`).
- **Correction 2026-10-28 (slice 4 execution):**
  - **Import is silent.** `importProjectPasswordHashes` emits no `project.user_password_set`: a CDM import runs under `runWithEventSuppression` (`project-import.service.ts:267`), so emitting from it would have needed a suppression bypass. Decision by Alejandro: imports stay silent like every other import write; the import completion counters and the export fingerprint are the mirror's signals. The "Import path" bullet above is superseded: the only emission point is `CredentialService.write()` for non-import writes, change-only. Tests: imports publish nothing (changed, identical re-import, guard lost, `admin-set` skipped).
  - **Standalone publisher.** `ProjectUserService` is constructed with `credentials`, so `CredentialService` cannot depend on it (construction cycle). The event is published by a standalone `ProjectUserCredentialEventPublisher` (`services/project-user-credential-events.service.ts`, port `IProjectUserCredentialEventPublisher` in `@grantjs/core`), a required fifth constructor argument of `CredentialService`; `resolveProjectScope` moved to `lib/project-scope-resolver.lib.ts`. No `IProjectUserService.publishProjectUserPasswordSet`.
  - **REST contract.** The body is `{ scope, password }` (the route needs the scope, as `PUT /:id/email` does) and the response is 200 with the `User`, not 204.
  - **Policy port method.** Handlers cannot import `validateSecretInput`, so `ICredentialService.assertPasswordMeetsPolicy(password)` was added (`setPassword` uses the same check).
  - **`UserHandler` constructor** gained `ICredentialService` and `IProjectOAuthGrantService` (appended after `auth`); six existing handler tests were patched.
  - **Authorized-scope guard (2026-10-28, Principal):** the transport guards authorize against the request scope (`x-scope-tenant`/`x-scope-id` headers, then query, then body) while handlers act on `input.scope` from the body, and nothing compared the two; under an organization-scope header RLS does not restrict `project_users`, so a permission held in one scope could set a password in another project. `setProjectUserPassword` therefore takes `authorizedScope` (both transports pass `context.user?.scope ?? null`) and throws `AuthorizationError('Forbidden')` unless `input.scope` has the same tenant and id, before the policy check and any transaction; slice 5's export has the same guard. The released `setProjectUserEmail` has the same gap; that is an upstream hotfix tracked separately and is not part of this stack.
- Tests (QA drives shape; Backend writes with the slice): unit handler (policy before write; non-member; non-project scope; grants revoked; lockout reset via service); unit credential service (event on change per source; none on same hash; none when import guard wins); e2e `operator-set-password.e2e.test.ts` modelled on `operator-set-email.e2e.test.ts`: Owner sets; Admin sets; Dev/Viewer denied; Dev allowed after `PATCH /api/groups/:id`; REST PUT; policy rejection body has no sample; import ping-pong (set `admin-set`, import other hash → unchanged); import twice same hashes → zero events; sentinel password absent from event/webhook/logs/audit rows.
- **Out of this slice:** export, fingerprint, ADR, web.
- **Fan-out:** independent Security + Verifier after the author stops. Security-full **before** gate 3.

### 5 — API read: export + fingerprint (security-full)

- Owner files: `apps/api/src/handlers/project-users.handler.ts` (or `users.handler.ts` — follow where `ProjectUser` reads live) `exportProjectUserCredentials`: membership check for **all** `userIds` first (any non-member → `NotFoundError`, no partial export), load credentials by `(projectId, userId)` via a new repository read that returns the hash **only on this path** (`project-user-credentials.repository.ts` has `recordColumns` — add an explicit `findHashesForExport` so no existing read grows a hash), build CDM shape, then **audit** `logExport(projectId, { count, kinds })` (new method on `DrizzleAuditLogger`, `apps/api/src/lib/audit/drizzle-audit-logger.ts`, action `export`, `performedBy` from `GrantAuth.userId`); GraphQL query resolver + `queries.ts` (`authorizeGraphQLResolver({ resource: ProjectUser, action: ExportCredentials })`), REST `POST /api/users/credentials/export` (`authorizeRestRoute` same action; OpenAPI marks the response as containing credential hashes); `User.passwordCredential` field resolver under `apps/api/src/graphql/resolvers/users/fields/`, resolved from `context.user.scope` (project scopes only; `null` for any other scope): `null` unless `auth.isAuthorized(ExportCredentials)` for the caller, else `{ source, updatedAt, fingerprint: sha256hex(hash) }` — computed in the service from the same hash-reading repository method, never stored. Patch `grant-api`, `@grantjs/core`.
- **Correction 2026-10-29:** the fingerprint field is `User.passwordCredential`, not `ProjectUser.passwordCredential`: its resolver reads the request's project scope from `context.user.scope` and returns `null` outside `OrganizationProject` / `AccountProject`.
- RLS: the export runs under the request's project scope; confirm `project_user_credentials` RLS (`project-user-credentials.schema.ts`) still applies on the new read (no `SECURITY DEFINER`, no bypass role).
- Tests: e2e `operator-set-password-export.e2e.test.ts`: Owner **denied** export and sees `passwordCredential: null`; a role whose group is granted `ExportCredentials` exports `{ algorithm: 'bcrypt', hash }` equal to the stored hash (sentinel hash visible **here only**), member without credential → `password: null`, one non-member in `userIds` → whole call `NotFound` and **no** audit row; successful call → exactly one audit row with `action = 'export'`, `performed_by` = caller, metadata count, and **no** hash in `old_values`/`new_values`/`metadata`; unauthorized call → no audit row; fingerprint changes after a set and equals `sha256` of the exported hash. Unit: fingerprint is deterministic and lowercase hex.
- **Out of this slice:** write path, web, ADR text (slice 6 — but the ADR's claims must match what this slice built; Architect reads this diff).
- **Fan-out:** independent Security + Verifier. Security-full **before** gate 3 — this slice is the "hashes leave Grant" review.

### 6 — ADR amendment (light; Architect)

- Owner files: `decisions/0010-cdm-import-of-bcrypt-password-hashes.md`, `decisions/0011-password-as-a-scoped-credential.md` (§ 6 `:370-371` event now emitted; § 8 `:457-461` catalog name, payload, change-only, sources incl. `admin-set`; the export exception with permission/audit/holder; fingerprint rationale; corrections: `:350` revocation lives in `auth.handler.ts:909`, `credential.service.port.ts:126` comment stale), `docs/core-concepts/events-webhooks-notifications.md` if not already updated by 3/4. No code. No changeset (docs) unless the repo's changeset policy covers `decisions/`.
- **Fan-out:** Architect writes; Security reads for the export exception wording; Verifier runs docs lint/format.

### 7 — Web / i18n (light)

- Owner files: `apps/web/components/features/users/user-actions.tsx:24,51-53,77-97` (add "Set password" beside "Set email"), new `apps/web/components/features/users/user-set-password-dialog.tsx` modelled on `user-set-email-dialog.tsx` (`useGrant(ResourceSlug.ProjectUser, ResourceAction.SetPassword)`; form `password` + `confirmPassword` with `passwordPolicySchema` from `apps/web/lib/validation/password-policy.ts`; `autoComplete="new-password"`; reset form state on close; no toast echoing the value), `apps/web/hooks/users/use-user-mutations.ts` (`useSetProjectUserPassword` from the generated document), `apps/web/components/features/users/{index.ts,user-types.ts}`, `apps/web/i18n/locales/{en,de}.json` (action, dialog, toasts, `permissions.names.projectUser.setPassword` / `.exportCredentials` + descriptions, so the permission picker shows both). Both project users pages already render `user-actions`.
- **Out of this slice:** export UI; showing `passwordCredential` anywhere in the dashboard.
- Tests: Verifier typecheck/lint; existing UI patterns.
- **Fan-out:** Verifier after author. Security not required (API is the boundary; UI is hide-the-button).

## Out of this stack

| Item                                                             | Why it stays out                                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| **Self-service project password change**                         | ADR 0011 follow-up; different actor and proof                  |
| **Generated / one-time passwords, mail**                         | Spec non-goal                                                  |
| **Platform session revocation / `UserSession` actions**          | No operator action exists; separate story                      |
| **API-key secret export**                                        | Later story adds a `CredentialKind`; enum left extensible here |
| **Marking Email verified on operator set**                       | Verification is the reset flow's proof, not the operator's     |
| **Dashboard credential badge from `passwordCredential`**         | Field is export-gated; UI non-goal                             |
| **`project-user-api-key.cdm-entity.ts` / `api-keys.service.ts`** | Fingerprint story; coordinator stop-line                       |
| **Changing the CDM import guard**                                | `cdm-import` stays the only overwritable source                |

## Dependencies / notes

- **Depends on v1.19.0 on `main`** (`#637`, `#638`). Trunk from `af6c102f`.
- Slice 1 before 4 so `'admin-set'` type-checks in the service.
- Slice 2 before 3 so schema descriptions and resolvers reference both actions.
- Slice 3 before 4 and 5 so handlers use generated types.
- Slice 4 before 5 so the export e2e can set an `admin-set` credential and check its fingerprint; 5 before 6 so the ADR describes what was built.
- **Atomicity:** set = one transaction (credential write + audit + lockout reset + grant revocation + event). Export = read + audit row in one transaction so a failed audit write fails the export.
- **Test infrastructure:** e2e needs the Docker stack (`pnpm test:e2e:up`, AGENTS.md § Testing). Webhook subscription in the e2e setup must include `project.user_password_set` (the set-email e2e shows the setup shape).
- **No customer tenant names** in repo plans, fixtures, PRs, or docs.
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.
- Fan-out that is free: Security and Verifier on slices 2–5 after the author stops. Do not put two writers in one tree.

## Human gates

- [x] Gate 2: Stack plan approved — Alejandro 2026-10-28.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep + security-full review complete.

## Cleanup

- [ ] `git worktree remove /workspace/worktrees/grant-platform-feat-operator-set-password`
- [ ] Local slice branches deleted
- [ ] Remote slice branches deleted
- [ ] Remote story trunk deleted
- [ ] Stack plan status → `merged-to-main`
