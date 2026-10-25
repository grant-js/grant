# Changelog

All notable platform releases (apps, Docker images, and publishable npm packages) are documented here.
Package-specific histories also live under `packages/@grantjs/*/CHANGELOG.md`.

## 1.18.7

### Platform

**Docker images:** tagged `:1.18.7` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.18.7** (fixed group with apps).

### Patch Changes

- c58ac17: Overlap independent RBAC lookups on an authorization cache miss so `getUserPermissions` no longer walks the four permission sources as a single sequential chain.

- c58ac17: Invalidate cached authorization results for the written tenant only, so an IAM write in tenant A no longer drops tenant B's hot allow-cache.

## 1.18.6

### Platform

**Docker images:** tagged `:1.18.6` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.18.6** (fixed group with apps).

### Patch Changes

- 3950594: Page scoped IAM lists in SQL (search, tags, explicit ids, sort, limit) against a pivot subquery so a 50-row page does not materialize the full accessible ID set.

## 1.18.5

### Platform

**Docker images:** tagged `:1.18.5` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.18.5** (fixed group with apps).

### Patch Changes

- f344d18: Run IP and auth-sensitive rate limits before request context so a 429 does not authenticate or construct the handler toolbox. Optional per-tenant limits still run after authenticate.

- f344d18: Build the request handler toolbox once after authenticate. Scoped RLS requests keep SET LOCAL on the request transaction; auth uses a thin unscoped Grant bootstrap.

- f344d18: Mount one REST router for `/api` instead of allocating the route tree per request. Handlers still come from the request context.

## 1.18.4

### Platform

**Docker images:** tagged `:1.18.4` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.18.4** (fixed group with apps).

### Patch Changes

- 0148f5f: Return the scoped RLS request-transaction client to the pool at COMMIT. After-commit work (job and webhook enqueue) runs on the pool afterward, still before the HTTP response is flushed, so Lambda freeze cannot drop the enqueue and a failed COMMIT is not answered as success.

## 1.18.3

### Platform

**Docker images:** tagged `:1.18.3` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.18.3** (fixed group with apps).

### Patch Changes

- 9eff88e: GraphQL `login`, `register`, and `refreshSession` now share the auth-sensitive rate-limit bucket with REST login (including unnamed documents that are those operations), so GraphQL password guessing is not limited only by the global IP cap.

- 9eff88e: GraphQL min-AAL now fails closed on unnamed operations when AUTH_MIN_AAL_AT_LOGIN=aal2.

- 9eff88e: GraphQL queries now have depth and complexity limits, and list `limit` is clamped to the configured max page size. Public `-1` is no longer an unbounded scan.

- 9eff88e: IAM cascade deletes now chunk teardown and batch outbox inserts, still emitting one revoke per subject.

- 9eff88e: Deleting a role, group, or permission now clears the authorization cache so cached grants cannot outlive the cascade.

- 9eff88e: JWKS HTTP endpoints now cache getPublicKeysForJwks payloads per issuer for a short TTL.

- 9eff88e: TOTP and recovery-code verification now enforce `AUTH_MFA_VERIFY_MAX_ATTEMPTS` per user in a rolling `AUTH_MFA_VERIFY_WINDOW_MINUTES` window, so MFA codes cannot be guessed without bound on platform or project verify paths.

- 9eff88e: Project OAuth refresh now always intersects the stored grant with the current app scope allowlist. Clearing the allowlist (or leaving no overlap) fails closed instead of keeping the old grant slugs.

- 9eff88e: Organization member lists now page members and invitations in SQL and reject public `limit: -1`.

- 9eff88e: Platform (console) email/password login now enforces the same per-user lockout as the project-app password provider (`AUTH_MAX_FAILED_LOGIN_ATTEMPTS` / `AUTH_LOCKOUT_DURATION_MINUTES`), recording the attempt before verification so parallel guesses cannot share one remaining try.

- 9eff88e: Project-app tokens no longer mint when the consent intersection is empty, and `Grant.isAuthorized` denies `projectApp` when `scopes` is missing or empty, so an empty claim cannot fall through to the user's full project RBAC.

- 9eff88e: Project-app update and delete now require the app to belong to the scoped project and persist with `{ id, projectId }`, so a cross-project id cannot mutate or soft-delete another project's OAuth app.

- 9eff88e: Enable PostgreSQL row-level security on `project_apps` and `project_oauth_connections` so a missed application `WHERE` cannot read another project's OAuth app or social-connection row.

- 9eff88e: Session refresh now copies `isVerified` from the session’s authentication method (the same source as login) instead of defaulting the JWT claim to `true`. Unverified users stay behind the email-verification wall after the access token refreshes.

- 9eff88e: Reuse of a rotated refresh token now revokes the session or project-OAuth grant family.

- 9eff88e: Project-scoped user lists now load `project_users` only for the current page of user ids.

- 9eff88e: Document residual access JWT window and production trusted client IP header.

## 1.18.2

### Platform

**Docker images:** tagged `:1.18.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.18.2** (fixed group with apps).

### Patch Changes

- 9ee4de7: CDM import now writes this project's `cdmImport` marker (`kind: 'user'`, external key) on the project membership row of every user it assigns, including an email-identified user that already had a Grant identity. The project-scoped `users` read therefore identifies the users a project imported even when the identity was reused; the global user's metadata is not changed.

## 1.18.1

### Platform

**Docker images:** tagged `:1.18.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.18.1** (fixed group with apps).

### Patch Changes

- 2b811c4: CDM import accepts role templates with no permissionRefs: a role may be a pure label whose permissions are attached later. Validation of duplicate keys and tag references is unchanged.

- fcefe73: Webhook envelopes now carry an identity-only `before` (ids, keys, names) for delete and revoke events, so subscribers can tell what was removed. `after` and `delta` are unchanged; no personal data is added.

## 1.18.0

### Platform

**Docker images:** tagged `:1.18.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.18.0** (fixed group with apps).

### Minor Changes

- b4a71fd: Webhooks now report every way access or an entity can change, so a consumer that keeps a copy of who holds what can stay correct. **Deleting a group now removes its memberships and emits one `user.group_revoked` per member**: a soft delete left the `user_groups` rows active (pointing at a deleted group) and a hard delete removed them without an event. **Removing a project member now revokes the user's project roles, groups and direct permissions first** (`user.role_revoked`, `user.group_revoked`, `user.permission_revoked`), where before only the membership row was removed. Deleting a role or a permission already emitted its revokes and is unchanged; there is no cap on the number of revokes, so a large delete is slower, not lossy. Ten event types were added, all webhook-only (no notification or email is created for them): `user.created`, `user.updated` and `user.deleted` (ids and the names of changed fields only; `user.updated` and `user.deleted` reach the user's project subscriptions, and `user.deleted` is emitted by self-deletion and account deletion), `project.user_updated` (project-member metadata), `api_key.deleted` (with the owning user as subject only when the key has exactly one), `tag.created`, `tag.updated`, `tag.deleted`, and `tag.linked` / `tag.unlinked` for tags on users, groups, roles, permissions and resources (`data.after` is `{ tagId, targetKind, targetId }`). Redaction is unchanged and there is no migration; subscriptions listing event types by name are unaffected, and the new types appear in the subscription picker.

- 366391c: **Webhook subscriptions now receive every event relevant to their project, whatever scope the request ran in** (ADR 0012). Until now an event reached a project's subscriptions only when the request that caused it was project-scoped, so editing a project's role from an organization dashboard, a project-app end user's own requests (`projectUser` scope) and system-scope flows such as the sign-up role assignment were never delivered. The publisher now records, on the outbox row, the projects that the role, group, permission, resource or API key an event is about (or a user's assignment to one) is linked to, and the dispatcher fans out to those projects together with the project named by the request scope; an entity linked to several projects reaches each of them, and one linked to no project delivers nothing. A `projectUser` scope is now read as its project. The event scope, the webhook envelope and notifications are unchanged, no event type was added, and there is no migration. A subscription that listed `role.updated` or `user.role_assigned` will see more events than before. `IEventPublisher` gains `resolveLinkedProjectIds`, which the role, group, permission and resource delete paths use to read project links before the delete removes them. The resource delete handler, which unlinks the project pivots before the services publish, now passes the projects it read first, so an organization-scope resource delete reaches the subscriptions of the projects it was linked to.

- 2d0528c: Webhook deliveries now say **which user an event is about**. The CloudEvents envelope has a new extension attribute, `grantsubjectuser: { "userId": "…" }` (or `null` when the event has no subject user), next to `grantactor`. Revoke and remove events such as `user.role_revoked`, `user.group_revoked`, `user.permission_revoked` and `project.user_removed` used to arrive with an empty `data` (the internal `before` snapshot is not delivered) and a `subject` that is the id of the assignment record, so a consumer could not tell whose access changed; it can now read the user id from `grantsubjectuser`. `data` and redaction are unchanged, and the new attribute is additive.

## 1.17.0

### Platform

**Docker images:** tagged `:1.17.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.17.0** (fixed group with apps).

### Minor Changes

- 87ca954: **BREAKING (data and behaviour; the request and response contracts are unchanged).** A password is now a credential with a scope, not a field of the Email authentication method (ADR 0011). This release moves the platform (console) password out of the Email method.

  - **Hashes move.** Platform password hashes leave `providerData.hashedPassword` of the Email method and live in a new `user_credentials` table. Anything that reads `providerData.hashedPassword` or `providerData.passwordSource` breaks; `providerData` no longer carries a hash. The login request (`provider: email`, `providerData.password`), register, change-password and reset-password requests are unchanged, and `hasPassword` is preserved (it now means "a platform credential exists").
  - **The upgrade migrates passwords, it does not wipe them.** Migration `0087` copies every Grant-set hash verbatim (bcrypt keeps its cost), so nobody resets: `source: migrated`. A hash a CDM import wrote is carried only when the address is verified (`source: migrated-import`); **unverified `cdm-import` hashes are dropped** (the person signs in by another method or resets). The migration also removes the plain-text password-reset tokens it finds: **an outstanding reset email stops working and the person requests a new one**, because reset tokens are now stored as a SHA-256 digest and looked up by it (no more scanning every Email method for a plain-text token).
  - **An imported password no longer opens the platform, and it belongs to one project.** A CDM import with `users[].password` no longer writes anything into the Email method: it writes a credential of the **importing project only** (`project_user_credentials`, `source: cdm-import`) in a step after the user assignment, in the import transaction. The request contract is unchanged; `passwordsImported`, `passwordsUpdated`, `passwordsUnchanged` and `passwordsSkippedExisting` now count project credentials (`passwordsSkippedExisting`: the person owns it, by reset or change), and the REST `ProjectSyncJob.result` schema now lists them. Verified and GitHub or Google linked identities are no longer excluded. **A password for a user who is not a project member after an import is rejected:** the person must be assigned in the same document (`roles`, `groups` or `permissions`) or already be a member, otherwise the whole import fails and rolls back, naming the position in `users[]`. Passwords from earlier imports that the upgrade dropped are not recreated: send them again.
  - **Database-enforced separation.** The restricted RLS role of scoped requests has no privileges on the platform credential tables (migration `0088`). Platform credential operations run on the base connection inside the credential service, in their own short transaction when the request is scoped (one extra pooled connection while they run).
  - A Grant-set password must meet the password policy in every flow, and a rejected password is never echoed in an error.

- bb65914: Project apps can sign people in with an **email and password** that belongs to the project (ADR 0011 § 5). The provider is **opt-in**: a `ProjectApp` offers it only when `enabledProviders` names `password`; an empty list still means Email and the configured social providers, never Password.

  - **Project credential only.** `POST /api/auth/project/password` (email, password, `client_id`, `redirect_uri`, `state`) checks the project's own credential for the app's project. The platform password is never accepted, there is no fallback, and a password never creates an identity, a membership or a platform session. The person must already be a project member. On success the response is the same consent redirect the magic link gets; an unknown address, a non-member, no project credential, a wrong password and a locked credential all return one generic `401` after the same bcrypt work, as does an over-long password. Membership and the project credential are checked again when the sign-in completes (after an MFA step too), so removing a member while a challenge is outstanding cannot be undone by finishing it.
  - **Lockout.** Per `(project, user)`, from `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` and `AUTH_LOCKOUT_DURATION_MINUTES`. Each attempt is recorded before the password is compared, on a connection outside the request transaction, so a burst of parallel guesses cannot outrun the count. Platform login and other projects are unaffected, and magic link and OAuth keep working for a locked person.
  - **MFA at the ceremony.** With `AUTH_MIN_AAL_AT_LOGIN=aal2` and an active MFA enrolment, the response is `mfa_required` and `POST /api/auth/project/password/mfa` verifies a TOTP or recovery code (each attempt spends from the same lockout) before the consent redirect.
  - **Hosted view and schema.** `/auth/project/password` (en, de) and the **Password** button on the project sign-in entry when the app enables it. `ProjectApp.enabledProviders` accepts `password`; `@grantjs/schema` exports `ProjectPasswordSignInResult`.
  - **Dashboard.** The app's OAuth card refuses to save an empty provider selection over a non-empty one: an empty list means every provider except password, not none.
  - Request bodies of `/auth/project/password*` are redacted in request logs.

- 3132693: Project apps that enable the `password` provider get a **"Forgot password?"** flow (ADR 0011 § 6).

  - **Request.** `POST /api/auth/project/password/forgot` sends a reset link to an existing member of the app's project that has an Email method. The response is the same `200` for an unknown address, a non-member, an address over its limit and an address that was sent a link, so it cannot be used to find out who is a member. Each member may be sent `PROJECT_PASSWORD_RESET_MAX_REQUESTS` links (default 5) per `PROJECT_PASSWORD_RESET_REQUEST_WINDOW_SECONDS` (default one hour), on top of the per-IP limiter.
  - **Complete.** `POST /api/auth/project/password/reset` sets the member's project password (`source: reset`, so a later CDM import never overwrites it), clears the failed-attempt lockout, marks the Email method verified (the link proved the mailbox; the platform password is untouched) and **revokes every project-app grant the user holds in that project** (other projects and platform sessions are untouched; access tokens already issued live until they expire). The password policy applies and a rejected password does not use the token up.
  - **Token.** Random, stored only as a SHA-256 digest scoped to the project and user, looked up by digest, single-use, valid for `PROJECT_PASSWORD_RESET_TOKEN_TTL_SECONDS` (default 30 minutes), and carried in the URL fragment of the emailed link.
  - **New table.** Migration `project_password_resets` (one row per project and user, with the project RLS policy). New email: `sendProjectPasswordReset` on every email adapter, in `en` and `de`.
  - **Hosted views.** `/auth/project/forgot-password` and `/auth/project/reset-password`; the "Forgot password?" link of the hosted password view is shown now.

## 1.16.1

### Platform

**Docker images:** tagged `:1.16.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.16.1** (fixed group with apps).

### Patch Changes

- d7d869d: On a closed install (`AUTH_PUBLIC_SIGNUP_ENABLED=false`), login no longer creates a Personal account for an identity that has none. Registration was already gated, but the first platform login of an identity that exists without an account (a CDM-imported user, a user who only signed in to a Project App) created one, which gave console access: "Forgot password?" works for any email identity, so a password reset followed by a login was enough. Login now follows the register policy for every method (email and password, GitHub, Google) and, when it refuses, still issues the session, account-less. A valid organization invitation proof, the first human on an empty install, or an organization membership (an administrator added the user to an organization) still creates the account, exactly as before; an install with public sign-up on is unchanged.

  An account-less session reaches only user-scoped operations (profile, security, preferences, notifications, privacy including data export and deletion, project memberships); every account-scoped query, mutation and route is refused by the permission check. `createMySecondaryAccount` (GraphQL and `POST /api/me/accounts`) now follows the register policy for a user who owns no account, and users who already have an account can still add the complementary one. Linking a GitHub or Google sign-in to an existing identity that has no account no longer fails with "User does not have an account": it follows the same rule.

  `MeResponse` gains `hasOrganizationMembership` (GraphQL `me`, REST `GET /api/me`), which the console uses to tell a user with no workspace from an organization member who has no account.

  Console: after login an account-less user lands on Settings -> Project memberships, which explains that there is no workspace on this installation. The settings hub, the account settings page and every account-scoped dashboard page redirect there, the Account entry is hidden from the settings sidebar and the account menu, and the privacy page words the deletion as deleting the identity. English and German.

## 1.16.0

### Platform

**Docker images:** tagged `:1.16.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.16.0** (fixed group with apps).

### Minor Changes

- bf408fb: A CDM import can carry the password hash a legacy system already holds, so migrated users keep their existing password (ADR 0010). A user with `key.findBy: email` takes `password: { algorithm: 'bcrypt', hash }` on both transports (GraphQL `UserCdmInput.password`, REST `users[].password`): a bcrypt hash with a `$2a$`, `$2b$` or `$2y$` prefix, as Go's `bcrypt.GenerateFromPassword` writes, with a cost from 4 to 15. Anything else, and a `password` on a user not identified by email, is a validation error that never repeats the hash.

  The hash is stored where platform email and password login reads it (`providerData.hashedPassword` of the email authentication method), marked `providerData.passwordSource: 'cdm-import'`. An imported credential belongs to the importing system while the email is unverified: a later import of the same project replaces it when the hash differs and leaves an identical one alone. Verifying the address, or setting, changing or resetting the password in Grant (which now removes the marker), hands the credential to Grant, and imports never touch it again. An absent `password` never removes a stored credential, and `replace` keeps the credentials of the users it re-creates. A credential is written only for an identity the import creates, or one an earlier import of this project created whose email is still unverified; any other existing identity, including one found through GitHub or Google, is left untouched. `SyncProjectResult` gains `passwordsImported`, `passwordsUpdated`, `passwordsUnchanged` and `passwordsSkippedExisting`.

  The hash is kept out of metadata, search tokens, audit values and events. It stays in an inline job's stored payload while the job is pending or running, because the worker reads it from there, and is replaced by `[redacted]` when the job completes, fails or is cancelled; `GET /api/projects/{id}/sync/jobs/{jobId}/payload` always shows `[redacted]`. Signing in to project apps with the imported password is a follow-up (ADR 0010, part b).

### Patch Changes

- e236053: `GET /storage/*` answers 404 instead of 500 when the storage provider is not `local`. The API mounts `/storage` only for the local provider, so on the AWS target (S3) the path has no CloudFront behaviour and reaches the web function, whose rewrite to an API at `localhost:4000` failed with `ECONNREFUSED` and surfaced as a 500. The web proxy now reads `STORAGE_PROVIDER` and, for any provider other than `local` (or unset, which keeps `pnpm dev` and the local Docker setup as they were), answers an empty 404 itself. The AWS construct passes the provider to the web function. Local provider behaviour, including the rule that `imports/` is never served, is unchanged.

## 1.15.0

### Platform

**Docker images:** tagged `:1.15.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.15.0** (fixed group with apps).

### Minor Changes

- 65d1ec4: CDM imports can travel by reference, so their size is no longer bounded by the API's request body (ADR 0009). `POST /api/projects/{id}/sync/upload-url` (GraphQL `requestProjectSyncUploadUrl`) mints a presigned PUT and an `uploadId`; `PUT` the JSON file there, then start the import with `source: { uploadId }` on `POST /api/projects/{id}/sync/jobs` (GraphQL `startProjectSync`), keeping `mode` and omitting the entity arrays. The inline path is unchanged and stays the default.

  By reference, the document is read and validated by the worker, with the same schema and rules as an inline body, so a schema error, a `mode` or `version` that differs from the request's, or more entities than `CDM_IMPORT_MAX_ENTITIES` (default 5,000; `0` is unlimited) is an asynchronous `FAILED` job whose `errorMessage` starts with a code such as `CDM_IMPORT_TOO_MANY_ENTITIES`, not a synchronous 4xx. The uploaded object is deleted when the job ends, `GET .../sync/jobs/{jobId}/payload` answers `{ byReference: true, sizeBytes }` for such a job, and the local `/storage` mount never serves `imports/`. New settings: `CDM_UPLOAD_MAX_BYTES` (default 64 MiB) and `CDM_IMPORT_MAX_ENTITIES`. Migration 0085 makes `project_sync_jobs.payload` nullable and adds `payload_path`, `payload_size_bytes` and `entity_count_hint`.

  `SyncProjectInput` (GraphQL) gains `source`, and its `version`, `roles` and `users` become optional, to be required again unless `source` is set. The REST import body now keeps `searchable` on groups, roles and users, which it used to drop silently while the GraphQL input kept it.

- 65d1ec4: The web import dialog uploads the CDM file by reference (ADR 0009): it asks for an upload URL, PUTs the file's bytes straight to storage, and starts the job from the returned `uploadId`, so a file is no longer limited by the API's request body. The dropzone limit is no longer a hard-coded 25 MiB: `GET /api/config` now reports `cdmUploadMaxBytes` (`CDM_UPLOAD_MAX_BYTES`, default 64 MiB) and the dialog uses it; a refusal for size is shown as its own message with the limit. Files up to 8 MiB are still parsed in the browser for the preview, job name and entity-count hint; larger files go up unread, and the dialog asks for the import mode (merge or replace, with the replace confirmation) because it cannot read it from the file.

  The job detail shows the async import failure codes (`CDM_IMPORT_TOO_MANY_ENTITIES`, `_DOCUMENT_INVALID`, `_DOCUMENT_NOT_JSON`, `_REQUEST_MISMATCH`, `_UPLOAD_MISSING`, `_DOCUMENT_TOO_LARGE`, `_STORAGE_FAILURE`) as translated text (English and German), and shows a by-reference payload as "stored by reference, N MiB" instead of a JSON dump. `proxyClientMaxBodySize` is raised to 64 MB so an upload to local storage through the Next dev/standalone server is not cut at the 10 MB default.

## 1.14.3

### Platform

**Docker images:** tagged `:1.14.3` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.14.3** (fixed group with apps).

### Patch Changes

- 48aaee4: `IFileStorageService` gains a required `download(path, { maxBytes })` that reads a stored object into a `Buffer`, refusing anything over `maxBytes`; the API's `FileStorageService` delegates to the configured adapter. No behaviour change yet: nothing calls it until CDM imports by reference land (ADR 0009, proposed).

## 1.14.2

### Platform

**Docker images:** tagged `:1.14.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.14.2** (fixed group with apps).

### Patch Changes

- acc8db1: Fix background jobs never being queued on AWS Lambda: the SQS enqueue behind project import/export (and the event relay) ran after the HTTP response was sent, so Lambda froze the environment before `SendMessage` completed and the job stayed `pending` forever. After-commit callbacks now run once the transaction has committed and are awaited, for at most `JOBS_AFTER_COMMIT_TIMEOUT_MS` (default 5000), before the response is flushed; a failed enqueue is logged with the job id. The in-process node-cron adapter's `enqueue()` now returns once the job is accepted instead of running it to completion inside the request.

## 1.14.1

### Platform

**Docker images:** tagged `:1.14.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.14.1** (fixed group with apps).

### Patch Changes

- 946fbfc: Run the RLS role grant during bootstrap with the database URL the app resolved, so `DB_BOOTSTRAP_ON_BOOT` works when `DB_URL` comes from AWS Secrets Manager.

## 1.14.0

### Platform

**Docker images:** tagged `:1.14.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.14.0** (fixed group with apps).

### Minor Changes

- 7c06af4: **BREAKING** Project apps use authorization-code + PKCE. Consent redirects with `?code=&state=` (the `#access_token=` fragment is gone). Exchange at `POST /api/auth/project/token` (`authorization_code` and rotating `refresh_token`). Discovery: RFC 8414 well-known before the issuer path, plus `{iss}/.well-known/openid-configuration` (same JSON; Grant is not an OpenID Provider).

## 1.13.1

### Platform

**Docker images:** tagged `:1.13.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.13.1** (fixed group with apps).

### Patch Changes

- 8952623: Hold hosted project sign-in until app-info branding resolves so the help panel and colors do not flash Grant defaults.

## 1.13.0

### Platform

**Docker images:** tagged `:1.13.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.13.0** (fixed group with apps).

### Minor Changes

- 70afd4e: Agent-first CLI: profile/env credentials, `grant whoami`, `grant api`, OpenAPI-named REST commands, optional origin-verify header, and body refresh tokens for session profiles.

## 1.12.0

### Platform

**Docker images:** tagged `:1.12.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.12.0** (fixed group with apps).

### Minor Changes

- 6425580: Closed install — origin-verify on Docker/K8s via Next inject, AUTH_PUBLIC_SIGNUP_ENABLED with first-human bootstrap, invitations and Project App allowSignUp unchanged, last human cannot delete account.

## 1.11.0

### Platform

**Docker images:** tagged `:1.11.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.11.0** (fixed group with apps).

### Minor Changes

- 517fd2d: Record activation and security milestones in product analytics when Umami is enabled, without emails, client ids, or error text.

## 1.10.0

### Platform

**Docker images:** tagged `:1.10.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.10.0** (fixed group with apps).

### Minor Changes

- 3bcfc95: Add per-project GitHub and Google OAuth connections (bring-your-own IdP). Projects can store their own GitHub/Google client credentials; secrets are write-only and never returned on read. Hosted authorize and callback resolve the same project client.

### Patch Changes

- 6701cc2: Keep cropped profile, organization, and project pictures as the selected pixels instead of a blank PNG, including in Firefox.
- 3bcfc95: Clarify Project App OAuth provider toggles versus project connections, and make stored connection status easier to scan (gear affordance, Configured badge, callback URL spacing).
- c255dd3: Fix the Release workflow `create-github-releases` input so changesets/action v2 can version and publish again.

## 1.9.2

### Platform

**Docker images:** tagged `:1.9.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.9.2** (fixed group with apps).

### Patch Changes

- 98cb9b0: Stop the in-app MFA step-up dialog from opening on the dedicated `/auth/mfa` login challenge.

## 1.9.1

### Platform

**Docker images:** tagged `:1.9.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.9.1** (fixed group with apps).

### Patch Changes

- 2216969: Send notification emails through branded MJML templates, and keep plus-addressed emails in invitation and login links.

## 1.9.0

### Platform

**Docker images:** tagged `:1.9.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.9.0** (fixed group with apps).

### Minor Changes

- 099972d: Add project and project-app branding for hosted OAuth: uploadable logos, primary color, help-panel visibility, and an app-level light/dark/system lock on sign-in and authorize pages.

## 1.8.0

### Platform

**Docker images:** tagged `:1.8.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.8.0** (fixed group with apps).

### Minor Changes

- f8d52ec: Add Google as a platform and project OAuth sign-in provider, with account linking, verified contact-email bind, and IdP profile picture inheritance.

## 1.7.0

### Platform

**Docker images:** tagged `:1.7.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.7.0** (fixed group with apps).

### Minor Changes

- 31399fc: Add organization logos that owners can upload and that replace initials in lists, the edit dialog, and the organization switcher.

  The logo is stored as `pictureUrl`, written only through `uploadOrganizationPicture` / `POST /api/organizations/:id/picture` (MIME and size checks, public storage). `Organization:UploadPicture` is granted to Organization Owner. Existing deployments need `db:seed` so the new permission is inserted.

## 1.6.2

### Platform

**Docker images:** tagged `:1.6.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.6.2** (fixed group with apps).

### Patch Changes

- d5b2b05: Fix three deadlocks in the webhook UI that made the feature unusable.

  The detail page crashed with React error #185 (maximum update depth exceeded)
  because `useWebhookDeliveries` returned a new `deliveries` array and a new
  `refetch` closure on every render, and both are used as effect dependencies that
  write into a store — so each store update re-rendered the component that owned
  them. The actions menu could never be opened: permissions are fetched only once
  the menu has been opened, and both the empty-actions guard and the `isLoading`
  expression removed or disabled the trigger before that could happen, so rotating
  a signing secret was unreachable from any view.

## 1.6.1

### Platform

**Docker images:** tagged `:1.6.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.6.1** (fixed group with apps).

### Patch Changes

- 9eecf80: De-duplicate Redis SCAN results in `RedisCacheAdapter`. SCAN guarantees each key is returned at least once, not exactly once, so `keys()` could report a key twice and `clear()` could issue a redundant DEL when the keyspace is resized mid-iteration.

  The fix is in `@grantjs/cache`, which is internal and never published, so the changeset names the app that ships it. A changeset naming only ignored packages versions nothing, which keeps changesets/action on the version-PR path and stops publish from ever running.

## 1.6.0

### Platform

**Docker images:** tagged `:1.6.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.6.0** (fixed group with apps).

### Minor Changes

- 7a96814: Add an `emf` telemetry provider that writes CloudWatch Embedded Metric Format documents to stdout.

  Selected with `TELEMETRY_PROVIDER=emf`; `none` remains the default and the `cloudwatch` provider is unchanged. EMF suits a frozen-container runtime where the existing CloudWatch adapter does not: it needs no SDK, no log-stream sequence token, and nothing flushed before a freeze.

  `TELEMETRY_EMF_DIMENSIONS` defaults to `method,statusCode` and deliberately excludes `path` — request paths embed resource IDs, and every distinct dimension combination creates a billable CloudWatch metric. Unbounded fields are still emitted as document properties and stay queryable in Logs Insights.

  `/metrics`, the Prometheus middleware, and the ServiceMonitor are untouched; the two paths coexist and are config-selected.

- 7a96814: Add a `runner-lambda` Docker build target that layers the AWS Lambda Web Adapter onto the existing runner image.

  Built only with `--target runner-lambda`; the default build is unchanged and still produces the Kubernetes/Compose image. The Lambda image is the existing runner plus one binary, so the two cannot drift apart.

- 7a96814: Resolve deployment secrets through a new `ISecretResolver` port instead of reading them from configuration at module scope.

  `SECRETS_PROVIDER` defaults to `env`, which reads `process.env` exactly as before — existing deployments are unaffected. Setting it to `aws-secrets-manager` resolves secrets from a single JSON secret per use, falling back to the environment for any key the payload omits, so secrets can move over one at a time.

  Because resolution is now per-use rather than once at process start, a rotated secret is picked up within `SECRETS_CACHE_TTL_SECONDS` without a redeploy.

  `IGitHubOAuthService.isConfigured()` now returns `Promise<boolean>`, since determining whether GitHub OAuth is configured requires resolving the client secret.

### Patch Changes

- 7a96814: Add `DB_BOOTSTRAP_ON_BOOT` and a standalone migrate entrypoint.

  Migrations and the core seed still run at API start by default, so no existing
  deployment changes behavior. Setting `DB_BOOTSTRAP_ON_BOOT=false` skips them, for
  deployments that run migrations as a separate step — a Helm hook Job, an ECS one-off
  task, or any serverless target where concurrent cold starts must not each attempt to
  migrate.

  `node dist/migrate.js` is that separate step. It runs the same idempotent,
  advisory-locked bootstrap and exits 0 or 1. It exists because
  `pnpm --filter @grantjs/database db:migrate` cannot run inside the production image:
  that script invokes `drizzle-kit`, a devDependency the runner stage prunes away.

  Setting the flag to `false` without running the migrate step will start the API
  against an unmigrated database.

- 7a96814: Add `TRACING_SPAN_PROCESSOR` to select how OpenTelemetry spans are exported.

  `batch` (default) buffers spans and exports them on a timer, which is unchanged
  behavior for the long-running server. `simple` exports each span as it ends.

  Use `simple` on any runtime that can freeze or terminate the process between
  requests — AWS Lambda behind the Web Adapter, for instance — where a buffered batch
  is not delayed but lost, and the spans lost are disproportionately those of the
  slowest requests.

  Only applies when `TRACING_ENABLED=true`.

## 1.5.5

### Platform

**Docker images:** tagged `:1.5.5` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.5** (fixed group with apps).

### Patch Changes

- 9c1aaeb: Fix graceful shutdown aborting before it released any resources.

  `ApolloServerPluginDrainHttpServer` closes the HTTP server during
  `apolloServer.stop()`, so the subsequent `httpServer.close()` reported
  `ERR_SERVER_NOT_RUNNING`. That rejection escaped the shutdown sequence, which meant
  every step after it was skipped: OpenTelemetry spans were never flushed, job
  schedules were never stopped, and the cache and database connections were never
  closed. The process exited 1 on every SIGTERM, so each Kubernetes pod termination
  was a hard failure.

  Closing an already-closed server is now treated as success, since it is the outcome
  the caller wanted. Shutdown runs to completion and exits 0.

## 1.5.4

### Platform

**Docker images:** tagged `:1.5.4` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.4** (fixed group with apps).

### Patch Changes

- 9caf929: Fix grant-web Docker startup by shipping @swc/helpers ESM in the Next standalone bundle (next 16.3.2).

## 1.5.3

### Platform

**Docker images:** tagged `:1.5.3` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.3** (fixed group with apps).

### Patch Changes

- 178dd71: Code quality pass 5: stop re-emitting schema types, and remove dead surface.

  `codegen.ts` ran the `typescript` plugin alongside `typescript-resolvers`, so `src/generated/resolvers.ts` declared a second copy of all 464 schema type names already owned by `schema-types.ts`. It now imports them instead, taking the file from 7,347 to 3,548 lines. `src/index.ts`'s hand-curated 23-name resolver export list existed only to dodge the resulting identifier collision and is now a normal re-export, so all 115 `*Resolvers` types are available rather than 23.

  Removed from the public surface, none of which had a consumer in this repo:

  - `NOTIFICATION_STATUSES`, `NOTIFICATION_PREFERENCE_SOURCES`, `WEBHOOK_DELIVERY_STATUSES` — duplicates of `@grantjs/database` constants that are also backed by SQL `CHECK` constraints
  - `AUDIENCE_PRIMITIVES` and `EVENT_DELIVERY_CLASSES` — now union types (`AudiencePrimitive`, `EventDeliveryClass` are unchanged); the runtime arrays were unused
  - `AudienceRule`, `EventCatalogEntry` — internal to the event catalog

  Six unreferenced GraphQL declarations and three superseded operation documents were also removed; types reachable from `Query`/`Mutation` are unchanged at 207.

## 1.5.2

### Platform

**Docker images:** tagged `:1.5.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.2** (fixed group with apps).

### Patch Changes

- b072894: Fix notification text showing a raw i18n key (e.g. `roles.names.personalAccountOwner`) instead of the role's display name for system-role assign/revoke events. System roles now resolve to their translated label; the two `ACCOUNT_ROLES` (`personalAccountOwner`, `organizationAccountOwner`) that were missing an English/German translation entirely have been added.

## 1.5.1

### Platform

**Docker images:** tagged `:1.5.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.1** (fixed group with apps).

### Patch Changes

- a720d40: Align webhook create with full-page create viewers and route webhook/notification UI data through Apollo.

  Replace the create dialog with a `/webhooks/new` create viewer (shared events DataTable for create and edit), polish the one-time signing-secret dialog, and migrate webhooks and notifications hooks off REST so idle 401s refresh via Apollo like the rest of the dashboard.

## 1.5.0

### Platform

**Docker images:** tagged `:1.5.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.0** (fixed group with apps).

### Minor Changes

- c515e3e: Add a domain-event backbone with project webhooks and in-app notifications.

  Services publish catalogued events into a transactional outbox that drives signed webhook delivery and preference-aware notifications. The release covers IAM CRUD and assignment events, API key rotate (`api_key.rotated`), CDM import event suppression with `project_sync.completed` / `project_sync.failed` summaries, and dashboard UI for subscriptions, deliveries, and the notification center.

## 1.4.2

### Platform

**Docker images:** tagged `:1.4.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.4.2** (fixed group with apps).

### Patch Changes

- 4d1f378: Resolve user primary tags within the active project scope so shared email-imported users keep the correct project-specific primary tag.

## 1.4.1

### Platform

**Docker images:** tagged `:1.4.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.4.1** (fixed group with apps).

### Patch Changes

- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.
- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.

## 1.4.0

### Platform

**Docker images:** tagged `:1.4.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.4.0** (fixed group with apps).

### Minor Changes

- fd61e91: Add CDM email identity imports for project sync jobs.

  CDM users with `findBy: email` now resolve through the global email authentication catalog, creating an unverified passwordless email authentication method when needed. Project OAuth email magic-link proof verifies imported email methods, and the docs/schema now describe the global identity semantics.

## 1.3.3

### Platform

**Docker images:** tagged `:1.3.3` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.3.3** (fixed group with apps).

### Patch Changes

- 661935f: Fix project import failures caused by globally unique soft-delete timestamp indexes on pivot tables.

## 1.3.2

### Platform

**Docker images:** tagged `:1.3.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.3.2** (fixed group with apps).

### Patch Changes

- ed06fc0: Improve detail page loading states with skeleton placeholders, hide native search clear
  controls, and fix project app update validation for existing sign-up and primary tag values.

- ed06fc0: Improve detail page loading states with skeleton placeholders, hide native search clear
  controls, and fix project app update validation for existing sign-up and primary tag values.
- ed06fc0: Fix the release workflow Docker matrix expression so GitHub Actions can parse
  `release.yml` and run the release pipeline after merges to `main`.

## 1.3.1

### Platform

**Docker images:** tagged `:1.3.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.3.1** (fixed group with apps).

### Patch Changes

- 2f5b331: Fix the release workflow Docker matrix expression so GitHub Actions can parse
  `release.yml` and run the release pipeline after merges to `main`.

## 1.3.0

### Platform

**Docker images:** tagged `:1.3.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.3.0** (fixed group with apps).

### Minor Changes

- b911b9a: CDM searchable metadata and denormalized `search_document` for list search, plus tag picker infinite scroll fix.

  **API & CDM**

  - Add `search_document` on `project_users`, `roles`, and `groups` with pg_trgm indexes
  - CDM `searchable` on user, role, and group inputs; import, export, and runtime recomputation
  - Project-scoped user list search filters via pivot `search_document`

  **Web**

  - Fix toolbar tag filter infinite loading (nested dropdown scroll, stable tag query variables, IntersectionObserver reconnect)

## 1.2.0

### Platform

**Docker images:** tagged `:1.2.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.2.0** (fixed group with apps).

### Minor Changes

- 3355be1: RBAC detail UX, direct permission assignments, and CDM replace pivot teardown.

  **Web**
  - Settings-style feature module cards and dedicated `/new` + detail routes for roles, groups, permissions, resources, project apps, and users
  - Slim list edit dialogs (scalar fields only); relationship editing on detail pages
  - Paginated tag pickers, detail table column visibility, and sync job detail pages

  **API & database**
  - Direct assignment pivots: `user_groups`, `user_permissions`, `role_permissions`, and project-scoped mirrors
  - CDM import/export for explicit user→group and user→role permission paths (no synthetic roles)
  - Replace-mode CDM teardown sweeps orphan pivots (including `project_app_tags`) with monotonic microsecond stagger soft-delete
  - Scoped entity tag resolvers; slim GraphQL list queries (`getRolesList`, `getGroupsList`, etc.)

  **Testing & tooling**
  - E2E coverage for rich replace import teardown and direct `users[].groups` authorization
  - RBAC list-query benchmark script; gitignore ephemeral benchmark outputs under `docs/benchmarks/`

## 1.1.7

### Platform

**Docker images:** tagged `:1.1.7` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.7** (fixed group with apps).

### Patch Changes

- 3597d0a: Compact audit log payloads before insert so large CDM entities (for example resources with long action lists) no longer exceed `varchar(1000)` on audit tables and abort import transactions.

## 1.1.6

### Platform

**Docker images:** tagged `:1.1.6` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.6** (fixed group with apps).

### Patch Changes

- 50b8271: Allow project-level API keys to enqueue CDM sync and export jobs by mapping `enqueuedById` to the system user when the JWT `sub` is the API key id sentinel (`sub === jti`), fixing FK violations on `project_sync_jobs.enqueued_by_id`.

## 1.1.5

### Platform

**Docker images:** tagged `:1.1.5` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.5** (fixed group with apps).

### Patch Changes

- 1d6f27d: Make the Express JSON request body limit configurable via `API_JSON_BODY_LIMIT_BYTES` (default 10 MiB) so large CDM sync imports can be tuned without code changes.

## 1.1.4

### Platform

**Docker images:** tagged `:1.1.4` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.4** (fixed group with apps).

### Patch Changes

- 6abd436: Skip `su-exec` in the API Docker entrypoint when the container already runs as a non-root user, fixing startup on Kubernetes with `securityContext.runAsUser`.

## 1.1.3

### Platform

**Docker images:** tagged `:1.1.3` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.3** (fixed group with apps).

### Patch Changes

- 8c9af41: Skip storage directory chown in the API Docker entrypoint when the container is not running as root, so Kubernetes deployments with `readOnlyRootFilesystem` and `securityContext.runAsUser` can start successfully.

## 1.1.2

### Platform

**Docker images:** tagged `:1.1.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.2** (fixed group with apps).

### Patch Changes

- 01e0ed1: Fix GraphQL codegen duplicate schema types by splitting `schema-types` and operation outputs. Compile the API for production Docker images (replace `tsx` runtime), align REST routes and web hooks with generated types, and fix demo storage volume permissions via entrypoint.

## 1.1.1

### Platform

**Docker images:** tagged `:1.1.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.1** (fixed group with apps).

### Patch Changes

- 005ec00: Resolve platform version from `apps/api/package.json` at runtime for `/api/config` and OpenAPI. Remove deprecated `APP_VERSION` and `NEXT_PUBLIC_APP_VERSION` environment variables.

## 1.1.0

### Platform

Async CDM project sync jobs, export, and pre-sync rollback snapshots. **Breaking:** synchronous `syncProject` / `POST .../permissions/sync` removed — use enqueue-and-poll job APIs (see migration notes in package changelogs).

**Docker images:** tagged `:1.1.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.0** (fixed group with apps).

## 1.0.0

### Platform

Initial semver release of the Grant platform.

**Docker images** (GHCR, `ghcr.io/grant-js/grant/`):

- `grant-api`
- `grant-web`
- `grant-docs`
- `example-nextjs`

Tags: `:1.0.0`, `:latest` (from current `:demo` build). Rolling demo continues to use `:demo` and `:sha-<commit>`.

**npm packages** (registry.npmjs.org):

- `@grantjs/schema@1.0.0`
- `@grantjs/client@1.0.1` (includes MFA step-up callback)
- `@grantjs/server@1.0.0`
- `@grantjs/cli@1.0.0`

### Highlights

- Multi-tenant RBAC API (GraphQL + REST), web dashboard, and documentation site
- Publishable SDKs: browser client, server adapters, CLI
- Demo deployment via Docker Compose (`:demo` images + `.env.demo`)
