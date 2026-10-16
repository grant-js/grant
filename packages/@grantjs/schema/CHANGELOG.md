# @grantjs/schema

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
