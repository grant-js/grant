# @grantjs/schema

## 1.18.1

### Patch Changes

- fcefe73: Webhook envelopes now carry an identity-only `before` (ids, keys, names) for delete and revoke events, so subscribers can tell what was removed. `after` and `delta` are unchanged; no personal data is added.

## 1.18.0

### Minor Changes

- b4a71fd: Webhooks now report every way access or an entity can change, so a consumer that keeps a copy of who holds what can stay correct. **Deleting a group now removes its memberships and emits one `user.group_revoked` per member**: a soft delete left the `user_groups` rows active (pointing at a deleted group) and a hard delete removed them without an event. **Removing a project member now revokes the user's project roles, groups and direct permissions first** (`user.role_revoked`, `user.group_revoked`, `user.permission_revoked`), where before only the membership row was removed. Deleting a role or a permission already emitted its revokes and is unchanged; there is no cap on the number of revokes, so a large delete is slower, not lossy. Ten event types were added, all webhook-only (no notification or email is created for them): `user.created`, `user.updated` and `user.deleted` (ids and the names of changed fields only; `user.updated` and `user.deleted` reach the user's project subscriptions, and `user.deleted` is emitted by self-deletion and account deletion), `project.user_updated` (project-member metadata), `api_key.deleted` (with the owning user as subject only when the key has exactly one), `tag.created`, `tag.updated`, `tag.deleted`, and `tag.linked` / `tag.unlinked` for tags on users, groups, roles, permissions and resources (`data.after` is `{ tagId, targetKind, targetId }`). Redaction is unchanged and there is no migration; subscriptions listing event types by name are unaffected, and the new types appear in the subscription picker.
- 366391c: **Webhook subscriptions now receive every event relevant to their project, whatever scope the request ran in** (ADR 0012). Until now an event reached a project's subscriptions only when the request that caused it was project-scoped, so editing a project's role from an organization dashboard, a project-app end user's own requests (`projectUser` scope) and system-scope flows such as the sign-up role assignment were never delivered. The publisher now records, on the outbox row, the projects that the role, group, permission, resource or API key an event is about (or a user's assignment to one) is linked to, and the dispatcher fans out to those projects together with the project named by the request scope; an entity linked to several projects reaches each of them, and one linked to no project delivers nothing. A `projectUser` scope is now read as its project. The event scope, the webhook envelope and notifications are unchanged, no event type was added, and there is no migration. A subscription that listed `role.updated` or `user.role_assigned` will see more events than before. `IEventPublisher` gains `resolveLinkedProjectIds`, which the role, group, permission and resource delete paths use to read project links before the delete removes them. The resource delete handler, which unlinks the project pivots before the services publish, now passes the projects it read first, so an organization-scope resource delete reaches the subscriptions of the projects it was linked to.
- 2d0528c: Webhook deliveries now say **which user an event is about**. The CloudEvents envelope has a new extension attribute, `grantsubjectuser: { "userId": "…" }` (or `null` when the event has no subject user), next to `grantactor`. Revoke and remove events such as `user.role_revoked`, `user.group_revoked`, `user.permission_revoked` and `project.user_removed` used to arrive with an empty `data` (the internal `before` snapshot is not delivered) and a `subject` that is the id of the assignment record, so a consumer could not tell whose access changed; it can now read the user id from `grantsubjectuser`. `data` and redaction are unchanged, and the new attribute is additive.

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

## 1.16.1

### Patch Changes

- d7d869d: On a closed install (`AUTH_PUBLIC_SIGNUP_ENABLED=false`), login no longer creates a Personal account for an identity that has none. Registration was already gated, but the first platform login of an identity that exists without an account (a CDM-imported user, a user who only signed in to a Project App) created one, which gave console access: "Forgot password?" works for any email identity, so a password reset followed by a login was enough. Login now follows the register policy for every method (email and password, GitHub, Google) and, when it refuses, still issues the session, account-less. A valid organization invitation proof, the first human on an empty install, or an organization membership (an administrator added the user to an organization) still creates the account, exactly as before; an install with public sign-up on is unchanged.

  An account-less session reaches only user-scoped operations (profile, security, preferences, notifications, privacy including data export and deletion, project memberships); every account-scoped query, mutation and route is refused by the permission check. `createMySecondaryAccount` (GraphQL and `POST /api/me/accounts`) now follows the register policy for a user who owns no account, and users who already have an account can still add the complementary one. Linking a GitHub or Google sign-in to an existing identity that has no account no longer fails with "User does not have an account": it follows the same rule.

  `MeResponse` gains `hasOrganizationMembership` (GraphQL `me`, REST `GET /api/me`), which the console uses to tell a user with no workspace from an organization member who has no account.

  Console: after login an account-less user lands on Settings -> Project memberships, which explains that there is no workspace on this installation. The settings hub, the account settings page and every account-scoped dashboard page redirect there, the Account entry is hidden from the settings sidebar and the account menu, and the privacy page words the deletion as deleting the identity. English and German.

## 1.16.0

### Minor Changes

- bf408fb: A CDM import can carry the password hash a legacy system already holds, so migrated users keep their existing password (ADR 0010). A user with `key.findBy: email` takes `password: { algorithm: 'bcrypt', hash }` on both transports (GraphQL `UserCdmInput.password`, REST `users[].password`): a bcrypt hash with a `$2a$`, `$2b$` or `$2y$` prefix, as Go's `bcrypt.GenerateFromPassword` writes, with a cost from 4 to 15. Anything else, and a `password` on a user not identified by email, is a validation error that never repeats the hash.

  The hash is stored where platform email and password login reads it (`providerData.hashedPassword` of the email authentication method), marked `providerData.passwordSource: 'cdm-import'`. An imported credential belongs to the importing system while the email is unverified: a later import of the same project replaces it when the hash differs and leaves an identical one alone. Verifying the address, or setting, changing or resetting the password in Grant (which now removes the marker), hands the credential to Grant, and imports never touch it again. An absent `password` never removes a stored credential, and `replace` keeps the credentials of the users it re-creates. A credential is written only for an identity the import creates, or one an earlier import of this project created whose email is still unverified; any other existing identity, including one found through GitHub or Google, is left untouched. `SyncProjectResult` gains `passwordsImported`, `passwordsUpdated`, `passwordsUnchanged` and `passwordsSkippedExisting`.

  The hash is kept out of metadata, search tokens, audit values and events. It stays in an inline job's stored payload while the job is pending or running, because the worker reads it from there, and is replaced by `[redacted]` when the job completes, fails or is cancelled; `GET /api/projects/{id}/sync/jobs/{jobId}/payload` always shows `[redacted]`. Signing in to project apps with the imported password is a follow-up (ADR 0010, part b).

## 1.15.0

### Minor Changes

- 65d1ec4: CDM imports can travel by reference, so their size is no longer bounded by the API's request body (ADR 0009). `POST /api/projects/{id}/sync/upload-url` (GraphQL `requestProjectSyncUploadUrl`) mints a presigned PUT and an `uploadId`; `PUT` the JSON file there, then start the import with `source: { uploadId }` on `POST /api/projects/{id}/sync/jobs` (GraphQL `startProjectSync`), keeping `mode` and omitting the entity arrays. The inline path is unchanged and stays the default.

  By reference, the document is read and validated by the worker, with the same schema and rules as an inline body, so a schema error, a `mode` or `version` that differs from the request's, or more entities than `CDM_IMPORT_MAX_ENTITIES` (default 5,000; `0` is unlimited) is an asynchronous `FAILED` job whose `errorMessage` starts with a code such as `CDM_IMPORT_TOO_MANY_ENTITIES`, not a synchronous 4xx. The uploaded object is deleted when the job ends, `GET .../sync/jobs/{jobId}/payload` answers `{ byReference: true, sizeBytes }` for such a job, and the local `/storage` mount never serves `imports/`. New settings: `CDM_UPLOAD_MAX_BYTES` (default 64 MiB) and `CDM_IMPORT_MAX_ENTITIES`. Migration 0085 makes `project_sync_jobs.payload` nullable and adds `payload_path`, `payload_size_bytes` and `entity_count_hint`.

  `SyncProjectInput` (GraphQL) gains `source`, and its `version`, `roles` and `users` become optional, to be required again unless `source` is set. The REST import body now keeps `searchable` on groups, roles and users, which it used to drop silently while the GraphQL input kept it.

## 1.14.3

No changes in this release.

## 1.14.2

No changes in this release.

## 1.14.1

No changes in this release.

## 1.14.0

No changes in this release.

## 1.13.1

No changes in this release.

## 1.13.0

No changes in this release.

## 1.12.0

### Minor Changes

- 6425580: Closed install — origin-verify on Docker/K8s via Next inject, AUTH_PUBLIC_SIGNUP_ENABLED with first-human bootstrap, invitations and Project App allowSignUp unchanged, last human cannot delete account.

## 1.11.0

No changes in this release.

## 1.10.0

### Minor Changes

- 3bcfc95: Add GraphQL types and operations for per-project GitHub/Google OAuth connections. Client secrets are write-only and never returned on reads.

## 1.9.2

## 1.9.1

## 1.9.0

### Minor Changes

- 099972d: Add project and project-app branding for hosted OAuth: uploadable logos, primary color, help-panel visibility, and an app-level light/dark/system lock on sign-in and authorize pages.

## 1.8.0

## 1.7.0

### Minor Changes

- 31399fc: Add organization logos that owners can upload and that replace initials in lists, the edit dialog, and the organization switcher.

  The logo is stored as `pictureUrl`, written only through `uploadOrganizationPicture` / `POST /api/organizations/:id/picture` (MIME and size checks, public storage). `Organization:UploadPicture` is granted to Organization Owner. Existing deployments need `db:seed` so the new permission is inserted.

## 1.6.2

## 1.6.1

## 1.6.0

## 1.5.5

## 1.5.4

## 1.5.3

### Patch Changes

- 178dd71: Code quality pass 5: stop re-emitting schema types, and remove dead surface.

  `codegen.ts` ran the `typescript` plugin alongside `typescript-resolvers`, so `src/generated/resolvers.ts` declared a second copy of all 464 schema type names already owned by `schema-types.ts`. It now imports them instead, taking the file from 7,347 to 3,548 lines. `src/index.ts`'s hand-curated 23-name resolver export list existed only to dodge the resulting identifier collision and is now a normal re-export, so all 115 `*Resolvers` types are available rather than 23.

  Removed from the public surface, none of which had a consumer in this repo:

  - `NOTIFICATION_STATUSES`, `NOTIFICATION_PREFERENCE_SOURCES`, `WEBHOOK_DELIVERY_STATUSES` — duplicates of `@grantjs/database` constants that are also backed by SQL `CHECK` constraints
  - `AUDIENCE_PRIMITIVES` and `EVENT_DELIVERY_CLASSES` — now union types (`AudiencePrimitive`, `EventDeliveryClass` are unchanged); the runtime arrays were unused
  - `AudienceRule`, `EventCatalogEntry` — internal to the event catalog

  Six unreferenced GraphQL declarations and three superseded operation documents were also removed; types reachable from `Query`/`Mutation` are unchanged at 207.

## 1.5.2

## 1.5.1

## 1.5.0

### Minor Changes

- c515e3e: Add a domain-event backbone with project webhooks and in-app notifications.

  Services publish catalogued events into a transactional outbox that drives signed webhook delivery and preference-aware notifications. The release covers IAM CRUD and assignment events, API key rotate (`api_key.rotated`), CDM import event suppression with `project_sync.completed` / `project_sync.failed` summaries, and dashboard UI for subscriptions, deliveries, and the notification center.

## 1.4.2

## 1.4.1

### Patch Changes

- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.

## 1.4.0

### Minor Changes

- fd61e91: Add CDM email identity imports for project sync jobs.

  CDM users with `findBy: email` now resolve through the global email authentication catalog, creating an unverified passwordless email authentication method when needed. Project OAuth email magic-link proof verifies imported email methods, and the docs/schema now describe the global identity semantics.

## 1.3.3

## 1.3.2

## 1.3.1

## 1.3.0

## 1.2.0

## 1.1.7

## 1.1.6

## 1.1.5

## 1.1.4

### Patch Changes

- 6abd436: Skip `su-exec` in the API Docker entrypoint when the container already runs as a non-root user, fixing startup on Kubernetes with `securityContext.runAsUser`.

## 1.1.3

### Patch Changes

- 8c9af41: Skip storage directory chown in the API Docker entrypoint when the container is not running as root, so Kubernetes deployments with `readOnlyRootFilesystem` and `securityContext.runAsUser` can start successfully.

## 1.1.2

### Patch Changes

- 01e0ed1: Fix GraphQL codegen duplicate schema types by splitting `schema-types` and operation outputs. Compile the API for production Docker images (replace `tsx` runtime), align REST routes and web hooks with generated types, and fix demo storage volume permissions via entrypoint.

## 1.1.1

## 1.1.0

## 1.0.0

Initial public release of GraphQL schema and generated TypeScript types.
