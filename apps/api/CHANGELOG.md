# grant-api

## 1.18.11

### Patch Changes

- 782dcd5: Fix organizationMembers HTTP 500 when listing members with pending invitations: alias every member ∪ invitation union column uniquely so ORDER BY is no longer ambiguous.
- @grantjs/schema@1.18.11
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.10

### Patch Changes

- 4378ed0: GHCR `:demo`, `:latest`, and `:<semver>` now ship together only when the version PR merges. Feature merges that only open `chore: version packages` no longer build or push images.
- @grantjs/schema@1.18.10
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.9

### Patch Changes

- ecc6a27: Skip unchanged CDM API keys on replace: HMAC-SHA256 fingerprint, classify before bcrypt, and additive created/unchanged/rotated/deleted counters.
- Updated dependencies [ecc6a27]
  - @grantjs/schema@1.18.9
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.8

### Patch Changes

- 06d78e1: Batch CDM import API-key inserts and hash BYOK secrets outside the import transaction at bcrypt-10. HTTP `createApiKey` stays sequential. Persist only hashes; client-id uniqueness stays fail-closed. The import remains one all-or-nothing transaction.
- 06d78e1: Batch CDM import user-role, group-permission, and project pivot writes. Import-only existence loads use `unboundedList` so batches larger than the public page cap still resolve. HTTP assignment APIs stay sequential. The import remains one all-or-nothing transaction.
- @grantjs/schema@1.18.8
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.7

### Patch Changes

- c58ac17: Overlap independent RBAC lookups on an authorization cache miss so `getUserPermissions` no longer walks the four permission sources as a single sequential chain.
- c58ac17: Invalidate cached authorization results for the written tenant only, so an IAM write in tenant A no longer drops tenant B's hot allow-cache.
- @grantjs/schema@1.18.7
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.6

### Patch Changes

- 3950594: Page scoped IAM lists in SQL (search, tags, explicit ids, sort, limit) against a pivot subquery so a 50-row page does not materialize the full accessible ID set.
- @grantjs/schema@1.18.6
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.5

### Patch Changes

- f344d18: Run IP and auth-sensitive rate limits before request context so a 429 does not authenticate or construct the handler toolbox. Optional per-tenant limits still run after authenticate.
- f344d18: Build the request handler toolbox once after authenticate. Scoped RLS requests keep SET LOCAL on the request transaction; auth uses a thin unscoped Grant bootstrap.
- f344d18: Mount one REST router for `/api` instead of allocating the route tree per request. Handlers still come from the request context.
- @grantjs/schema@1.18.5
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.4

### Patch Changes

- 0148f5f: Return the scoped RLS request-transaction client to the pool at COMMIT. After-commit work (job and webhook enqueue) runs on the pool afterward, still before the HTTP response is flushed, so Lambda freeze cannot drop the enqueue and a failed COMMIT is not answered as success.
- @grantjs/schema@1.18.4
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.3

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
- @grantjs/schema@1.18.3
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.2

### Patch Changes

- 9ee4de7: CDM import now writes this project's `cdmImport` marker (`kind: 'user'`, external key) on the project membership row of every user it assigns, including an email-identified user that already had a Grant identity. The project-scoped `users` read therefore identifies the users a project imported even when the identity was reused; the global user's metadata is not changed.
- @grantjs/schema@1.18.2
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.1

### Patch Changes

- 2b811c4: CDM import accepts role templates with no permissionRefs: a role may be a pure label whose permissions are attached later. Validation of duplicate keys and tag references is unchanged.
- fcefe73: Webhook envelopes now carry an identity-only `before` (ids, keys, names) for delete and revoke events, so subscribers can tell what was removed. `after` and `delta` are unchanged; no personal data is added.
- Updated dependencies [fcefe73]
  - @grantjs/schema@1.18.1
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.18.0

### Minor Changes

- b4a71fd: Webhooks now report every way access or an entity can change, so a consumer that keeps a copy of who holds what can stay correct. **Deleting a group now removes its memberships and emits one `user.group_revoked` per member**: a soft delete left the `user_groups` rows active (pointing at a deleted group) and a hard delete removed them without an event. **Removing a project member now revokes the user's project roles, groups and direct permissions first** (`user.role_revoked`, `user.group_revoked`, `user.permission_revoked`), where before only the membership row was removed. Deleting a role or a permission already emitted its revokes and is unchanged; there is no cap on the number of revokes, so a large delete is slower, not lossy. Ten event types were added, all webhook-only (no notification or email is created for them): `user.created`, `user.updated` and `user.deleted` (ids and the names of changed fields only; `user.updated` and `user.deleted` reach the user's project subscriptions, and `user.deleted` is emitted by self-deletion and account deletion), `project.user_updated` (project-member metadata), `api_key.deleted` (with the owning user as subject only when the key has exactly one), `tag.created`, `tag.updated`, `tag.deleted`, and `tag.linked` / `tag.unlinked` for tags on users, groups, roles, permissions and resources (`data.after` is `{ tagId, targetKind, targetId }`). Redaction is unchanged and there is no migration; subscriptions listing event types by name are unaffected, and the new types appear in the subscription picker.
- 366391c: **Webhook subscriptions now receive every event relevant to their project, whatever scope the request ran in** (ADR 0012). Until now an event reached a project's subscriptions only when the request that caused it was project-scoped, so editing a project's role from an organization dashboard, a project-app end user's own requests (`projectUser` scope) and system-scope flows such as the sign-up role assignment were never delivered. The publisher now records, on the outbox row, the projects that the role, group, permission, resource or API key an event is about (or a user's assignment to one) is linked to, and the dispatcher fans out to those projects together with the project named by the request scope; an entity linked to several projects reaches each of them, and one linked to no project delivers nothing. A `projectUser` scope is now read as its project. The event scope, the webhook envelope and notifications are unchanged, no event type was added, and there is no migration. A subscription that listed `role.updated` or `user.role_assigned` will see more events than before. `IEventPublisher` gains `resolveLinkedProjectIds`, which the role, group, permission and resource delete paths use to read project links before the delete removes them. The resource delete handler, which unlinks the project pivots before the services publish, now passes the projects it read first, so an organization-scope resource delete reaches the subscriptions of the projects it was linked to.
- 2d0528c: Webhook deliveries now say **which user an event is about**. The CloudEvents envelope has a new extension attribute, `grantsubjectuser: { "userId": "…" }` (or `null` when the event has no subject user), next to `grantactor`. Revoke and remove events such as `user.role_revoked`, `user.group_revoked`, `user.permission_revoked` and `project.user_removed` used to arrive with an empty `data` (the internal `before` snapshot is not delivered) and a `subject` that is the id of the assignment record, so a consumer could not tell whose access changed; it can now read the user id from `grantsubjectuser`. `data` and redaction are unchanged, and the new attribute is additive.

### Patch Changes

- Updated dependencies [b4a71fd]
- Updated dependencies [366391c]
- Updated dependencies [2d0528c]
  - @grantjs/schema@1.18.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.17.0

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

### Patch Changes

- Updated dependencies [87ca954]
- Updated dependencies [bb65914]
  - @grantjs/schema@1.17.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.16.1

### Patch Changes

- d7d869d: On a closed install (`AUTH_PUBLIC_SIGNUP_ENABLED=false`), login no longer creates a Personal account for an identity that has none. Registration was already gated, but the first platform login of an identity that exists without an account (a CDM-imported user, a user who only signed in to a Project App) created one, which gave console access: "Forgot password?" works for any email identity, so a password reset followed by a login was enough. Login now follows the register policy for every method (email and password, GitHub, Google) and, when it refuses, still issues the session, account-less. A valid organization invitation proof, the first human on an empty install, or an organization membership (an administrator added the user to an organization) still creates the account, exactly as before; an install with public sign-up on is unchanged.

  An account-less session reaches only user-scoped operations (profile, security, preferences, notifications, privacy including data export and deletion, project memberships); every account-scoped query, mutation and route is refused by the permission check. `createMySecondaryAccount` (GraphQL and `POST /api/me/accounts`) now follows the register policy for a user who owns no account, and users who already have an account can still add the complementary one. Linking a GitHub or Google sign-in to an existing identity that has no account no longer fails with "User does not have an account": it follows the same rule.

  `MeResponse` gains `hasOrganizationMembership` (GraphQL `me`, REST `GET /api/me`), which the console uses to tell a user with no workspace from an organization member who has no account.

  Console: after login an account-less user lands on Settings -> Project memberships, which explains that there is no workspace on this installation. The settings hub, the account settings page and every account-scoped dashboard page redirect there, the Account entry is hidden from the settings sidebar and the account menu, and the privacy page words the deletion as deleting the identity. English and German.

- Updated dependencies [d7d869d]
  - @grantjs/schema@1.16.1
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.16.0

### Minor Changes

- bf408fb: A CDM import can carry the password hash a legacy system already holds, so migrated users keep their existing password (ADR 0010). A user with `key.findBy: email` takes `password: { algorithm: 'bcrypt', hash }` on both transports (GraphQL `UserCdmInput.password`, REST `users[].password`): a bcrypt hash with a `$2a$`, `$2b$` or `$2y$` prefix, as Go's `bcrypt.GenerateFromPassword` writes, with a cost from 4 to 15. Anything else, and a `password` on a user not identified by email, is a validation error that never repeats the hash.

  The hash is stored where platform email and password login reads it (`providerData.hashedPassword` of the email authentication method), marked `providerData.passwordSource: 'cdm-import'`. An imported credential belongs to the importing system while the email is unverified: a later import of the same project replaces it when the hash differs and leaves an identical one alone. Verifying the address, or setting, changing or resetting the password in Grant (which now removes the marker), hands the credential to Grant, and imports never touch it again. An absent `password` never removes a stored credential, and `replace` keeps the credentials of the users it re-creates. A credential is written only for an identity the import creates, or one an earlier import of this project created whose email is still unverified; any other existing identity, including one found through GitHub or Google, is left untouched. `SyncProjectResult` gains `passwordsImported`, `passwordsUpdated`, `passwordsUnchanged` and `passwordsSkippedExisting`.

  The hash is kept out of metadata, search tokens, audit values and events. It stays in an inline job's stored payload while the job is pending or running, because the worker reads it from there, and is replaced by `[redacted]` when the job completes, fails or is cancelled; `GET /api/projects/{id}/sync/jobs/{jobId}/payload` always shows `[redacted]`. Signing in to project apps with the imported password is a follow-up (ADR 0010, part b).

### Patch Changes

- Updated dependencies [bf408fb]
  - @grantjs/schema@1.16.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.15.0

### Minor Changes

- 65d1ec4: CDM imports can travel by reference, so their size is no longer bounded by the API's request body (ADR 0009). `POST /api/projects/{id}/sync/upload-url` (GraphQL `requestProjectSyncUploadUrl`) mints a presigned PUT and an `uploadId`; `PUT` the JSON file there, then start the import with `source: { uploadId }` on `POST /api/projects/{id}/sync/jobs` (GraphQL `startProjectSync`), keeping `mode` and omitting the entity arrays. The inline path is unchanged and stays the default.

  By reference, the document is read and validated by the worker, with the same schema and rules as an inline body, so a schema error, a `mode` or `version` that differs from the request's, or more entities than `CDM_IMPORT_MAX_ENTITIES` (default 5,000; `0` is unlimited) is an asynchronous `FAILED` job whose `errorMessage` starts with a code such as `CDM_IMPORT_TOO_MANY_ENTITIES`, not a synchronous 4xx. The uploaded object is deleted when the job ends, `GET .../sync/jobs/{jobId}/payload` answers `{ byReference: true, sizeBytes }` for such a job, and the local `/storage` mount never serves `imports/`. New settings: `CDM_UPLOAD_MAX_BYTES` (default 64 MiB) and `CDM_IMPORT_MAX_ENTITIES`. Migration 0085 makes `project_sync_jobs.payload` nullable and adds `payload_path`, `payload_size_bytes` and `entity_count_hint`.

  `SyncProjectInput` (GraphQL) gains `source`, and its `version`, `roles` and `users` become optional, to be required again unless `source` is set. The REST import body now keeps `searchable` on groups, roles and users, which it used to drop silently while the GraphQL input kept it.

- 65d1ec4: The web import dialog uploads the CDM file by reference (ADR 0009): it asks for an upload URL, PUTs the file's bytes straight to storage, and starts the job from the returned `uploadId`, so a file is no longer limited by the API's request body. The dropzone limit is no longer a hard-coded 25 MiB: `GET /api/config` now reports `cdmUploadMaxBytes` (`CDM_UPLOAD_MAX_BYTES`, default 64 MiB) and the dialog uses it; a refusal for size is shown as its own message with the limit. Files up to 8 MiB are still parsed in the browser for the preview, job name and entity-count hint; larger files go up unread, and the dialog asks for the import mode (merge or replace, with the replace confirmation) because it cannot read it from the file.

  The job detail shows the async import failure codes (`CDM_IMPORT_TOO_MANY_ENTITIES`, `_DOCUMENT_INVALID`, `_DOCUMENT_NOT_JSON`, `_REQUEST_MISMATCH`, `_UPLOAD_MISSING`, `_DOCUMENT_TOO_LARGE`, `_STORAGE_FAILURE`) as translated text (English and German), and shows a by-reference payload as "stored by reference, N MiB" instead of a JSON dump. `proxyClientMaxBodySize` is raised to 64 MB so an upload to local storage through the Next dev/standalone server is not cut at the 10 MB default.

### Patch Changes

- Updated dependencies [65d1ec4]
  - @grantjs/schema@1.15.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.14.3

### Patch Changes

- 48aaee4: `IFileStorageService` gains a required `download(path, { maxBytes })` that reads a stored object into a `Buffer`, refusing anything over `maxBytes`; the API's `FileStorageService` delegates to the configured adapter. No behaviour change yet: nothing calls it until CDM imports by reference land (ADR 0009, proposed).
- @grantjs/schema@1.14.3
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.14.2

### Patch Changes

- acc8db1: Fix background jobs never being queued on AWS Lambda: the SQS enqueue behind project import/export (and the event relay) ran after the HTTP response was sent, so Lambda froze the environment before `SendMessage` completed and the job stayed `pending` forever. After-commit callbacks now run once the transaction has committed and are awaited, for at most `JOBS_AFTER_COMMIT_TIMEOUT_MS` (default 5000), before the response is flushed; a failed enqueue is logged with the job id. The in-process node-cron adapter's `enqueue()` now returns once the job is accepted instead of running it to completion inside the request.
- @grantjs/schema@1.14.2
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.14.1

### Patch Changes

- 946fbfc: Run the RLS role grant during bootstrap with the database URL the app resolved, so `DB_BOOTSTRAP_ON_BOOT` works when `DB_URL` comes from AWS Secrets Manager.
- @grantjs/schema@1.14.1
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.14.0

### Patch Changes

- @grantjs/schema@1.14.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.13.1

### Patch Changes

- @grantjs/schema@1.13.1
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.13.0

### Patch Changes

- @grantjs/schema@1.13.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.12.0

### Patch Changes

- Updated dependencies [6425580]
  - @grantjs/schema@1.12.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.11.0

### Minor Changes

- 517fd2d: Record activation and security milestones in product analytics when Umami is enabled, without emails, client ids, or error text.

### Patch Changes

- @grantjs/schema@1.11.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.10.0

### Minor Changes

- 3bcfc95: Add per-project GitHub and Google OAuth connections (bring-your-own IdP). Projects can store their own GitHub/Google client credentials; secrets are write-only and never returned on read. Hosted authorize and callback resolve the same project client.

### Patch Changes

- Updated dependencies [3bcfc95]
  - @grantjs/schema@1.10.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.9.2

### Patch Changes

- @grantjs/schema@1.9.2
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/secrets@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0
- @grantjs/webhooks@1.0.0

## 1.9.1

### Patch Changes

- 2216969: Send notification emails through branded MJML templates, and keep plus-addressed emails in invitation and login links.
  - @grantjs/schema@1.9.1
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.9.0

### Minor Changes

- 099972d: Add project and project-app branding for hosted OAuth: uploadable logos, primary color, help-panel visibility, and an app-level light/dark/system lock on sign-in and authorize pages.

### Patch Changes

- Updated dependencies [099972d]
  - @grantjs/schema@1.9.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.8.0

### Minor Changes

- f8d52ec: Add Google as a platform and project OAuth sign-in provider, with account linking, verified contact-email bind, and IdP profile picture inheritance.

### Patch Changes

- @grantjs/schema@1.8.0
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/secrets@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0
- @grantjs/webhooks@1.0.0

## 1.7.0

### Minor Changes

- 31399fc: Add organization logos that owners can upload and that replace initials in lists, the edit dialog, and the organization switcher.

  The logo is stored as `pictureUrl`, written only through `uploadOrganizationPicture` / `POST /api/organizations/:id/picture` (MIME and size checks, public storage). `Organization:UploadPicture` is granted to Organization Owner. Existing deployments need `db:seed` so the new permission is inserted.

### Patch Changes

- Updated dependencies [31399fc]
  - @grantjs/schema@1.7.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.6.2

### Patch Changes

- @grantjs/schema@1.6.2
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/secrets@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0
- @grantjs/webhooks@1.0.0

## 1.6.1

### Patch Changes

- 9eecf80: De-duplicate Redis SCAN results in `RedisCacheAdapter`. SCAN guarantees each key is returned at least once, not exactly once, so `keys()` could report a key twice and `clear()` could issue a redundant DEL when the keyspace is resized mid-iteration.

  The fix is in `@grantjs/cache`, which is internal and never published, so the changeset names the app that ships it. A changeset naming only ignored packages versions nothing, which keeps changesets/action on the version-PR path and stops publish from ever running.
  - @grantjs/schema@1.6.1
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.6.0

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
  - @grantjs/schema@1.6.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/secrets@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.5.5

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
  - @grantjs/schema@1.5.5
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0
  - @grantjs/webhooks@1.0.0

## 1.5.4

### Patch Changes

- @grantjs/schema@1.5.4
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0
- @grantjs/webhooks@1.0.0

## 1.5.3

### Patch Changes

- Updated dependencies [178dd71]
  - @grantjs/schema@1.5.3
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.5.2

### Patch Changes

- b072894: Fix notification text showing a raw i18n key (e.g. `roles.names.personalAccountOwner`) instead of the role's display name for system-role assign/revoke events. System roles now resolve to their translated label; the two `ACCOUNT_ROLES` (`personalAccountOwner`, `organizationAccountOwner`) that were missing an English/German translation entirely have been added.
  - @grantjs/schema@1.5.2
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.5.1

### Patch Changes

- @grantjs/schema@1.5.1
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0

## 1.5.0

### Minor Changes

- c515e3e: Add a domain-event backbone with project webhooks and in-app notifications.

  Services publish catalogued events into a transactional outbox that drives signed webhook delivery and preference-aware notifications. The release covers IAM CRUD and assignment events, API key rotate (`api_key.rotated`), CDM import event suppression with `project_sync.completed` / `project_sync.failed` summaries, and dashboard UI for subscriptions, deliveries, and the notification center.

### Patch Changes

- Updated dependencies [c515e3e]
  - @grantjs/schema@1.5.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.4.2

### Patch Changes

- 4d1f378: Resolve user primary tags within the active project scope so shared email-imported users keep the correct project-specific primary tag.
  - @grantjs/schema@1.4.2
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.4.1

### Patch Changes

- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.
- Updated dependencies [4fcca1d]
  - @grantjs/schema@1.4.1
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.4.0

### Minor Changes

- fd61e91: Add CDM email identity imports for project sync jobs.

  CDM users with `findBy: email` now resolve through the global email authentication catalog, creating an unverified passwordless email authentication method when needed. Project OAuth email magic-link proof verifies imported email methods, and the docs/schema now describe the global identity semantics.

### Patch Changes

- Updated dependencies [fd61e91]
  - @grantjs/schema@1.4.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.3.3

### Patch Changes

- 661935f: Fix project import failures caused by globally unique soft-delete timestamp indexes on pivot tables.
  - @grantjs/schema@1.3.3
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.3.2

### Patch Changes

- ed06fc0: Improve detail page loading states with skeleton placeholders, hide native search clear
  controls, and fix project app update validation for existing sign-up and primary tag values.
  - @grantjs/schema@1.3.2
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.3.1

### Patch Changes

- @grantjs/schema@1.3.1
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0

## 1.3.0

### Minor Changes

- b911b9a: CDM searchable metadata and denormalized `search_document` for list search, plus tag picker infinite scroll fix.

  **API & CDM**

  - Add `search_document` on `project_users`, `roles`, and `groups` with pg_trgm indexes
  - CDM `searchable` on user, role, and group inputs; import, export, and runtime recomputation
  - Project-scoped user list search filters via pivot `search_document`

  **Web**

  - Fix toolbar tag filter infinite loading (nested dropdown scroll, stable tag query variables, IntersectionObserver reconnect)

### Patch Changes

- @grantjs/schema@1.3.0
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0

## 1.2.0

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

### Patch Changes

- @grantjs/schema@1.2.0
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0

## 1.1.7

### Patch Changes

- 3597d0a: Compact audit log payloads before insert so large CDM entities (for example resources with long action lists) no longer exceed `varchar(1000)` on audit tables and abort import transactions.
  - @grantjs/schema@1.1.7
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.6

### Patch Changes

- 50b8271: Allow project-level API keys to enqueue CDM sync and export jobs by mapping `enqueuedById` to the system user when the JWT `sub` is the API key id sentinel (`sub === jti`), fixing FK violations on `project_sync_jobs.enqueued_by_id`.
  - @grantjs/schema@1.1.6
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.5

### Patch Changes

- 1d6f27d: Make the Express JSON request body limit configurable via `API_JSON_BODY_LIMIT_BYTES` (default 10 MiB) so large CDM sync imports can be tuned without code changes.
  - @grantjs/schema@1.1.5
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.4

### Patch Changes

- Updated dependencies [6abd436]
  - @grantjs/schema@1.1.4
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.3

### Patch Changes

- Updated dependencies [8c9af41]
  - @grantjs/schema@1.1.3
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.2

### Patch Changes

- Updated dependencies [01e0ed1]
  - @grantjs/schema@1.1.2
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.1

### Patch Changes

- 005ec00: Resolve platform version from `apps/api/package.json` at runtime for `/api/config` and OpenAPI. Remove deprecated `APP_VERSION` and `NEXT_PUBLIC_APP_VERSION` environment variables.
  - @grantjs/schema@1.1.1
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.0

### Minor Changes

- 650a605: **Breaking — replace synchronous CDM project sync with async jobs.**

  The synchronous `syncProject` GraphQL mutation (formerly `syncProjectPermissions`) and `POST /api/projects/{id}/permissions/sync` REST route have been **removed**. Both APIs now expose an enqueue-and-poll job flow:
  - REST:
    - `POST /api/projects/{id}/sync/jobs` — enqueue a job, returns `202` with the persisted job row (`{ id, status, ... }`).
    - `GET /api/projects/{id}/sync/jobs/{jobId}` — poll status. Terminal statuses: `COMPLETED`, `FAILED`, `CANCELLED`.
    - `DELETE /api/projects/{id}/sync/jobs/{jobId}` — request cancellation (best-effort once the job is `RUNNING`).
  - GraphQL:
    - `mutation startProjectSync` — enqueue import.
    - `mutation cancelProjectSync` — request cancellation.
    - `query projectSyncJob` — poll status.

  **Migration**
  - Callers must enqueue the job and then poll the status endpoint until the job reaches a terminal status.
  - The body of the new POST is the same `SyncProjectInput` (CDM 1) shape the old endpoint accepted; the response is now a `ProjectSyncJob` (id + status), not the eager `SyncProjectResult`. The result is surfaced inside the job row once it completes.
  - `importId` enables idempotency: enqueuing twice with the same `importId` returns the existing in-flight or completed job rather than starting a duplicate replace-import.
  - A jobs adapter must be configured (`JOBS_ENABLED=true`, BullMQ in production / node-cron in dev). Starting a sync without one returns a `ConfigurationError`.

  **Why**

  External imports can be large enough to exceed reasonable HTTP timeouts and produce ambiguous client retries. The job-based design persists the request payload for replay, runs the existing transactional `ProjectImportService` in the background, transitions an explicit state machine (`pending → running → completed|failed|cancelled`), and surfaces post-commit cache invalidation through a new dedicated service method so the worker remains independent of the transport-layer handler.

  ***

  **Additive — CDM export and pre-sync rollback snapshots.**

  The same package now exposes the inverse operation of CDM project sync, plus an automatic rollback snapshot captured by the worker before each import. The internals were refactored behind a single `ICdmEntityHandler` registry so the sync service, the new export service, and future entity types (API keys, project apps, …) all share one extensibility seam.
  - REST:
    - `GET /api/projects/{id}/sync/export` — snapshot the project's current state and download it as a CDM JSON artifact (`SyncProjectInput` shape, replay-ready). Gated by `Project:Query`.
    - `GET /api/projects/{id}/sync/jobs/{jobId}/snapshot` — download the rollback snapshot captured before the selected job ran. `404` when the job has no snapshot. Gated by `Project:Query`.
  - GraphQL: `ProjectSyncJob` gains `hasSnapshot: Boolean!`, `snapshotTakenAt: DateTime`, and `snapshotSizeBytes: Int` (the JSON itself stays REST-only, mirroring the existing payload-download endpoint).
  - Database: three new nullable columns on `project_sync_jobs` — `snapshot` (jsonb), `snapshot_taken_at` (timestamp), `snapshot_size_bytes` (int). Existing rows are unaffected; `hasSnapshot` is `false` for them.
  - Worker: the snapshot is captured **inside the import transaction**, immediately before `importProjectCdm` runs. If the import throws, the snapshot rolls back along with it — a `failed` job has no snapshot, which is correct because the project state did not change.
  - Web: new `Export current` button next to `Start sync` in the toolbar and empty states, plus a `Rollback snapshot` tab in the sync-job view dialog (reload + download, matches the existing payload tab).
  - Internals: per-entity sync logic lives in `ICdmEntityHandler` implementations (`*CdmEntity` classes under `apps/api/src/lib/cdm/entities/`). See `apps/api/src/lib/cdm/README.md` for the extension contract.

### Patch Changes

- @grantjs/schema@1.1.0
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0
