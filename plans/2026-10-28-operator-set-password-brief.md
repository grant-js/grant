# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Stack: [2026-10-28-operator-set-password-stack.md](./2026-10-28-operator-set-password-stack.md).

Grounded on `origin/main` at `af6c102f` (package version **v1.19.0**; `#637` operator set-email is on `main` and is the shape this story mirrors). Open-source language only: operator onboarding plus a downstream identity mirror that keeps a legacy IAM in step with Grant. Do not name customer tenants or deployments.

## Metadata

- **Slug**: `operator-set-password`
- **Date**: 2026-10-28
- **Author** (human / PM agent): PM agent (Claude, for Alejandro)
- **Status**: approved

## Objective

Operators can set or replace a project user's password under a new ordinary `ProjectUser:SetPassword` permission, with the same policy, lockout reset and grant revocation a self-service reset gives. Every project-credential write that changes the stored hash publishes an ids-only `project.user_password_set` event (ADR 0011 § 8, never implemented), and a downstream identity mirror that holds a dedicated, non-standard `ProjectUser:ExportCredentials` permission can export the bcrypt hash in CDM shape — the one audited exception to "APIs expose only whether a password exists" — and read a non-secret fingerprint to know when to.

## Acceptance criteria

- [ ] **Permission `ResourceAction.SetPassword` on `ResourceSlug.ProjectUser`.** Ordinary extensible action, declared and checked exactly like `SetEmail` (`packages/@grantjs/constants/src/permissions/resources.ts:18,168-170`, `groups.ts:599-612`, `permissions.ts:1205-1219`): in `@grantjs/constants`, granted through groups, enforced by `authorizeGraphQLResolver` / `authorizeRestRoute` — **no hard-coded role test**. Default placement: `ProjectUserOwner` (Organization Owner, Personal Account Owner, Organization Account Owner) and `ProjectUserAdmin` (Organization Admin). **Not** in `ProjectUserDev`, `ProjectUserViewer` or `ProjectUserCommon`. An organization that adds `ProjectUser:SetPassword` to its Developer role's group gets it with no code change — e2e "Dev can set password after `ProjectUser:SetPassword` is granted to that role group", built like `operator-set-email.e2e.test.ts:202-268` (`PATCH /api/groups/:id` with the merged `permissionIds`). Existing roles and permissions are not otherwise changed.
- [ ] **Permission `ResourceAction.ExportCredentials` on `ResourceSlug.ProjectUser`**, declared the same way but placed in **no standard group** (not Owner, not Admin, not Common). It is granted deliberately, per organization, to the group of the role a mirror's API key carries. Test: Owner and Admin are denied the export by default; a role whose group is granted the action can export. _(2026-10-28: the seed creates permission rows only from group templates, so slice 2 adds `STANDALONE_PERMISSIONS` + seed support to give this action a row with no group.)_
- [ ] **How the two permissions reach organizations bootstrapped earlier (ADR 0001):** standard roles/groups/permissions are instance-wide and `seedAll` is idempotent (`packages/@grantjs/database/src/scripts/seed-permissions.ts`), run by `bootstrapDatabase` when `DB_BOOTSTRAP_ON_BOOT` is true. Same operational note as `ProjectUser:SetEmail` in `docs/architecture/rbac.md`; serverless deployments run migrate/seed with the flag. No per-org backfill.
- [ ] **Credential source `admin-set`.** Added to `CREDENTIAL_SOURCES` (`packages/@grantjs/core/src/ports/repositories/credential.repository.port.ts:14-21`). The list is also a **DB CHECK constraint** on `project_user_credentials.source` and `user_credentials.source` (`packages/@grantjs/database/src/schemas/project-user-credentials.schema.ts:53`, `user-credentials.schema.ts:46`, migration `0086_broken_rage.sql:35,69`) and is pinned by `credentials.schema.test.ts:100`, `apps/api/src/services/credentials.schemas.ts:17` and the data-export schema `apps/api/src/rest/schemas/users.schemas.ts:298` — so this story **does** carry one Drizzle migration (constraint widening only, no data change). Because `importProjectPasswordHashes` and the repository `upsertImported` never overwrite a credential whose source is not `cdm-import` (`credentials.service.ts:285-287`; `project-user-credentials.repository.ts:183-185`), an operator-set password is final with respect to the forward import — lock with a test: `admin-set` row, then an import of a different hash for the same user → `skippedExisting`, hash unchanged.
- [ ] **Mutation `setProjectUserPassword`** (GraphQL `setProjectUserPassword(input: SetProjectUserPasswordInput!): User!`; REST `PUT /api/users/:id/password`), gated at the transport layer with `ProjectUser:SetPassword` exactly as `setProjectUserEmail` is (`apps/api/src/graphql/resolvers/mutations.ts:122-129`, `users.routes.ts:150-176`). The operator supplies the password. Rules:
  - project scopes only (`OrganizationProject` / `AccountProject`) → otherwise `ValidationError`, as `assertProjectScopeForEmail` (`users.handler.ts:264-268`);
  - target must already be a member of the project → otherwise `NotFoundError('User')`, never a create;
  - policy check with `validateSecretInput(passwordPolicySchema, …)` **before** any write (`apps/api/src/services/user-authentication-methods.schemas.ts:116-150`; `validation.ts:100-113` never echoes the value);
  - write through `CredentialService.setPassword({ scope, userId, password, source: 'admin-set' })` (`credentials.service.ts:159`), which already writes the credential audit row with `performedBy` = the operator and resets the lockout (`recordWrite`, `:129-156`);
  - revoke the user's project-app OAuth grants with `projectOAuthGrants.revokeAllForUserInProject` as `completeReset` does (`project-password-reset.handler.ts:192`; `project-oauth-grants.service.ts:161-186`). Platform `user_sessions` are **not** touched (project users authenticate to project apps; `completeReset` does not touch them either). Do **not** mark the Email method verified (that is the reset flow's proof of mailbox ownership, which an operator set is not);
  - the password never appears in logs, GraphQL errors, audit rows or event data (sentinel test). The same password set twice is **not** a no-op: a new bcrypt hash is written and the event fires (the hash changed; this is unlike set-email).
- [ ] **Event `project.user_password_set`** — the catalog name for ADR 0011 § 8's `project_user.password_set` (`decisions/0011-password-as-a-scoped-credential.md:457-461`): the `project.user_*` prefix is what the catalog uses (`event-catalog.ts:133-135,153-154`) and what webhook redaction's `isUserEvent` matches (`webhook-redaction.lib.ts:70-76`); the ADR amendment records the rename. Project-deliverable under ADR 0012, `webhookOnly('membership')` like `project.user_email_changed` (`event-catalog.ts:230`), explicit project scope via `ProjectUserService.resolveProjectScope`, `subjectUserId` = the project user, `aggregate: { kind: 'projectUser', id }`. `data.after` carries **ids and source only**: `{ projectId, userId, source }` with `source` ∈ `CREDENTIAL_SOURCES` — never a hash, a password or a key containing "password" (redaction would turn it into `[redacted]`, `webhook-redaction.lib.ts:14-29`; omission is the control, not redaction). Emitted on **every non-import project-credential write** (`admin-set`, `reset`, future `change`), and **only when the stored hash actually changes** — `CredentialService.write` already loads `existing` before the upsert (`credentials.service.ts:120-123`); compare `existing?.hash` with the written hash. **CDM imports stay silent**, like every other import write (`runWithEventSuppression`, `project-import.service.ts:267`): `importProjectPasswordHashes` emits no `project.user_password_set`, so there is no echo to ignore and nothing to burst; the mirror learns import-side changes from the import's completion event with its counters (ADR 0011 § 8) and from the export fingerprint. _(Amended 2026-10-28 by Alejandro: the first draft had an import emit N events with `source: 'cdm-import'`; that would have needed a suppression bypass.)_ Lockstep catalog files as in `#637`: `apps/api/src/lib/notifications/notification-email-families.ts`, `tests/unit/lib/events/event-catalog-coverage.test.ts`, `docs/core-concepts/events-webhooks-notifications.md`.
- [ ] **Credential export for the mirror.** GraphQL query `exportProjectUserCredentials(input: { scope, userIds: [ID!], kinds: [CredentialKind!] = [PASSWORD] })` and REST `POST /api/users/credentials/export` (body `userIds`, `kinds`; POST because it is an audited action with a body, not a cacheable read), gated at the transport layer with `ProjectUser:ExportCredentials`. Returns, in CDM shape, `users[] { userId, password { algorithm: 'bcrypt', hash } }` for the requested project members who have a project credential; members without one are listed with `password: null`; non-members are refused as a whole (`NotFoundError`), never silently skipped. `kinds` is an enum with one member today (`PASSWORD`) so a later story adds API-key secrets as a kind, not a second export. **Every successful call writes one audit row** on `project_user_credential_audit_logs` with action `export`, `performedBy` the caller, metadata `{ userIds count, kinds }` — never a hash (the logger today has create/update/delete methods only, `apps/api/src/lib/audit/drizzle-audit-logger.ts`; add the method). Unauthorized calls are refused by the transport gate and write **no** export row. Rate/size: `userIds` capped at the existing page maximum; the whole project is many pages, not one call.
- [ ] **`passwordCredential { source, updatedAt, fingerprint }` on `User`** _(2026-10-29: moved from `ProjectUser` to `User`, resolved in the request's project scope — `ProjectUser` is returned by no query or mutation, so the field was unreachable; decision 8.)_ (`packages/@grantjs/schema/src/schema/users/types/user.graphql`), nullable (`null` when the request scope is not a project scope or the user has no project credential there). `fingerprint` = lowercase hex SHA-256 of the stored bcrypt hash string — a change detector for the mirror, not a secret (bcrypt output is not recoverable from its digest; the ADR amendment states this). **Readable only by a caller holding `ProjectUser:ExportCredentials`**; for anyone else the field resolves to `null`, not an error, so existing `GetProjectUsers`-style documents keep working. `UserAuthenticationMethod.hasPassword` stays as it is (platform scope, self only — `user-authentication-methods.service.ts:63-86`, `me.handler.ts:331-343`).
- [ ] **ADR amendment** to `decisions/0010-cdm-import-of-bcrypt-password-hashes.md` and `0011-password-as-a-scoped-credential.md`: the export as the one audited exception to "APIs expose only `hasPassword`", its permission, audit and intended holder; the fingerprint and why it is not secret; the `admin-set` source; the event's catalog name, payload, change-only rule and that CDM imports stay silent (implementing § 8); the stale claims the fact check found (`:350` session revocation lives in `auth.handler.ts:909`; `:536-539` still true — nothing writes `change` in project scope).
- [ ] **Web UI:** a "Set password" action on a project user in `apps/web/components/features/users/user-actions.tsx`, shown only with `useGrant(ResourceSlug.ProjectUser, ResourceAction.SetPassword)`, opening a dialog modelled on `user-set-email-dialog.tsx` with the password policy hints (`apps/web/lib/validation/password-policy.ts`) and a confirm field; the value is never echoed, logged or kept in client state after submit. i18n `en` + `de`, including `permissions.names.projectUser.{setPassword,exportCredentials}`. **No export UI** (the export is for machines).
- [ ] **No hash or password leaks:** tests with a sentinel password and a sentinel hash show neither reaches project-user metadata, event `data`, webhook payloads, structured logs, GraphQL errors, REST error bodies or audit rows (`old_values`/`new_values` carry `auditValues`, which already exclude the hash — `credentials.service.ts:39-47`). The export response is the only place a hash appears.
- [ ] **Tests + docs + changesets.** Unit/integration: policy rejection before write; permission matrix (Owner/Admin allow set; Dev/Viewer deny; Dev allow after group grant; Owner/Admin denied export; granted role allowed export); membership; project-scope only; grant revocation; lockout reset; import ping-pong; event per non-import source + change-only + import silent; export audit row + unauthorized-not-audited; fingerprint gating; sentinels. Docs: `docs/architecture/rbac.md`, `docs/core-concepts/resources.md`, `docs/core-concepts/events-webhooks-notifications.md`, REST OpenAPI. Changesets only for packages `.changeset/config.json` does not ignore: **minor** `@grantjs/schema` (mutation, query, field, enum, event type); **patch** `grant-api`, `grant-web`. `@grantjs/{core,constants,database}` are ignored packages — a changeset naming them fails `release:check` (found in slice 1); their changes ride on the `grant-api` changeset. `pnpm release:check`. Never skip husky.

Each slice ships Verifier-clean. Agents do not merge.

## Named contracts

| Kind                | Name                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Permission (set)    | `ResourceAction.SetPassword` on `ResourceSlug.ProjectUser` (`ProjectUser:SetPassword`)               |
| Permission (export) | `ResourceAction.ExportCredentials` on `ResourceSlug.ProjectUser` — in no standard group              |
| Credential source   | `'admin-set'` in `CREDENTIAL_SOURCES` (+ CHECK constraints, migration)                               |
| GraphQL mutation    | `setProjectUserPassword(input: SetProjectUserPasswordInput!): User!`                                 |
| REST set            | `PUT /api/users/:id/password`                                                                        |
| GraphQL query       | `exportProjectUserCredentials(input: ExportProjectUserCredentialsInput!)`                            |
| REST export         | `POST /api/users/credentials/export`                                                                 |
| Enum                | `CredentialKind { PASSWORD }`                                                                        |
| Field               | `User.passwordCredential { source, updatedAt, fingerprint }` (nullable, project scope, export-gated) |
| Event type          | `project.user_password_set` (`webhookOnly` membership; `data.after = { projectId, userId, source }`) |
| Audit action        | `export` on `project_user_credential_audit_logs`                                                     |

## Decisions taken in this brief (agreed by Alejandro at Gate 1, 2026-10-28)

1. **Operator supplies the password**; no generated one-time password, no mail. Matches the product decision and keeps mail out of scope.
2. **Revoke project-app grants, leave platform sessions** — identical to `completeReset`. Revoking platform sessions would need a `UserSession` operator action that does not exist (`resources.ts:171-173`, own-sessions-only `UserSessionCommon`) and is a different story.
3. **One migration** for the `admin-set` CHECK constraints rather than reusing `reset`/`change`, so audit rows and the event's `source` say what happened and the import guard keeps working by the existing rule.
4. **Event emitted from `CredentialService.write`** (inject the events port), not from each caller, because the rule is "every non-import project-credential write" and the service is the only write path. CDM imports stay silent like every other import write (amended 2026-10-28): the import completion event with counters is the signal, and `importProjectPasswordHashes` never publishes.
5. **`project.user_password_set`, not the ADR's `project_user.password_set`** — catalog and redaction prefix consistency; ADR amended.
6. **Export is POST with a body and is audited**; the fingerprint field is gated by the same export permission rather than by `ProjectUser:Read`, so Viewers learn nothing new about credentials. A dashboard "password set by admin on …" badge is a non-goal.
7. **Same password twice re-hashes and fires the event.** Detecting "same password" would mean verifying the new value against the stored hash on an operator path — not worth the comparison oracle.
8. **Field on `User`, not `ProjectUser`** (agreed by Alejandro 2026-10-29): resolved in the request's project scope and `null` elsewhere, because the users list under a project returns `User` and nothing returns `ProjectUser`.

## Non-goals

- Self-service project-scope password change (ADR 0011 follow-up; nothing writes `change` in project scope today)
- Generated / one-time passwords, mailing a password or a reset link from the operator path
- Revoking platform `user_sessions`, or any new `UserSession` action
- API-key secret export (a later story adds a `CredentialKind`; this story leaves the enum extensible)
- Marking the Email method verified on operator set
- Changing `hasPassword` semantics or exposing project credential existence to roles without the export permission
- Any change to the CDM import's own guard (`cdm-import` is still the only overwritable source)
- `project-user-api-key.cdm-entity.ts` / `api-keys.service.ts` (fingerprint story; stop-line)
- Who may remove users or assign roles

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [x] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [x] GDPR export / deletion / PII
- [ ] None of the above

**Why:** this story writes another person's credential, revokes their grants, and — for the first time — lets an API caller read bcrypt hashes out of Grant. Wrong permission default → Dev/Viewer set passwords or any Owner exports hashes. A missing membership check → a credential written for a user outside the project (RLS on `project_user_credentials` must stay fail-closed). Hash or password in event `data`, logs, errors or audit rows → leak to every webhook subscriber or log reader. Export without an audit row → an untraceable bulk read. The import ping-pong test and the change-only event test are blocking: without them a nightly import either overwrites operator passwords or floods subscribers.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior Frontend, Senior QA, Senior Security, Verifier.

Architect: **active for the ADR amendment only** (two ADRs change; no new resource, package or table).

## Human gate

- [x] Gate 1: Story brief approved — Alejandro 2026-10-28, with the seven decisions below agreed as written. Gates 1–2 approved together, as on `operator-set-email`.
- [ ] Gate 4: Story → `main` — not opened; agents do not merge.
