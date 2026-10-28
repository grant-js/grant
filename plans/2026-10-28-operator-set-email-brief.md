# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Stack: [2026-10-28-operator-set-email-stack.md](./2026-10-28-operator-set-email-stack.md).

Grounded on `origin/main` at `eccfd7f5` (package version **v1.18.9**; `#625` CDM replace-unchanged-keys is already on `main`). Independent of that CDM API-key work. Open-source language only: operator onboarding plus a legacy IAM mirror keyed by exact email. Do not name customer tenants or deployments.

## Metadata

- **Slug**: `operator-set-email`
- **Date**: 2026-10-28
- **Author** (human / PM agent): PM agent
- **Status**: approved

## Objective

Operators can give a project user an email (on create, or later) as an unverified Email authentication method, under a new ordinary `ProjectUser:SetEmail` permission. A downstream identity mirror can read that address and hear a project-deliverable event when it changes, without the address appearing in event `data`, webhook payloads, or structured logs.

## Acceptance criteria

- [ ] **Optional email on operator `createUser` in project scope** (GraphQL `createUser` and REST `POST /users`). When `email` is present, the call creates an _unverified_ Email authentication method (`provider = email`, `isVerified: false`) for the new user after project membership is written. Without `email`, behaviour is unchanged (name/roles/groups/tags/metadata only). `email` is rejected with `ValidationError` outside `OrganizationProject` / `AccountProject`. Passing `email` requires `ProjectUser:SetEmail` **in addition to** `User:Create`: a caller without SetEmail gets `AuthorizationError` for the **whole** call — no user row, no silent drop of the address. Check both permissions **before** any write (handler fail-closed; `authorizeGraphQLResolver.resolveActions` is OR, not AND, so it cannot express this).
- [ ] **`setProjectUserEmail` mutation** (GraphQL `setProjectUserEmail(input: SetProjectUserEmailInput!): User!`; REST `PUT /api/users/:id/email`). Target must already be a member of the project in scope; otherwise `NotFoundError` (not-a-member), not a create-user. Adds the Email method if the user has none; replaces `providerId` on the existing Email method otherwise. A changed address is **unverified** (`isVerified: false`), including when the previous address was verified. Same uniqueness rule as create. Same address after normalize is a no-op (no write, no event, do not flip `isVerified`). One Email method per user (existing “one method per provider” service rule — there is no unique index on `(userId, provider)`).
- [ ] **Permission `ResourceAction.SetEmail` on `ResourceSlug.ProjectUser`**. Ordinary extensible action, defined and checked like `UploadPicture` / `ResendEmail`: declared in `@grantjs/constants`, granted through groups, enforced by the standard permission check — **no hard-coded role test**. Default placement (operator set-password is **not** in-repo as a `ResourceAction`; do **not** copy `User:Create`, which **is** granted to Organization Dev via `UserDev`):
  - `ProjectUserOwner` → `SetEmail`, assigned to Organization Owner **and** Personal / Organization Account Owner
  - `ProjectUserAdmin` → `SetEmail`, assigned to Organization Admin
  - **Not** in `ProjectUserDev`, `ProjectUserViewer`, or `ProjectUserCommon`
    An organization that adds `ProjectUser:SetEmail` to its Developer role’s group gets it with no code change. Tests per role, including “Developer denied by default, allowed once the permission is granted.” Existing roles and permissions are not otherwise changed. Filling `ProjectUserOwner` / `ProjectUserAdmin` (today empty `permissions` and empty `assignedRoles`) is additive.
- [ ] **How the new standard permission reaches organizations bootstrapped earlier (ADR 0001):** standard roles/groups/permissions are **instance-wide**, looked up by name in `seedAll` (`packages/@grantjs/database/src/scripts/seed-permissions.ts`). Organizations share `Organization Owner` / `Organization Admin`; they do not clone those rows. `seedAll` is idempotent: it inserts the new permission, updates `resources.actions` JSON on `ProjectUser`, and creates the new `group_permissions` / `role_groups` links. `bootstrapDatabase()` runs `seedAll`; ADR 0001 gates that call on `DB_BOOTSTRAP_ON_BOOT` (default `true`). Kubernetes deployments that leave the default get the permission on next boot; serverless must run the migrate/seed step together with the flag (ADR 0001: never the flag alone). Same operational note as `Organization:UploadPicture`: existing deployments need `db:seed` (or boot-time bootstrap) so the new permission is inserted. No per-org backfill job.
- [ ] **Event `project.user_email_changed`**: project-deliverable under ADR 0012, webhook-deliverable, `webhookOnly('membership')` (transactional, empty notification audience — operator action, not an inbox row). Publish with explicit project scope via `ProjectUserService.resolveProjectScope` (same as `project.user_added`). `subjectUserId` = the project user. `data.after` carries **ids only**: `projectId`, `userId`, `operation: 'added' | 'changed'`. Never the address. Emitted **only** when the stored normalized address actually changes. A test with a sentinel address (`sentinel-set-email@example.test`) shows it reaches neither `data`, the webhook payload, nor structured logs. Webhook redaction today does **not** match `email` / `providerId` keys (`webhook-redaction.lib.ts`) — omitting the address is the control, not redaction. Existing auth-method **audit** `newValues.providerId` stays as it is (compliance trail on that table); this story’s lock is the new event + logs + webhook.
- [ ] **Authorized read for the mirror — verdict: a project-scoped API key _can_ read `User.authenticationMethods`.** GraphQL `users` and REST `GET /users` authorize only `User:Query` (REST `GET /users/:id` authorizes `User:Read`). Nested `authenticationMethods` is a repository relation (`users.repository.ts`) with **no** extra `UserAuthenticationMethod:Read` check. `UserAuthenticationMethodCommon` is own-methods-only (`resource.userId = {{user.id}}`) and applies to the dedicated resource; there is no public list of other users’ methods (`myUserAuthenticationMethods` is self-only). The shipped `GetUsers` / `GetUsersList` documents already request `authenticationMethods { provider providerId }`. `User.authenticationMethods.isVerified` is already on the type (the shipped documents do not request it; the lock test must). `User:Query` is granted to every org role via `UserCommon`, and to account owners via `AccountProjectUserOwner`. **Do not add** a gated `ProjectUser.email` / `isVerified` field. Lock with a test: an `OrganizationProject` (and `AccountProject`) API key whose role includes `User:Query` can read `provider`, `providerId`, and `isVerified` for another project member. A `ProjectUser`-tenant key only can if that user holds `User:Query`. This rides on `User:Query`, not `ProjectUserCommon`. Tightening Viewer access to nested emails is **out of this story**. If implementation discovers this verdict is wrong, stop and amend this brief — do not add a field in a later slice without a schema change.
- [ ] **Web UI:** optional email field on project-scoped “create user” (`UserCreateGeneralCard` / `createUserSchema`), shown only when `useGrant(ProjectUser, SetEmail)` is granted (in addition to Create). A “set email” action on a project user in `user-actions.tsx`, shown only with that permission. i18n `en` + `de`. No email field on organization-scoped create-user.
- [ ] **Uniqueness** — operator create/set follow Grant’s existing identity uniqueness, **never** CDM `findBy: email` reuse. Quote the rule this PR follows (from `docs/architecture/security.md` and the unique index):

  > A provider can only be linked to one user account (no sharing), and a user can only have one method per provider (no duplicates).

  Database: unique index `user_auth_methods_provider_provider_id_unique` on `(provider, providerId) WHERE deletedAt IS NULL` (`user-authentication-methods.schema.ts`). That index is **case-sensitive**; `findByProviderAndProviderId` uses exact `eq`. Service create already throws `ConflictError('This authentication method is already connected to another account')` when another user holds the pair (`UserAuthenticationMethodService.createUserAuthenticationMethod`). Operator set/create uses that path after normalize `trim` + lowercase (same helper as `AuthHandler.normalizeEmail`). An address already held by another identity as `provider = email` is a uniqueness error, never a silent reuse. CDM `UserProvisionCdmEntity.applyEmailIdentity` **reuses** an existing catalog row — import-only; operator paths must not call it. One-method-per-provider on create is a `BadRequestError`; operator replace must **update** the existing Email method rather than hitting that error.

- [ ] **Tests + docs + changeset.** Unit/integration: uniqueness (other identity, same user no-op, add vs change, case-normalize), permission matrix (Owner/Admin allow; Dev/Viewer deny; Dev allow after group grant; missing SetEmail on `createUser` with email fails the whole call), membership required, project-scope only, event ids-only + sentinel, API-key read of `authenticationMethods`. Docs: `docs/architecture/rbac.md` (Project User groups + matrix), `docs/core-concepts/resources.md` (action list), `docs/core-concepts/events-webhooks-notifications.md` (catalog). Changeset: **minor** `@grantjs/schema` (new mutation, input field, event type); **patch** `grant-api`, `@grantjs/constants`, `@grantjs/core` (port method), `apps/web`. `pnpm release:check`. Never skip husky.

Each slice ships Verifier-clean. Agents do not merge.

## Named contracts

| Kind                         | Name                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------- |
| Permission                   | `ResourceAction.SetEmail` on `ResourceSlug.ProjectUser` (`ProjectUser:SetEmail`) |
| GraphQL mutation             | `setProjectUserEmail`                                                            |
| GraphQL / REST create field  | `CreateUserInput.email` / `POST /users` body `email` (optional)                  |
| REST set                     | `PUT /api/users/:id/email`                                                       |
| Event type                   | `project.user_email_changed`                                                     |
| Event `data.after.operation` | `'added'` \| `'changed'`                                                         |

## No database migration

Email is not a `users` column. Identity is `user_authentication_methods` (`provider` + `providerId`). The uniqueness index already exists. `resources.actions` is JSON updated by `seedAll`, not a migration. **Do not generate a Drizzle migration.** If implementation discovers a real need (it should not), stop and say why in this brief before writing SQL.

## CDM / API-key fingerprint — do not touch

This story must **not** edit `apps/api/src/lib/cdm/entities/project-user-api-key.cdm-entity.ts` or `apps/api/src/services/api-keys.service.ts`. Independent of v1.18.9 CDM key-fingerprint work (`#625`). If a slice would need those files, stop and tell the coordinator.

## Operator set-password

**Not in-repo** as a `ResourceAction` or operator mutation. `CredentialService.setPassword` / settings `setPasswordSchema` are self-service or credential-import. Default group placement is Owner/Admin + account owners on `ProjectUserOwner` / `ProjectUserAdmin`, **not** Dev — even though `User:Create` _is_ granted to Organization Dev. SetEmail is the narrower control so a Developer cannot pass `email` on `createUser`.

## Non-goals

- Email verification flows, magic-link proof, or sending mail when an operator sets an address
- Password handling / operator set-password (separate story)
- Who may remove users or assign roles
- CDM `findBy: email` reuse, import/export, or API-key fingerprint / `api-keys.service.ts`
- Adding `email` / `isVerified` on `ProjectUser` (read already exists on `User.authenticationMethods`)
- Field-level tightening of nested `User.authenticationMethods` so Viewer cannot see emails
- New `users.email` column or unique index
- Changing existing `user.created` / `project.user_added` payloads to include the address
- NIST IAM maturity, IAL/AAL, OIDC OP, SAML
- Published `@grantjs/{client,server,cli}` contract changes beyond additive schema types

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [x] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [x] GDPR export / deletion / PII
- [ ] None of the above

**Why:** New identity write (global Email catalog), a new ResourceAction, project-scoped events that must not carry the mailbox, and a lock that project-scoped API keys can already read nested authentication methods. Wrong uniqueness → two Grant users share a mailbox or a silent reuse with another identity. Wrong permission default → Dev/Viewer can set emails (Dev already has `User:Create`), or older orgs never receive the action. Event/`data`/logs that include the address leak PII to every webhook subscriber. RLS and project-membership checks stay fail-closed. Sentinel test is blocking on the event slice.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior Frontend, Senior QA, Senior Security, Verifier.

Architect stays inactive: no new resource, no new port package, no new table. Activate only if Gate 2 rejects `ProjectUser:SetEmail` for a different resource.

## Human gate

- [x] Gate 1: Story brief approved — Alejandro 2026-10-28. Gates 1–2 approved together.
- [ ] Gate 4: Story → `main` — not opened; agents do not merge.
