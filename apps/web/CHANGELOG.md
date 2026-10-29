# grant-web

## 1.20.1

### Patch Changes

- @grantjs/client@1.20.1
  - @grantjs/schema@1.20.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.20.0

### Patch Changes

- e2a8527: Operators with the `ProjectUser:SetPassword` permission get a "Set password" action on project users, with a confirmed-password dialog that applies the same password policy as the settings form and never keeps or repeats the value. The permission picker now shows the names and descriptions of `ProjectUser:SetPassword` and `ProjectUser:ExportCredentials`, and the webhook event list labels `project.user_password_set` (English and German). Also adds the missing translation for `project.user_email_changed` from #637.
- Updated dependencies [e2a8527]
  - @grantjs/schema@1.20.0
  - @grantjs/client@1.20.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.19.0

### Patch Changes

- Updated dependencies [334609d]
  - @grantjs/schema@1.19.0
  - @grantjs/client@1.19.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.11

### Patch Changes

- @grantjs/client@1.18.11
  - @grantjs/schema@1.18.11
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.10

### Patch Changes

- @grantjs/client@1.18.10
  - @grantjs/schema@1.18.10
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.9

### Patch Changes

- Updated dependencies [ecc6a27]
  - @grantjs/schema@1.18.9
  - @grantjs/client@1.18.9
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.8

### Patch Changes

- @grantjs/client@1.18.8
  - @grantjs/schema@1.18.8
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.7

### Patch Changes

- @grantjs/client@1.18.7
  - @grantjs/schema@1.18.7
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.6

### Patch Changes

- @grantjs/client@1.18.6
  - @grantjs/schema@1.18.6
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.5

### Patch Changes

- @grantjs/client@1.18.5
  - @grantjs/schema@1.18.5
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.4

### Patch Changes

- @grantjs/client@1.18.4
  - @grantjs/schema@1.18.4
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.3

### Patch Changes

- @grantjs/client@1.18.3
  - @grantjs/schema@1.18.3
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.2

### Patch Changes

- @grantjs/client@1.18.2
  - @grantjs/schema@1.18.2
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.1

### Patch Changes

- Updated dependencies [fcefe73]
  - @grantjs/schema@1.18.1
  - @grantjs/client@1.18.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.18.0

### Minor Changes

- b4a71fd: Webhooks now report every way access or an entity can change, so a consumer that keeps a copy of who holds what can stay correct. **Deleting a group now removes its memberships and emits one `user.group_revoked` per member**: a soft delete left the `user_groups` rows active (pointing at a deleted group) and a hard delete removed them without an event. **Removing a project member now revokes the user's project roles, groups and direct permissions first** (`user.role_revoked`, `user.group_revoked`, `user.permission_revoked`), where before only the membership row was removed. Deleting a role or a permission already emitted its revokes and is unchanged; there is no cap on the number of revokes, so a large delete is slower, not lossy. Ten event types were added, all webhook-only (no notification or email is created for them): `user.created`, `user.updated` and `user.deleted` (ids and the names of changed fields only; `user.updated` and `user.deleted` reach the user's project subscriptions, and `user.deleted` is emitted by self-deletion and account deletion), `project.user_updated` (project-member metadata), `api_key.deleted` (with the owning user as subject only when the key has exactly one), `tag.created`, `tag.updated`, `tag.deleted`, and `tag.linked` / `tag.unlinked` for tags on users, groups, roles, permissions and resources (`data.after` is `{ tagId, targetKind, targetId }`). Redaction is unchanged and there is no migration; subscriptions listing event types by name are unaffected, and the new types appear in the subscription picker.
- 2d0528c: Webhook deliveries now say **which user an event is about**. The CloudEvents envelope has a new extension attribute, `grantsubjectuser: { "userId": "…" }` (or `null` when the event has no subject user), next to `grantactor`. Revoke and remove events such as `user.role_revoked`, `user.group_revoked`, `user.permission_revoked` and `project.user_removed` used to arrive with an empty `data` (the internal `before` snapshot is not delivered) and a `subject` that is the id of the assignment record, so a consumer could not tell whose access changed; it can now read the user id from `grantsubjectuser`. `data` and redaction are unchanged, and the new attribute is additive.

### Patch Changes

- Updated dependencies [b4a71fd]
- Updated dependencies [366391c]
- Updated dependencies [2d0528c]
  - @grantjs/schema@1.18.0
  - @grantjs/client@1.18.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.17.0

### Minor Changes

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
  - @grantjs/client@1.17.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.16.1

### Patch Changes

- d7d869d: On a closed install (`AUTH_PUBLIC_SIGNUP_ENABLED=false`), login no longer creates a Personal account for an identity that has none. Registration was already gated, but the first platform login of an identity that exists without an account (a CDM-imported user, a user who only signed in to a Project App) created one, which gave console access: "Forgot password?" works for any email identity, so a password reset followed by a login was enough. Login now follows the register policy for every method (email and password, GitHub, Google) and, when it refuses, still issues the session, account-less. A valid organization invitation proof, the first human on an empty install, or an organization membership (an administrator added the user to an organization) still creates the account, exactly as before; an install with public sign-up on is unchanged.

  An account-less session reaches only user-scoped operations (profile, security, preferences, notifications, privacy including data export and deletion, project memberships); every account-scoped query, mutation and route is refused by the permission check. `createMySecondaryAccount` (GraphQL and `POST /api/me/accounts`) now follows the register policy for a user who owns no account, and users who already have an account can still add the complementary one. Linking a GitHub or Google sign-in to an existing identity that has no account no longer fails with "User does not have an account": it follows the same rule.

  `MeResponse` gains `hasOrganizationMembership` (GraphQL `me`, REST `GET /api/me`), which the console uses to tell a user with no workspace from an organization member who has no account.

  Console: after login an account-less user lands on Settings -> Project memberships, which explains that there is no workspace on this installation. The settings hub, the account settings page and every account-scoped dashboard page redirect there, the Account entry is hidden from the settings sidebar and the account menu, and the privacy page words the deletion as deleting the identity. English and German.

- Updated dependencies [d7d869d]
  - @grantjs/schema@1.16.1
  - @grantjs/client@1.16.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.16.0

### Patch Changes

- e236053: `GET /storage/*` answers 404 instead of 500 when the storage provider is not `local`. The API mounts `/storage` only for the local provider, so on the AWS target (S3) the path has no CloudFront behaviour and reaches the web function, whose rewrite to an API at `localhost:4000` failed with `ECONNREFUSED` and surfaced as a 500. The web proxy now reads `STORAGE_PROVIDER` and, for any provider other than `local` (or unset, which keeps `pnpm dev` and the local Docker setup as they were), answers an empty 404 itself. The AWS construct passes the provider to the web function. Local provider behaviour, including the rule that `imports/` is never served, is unchanged.
- Updated dependencies [bf408fb]
  - @grantjs/schema@1.16.0
  - @grantjs/client@1.16.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.15.0

### Minor Changes

- 65d1ec4: The web import dialog uploads the CDM file by reference (ADR 0009): it asks for an upload URL, PUTs the file's bytes straight to storage, and starts the job from the returned `uploadId`, so a file is no longer limited by the API's request body. The dropzone limit is no longer a hard-coded 25 MiB: `GET /api/config` now reports `cdmUploadMaxBytes` (`CDM_UPLOAD_MAX_BYTES`, default 64 MiB) and the dialog uses it; a refusal for size is shown as its own message with the limit. Files up to 8 MiB are still parsed in the browser for the preview, job name and entity-count hint; larger files go up unread, and the dialog asks for the import mode (merge or replace, with the replace confirmation) because it cannot read it from the file.

  The job detail shows the async import failure codes (`CDM_IMPORT_TOO_MANY_ENTITIES`, `_DOCUMENT_INVALID`, `_DOCUMENT_NOT_JSON`, `_REQUEST_MISMATCH`, `_UPLOAD_MISSING`, `_DOCUMENT_TOO_LARGE`, `_STORAGE_FAILURE`) as translated text (English and German), and shows a by-reference payload as "stored by reference, N MiB" instead of a JSON dump. `proxyClientMaxBodySize` is raised to 64 MB so an upload to local storage through the Next dev/standalone server is not cut at the 10 MB default.

### Patch Changes

- Updated dependencies [65d1ec4]
  - @grantjs/schema@1.15.0
  - @grantjs/client@1.15.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.14.3

### Patch Changes

- @grantjs/client@1.14.3
  - @grantjs/schema@1.14.3
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.14.2

### Patch Changes

- @grantjs/client@1.14.2
  - @grantjs/schema@1.14.2
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.14.1

### Patch Changes

- @grantjs/client@1.14.1
  - @grantjs/schema@1.14.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.14.0

### Patch Changes

- Updated dependencies [7c06af4]
  - @grantjs/client@1.14.0
  - @grantjs/schema@1.14.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.13.1

### Patch Changes

- 8952623: Hold hosted project sign-in until app-info branding resolves so the help panel and colors do not flash Grant defaults.
- @grantjs/client@1.13.1
  - @grantjs/schema@1.13.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.13.0

### Patch Changes

- @grantjs/client@1.13.0
  - @grantjs/schema@1.13.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.12.0

### Patch Changes

- Updated dependencies [6425580]
  - @grantjs/schema@1.12.0
  - @grantjs/client@1.12.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.11.0

### Patch Changes

- @grantjs/client@1.11.0
  - @grantjs/schema@1.11.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.10.0

### Minor Changes

- 3bcfc95: Add per-project GitHub and Google OAuth connections (bring-your-own IdP). Projects can store their own GitHub/Google client credentials; secrets are write-only and never returned on read. Hosted authorize and callback resolve the same project client.

### Patch Changes

- 6701cc2: Keep cropped profile, organization, and project pictures as the selected pixels instead of a blank PNG, including in Firefox.
- 3bcfc95: Clarify Project App OAuth provider toggles versus project connections, and make stored connection status easier to scan (gear affordance, Configured badge, callback URL spacing).
- Updated dependencies [3bcfc95]
  - @grantjs/schema@1.10.0
  - @grantjs/client@1.10.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.9.2

### Patch Changes

- 98cb9b0: Stop the in-app MFA step-up dialog from opening on the dedicated `/auth/mfa` login challenge.
  - @grantjs/schema@1.9.2
  - @grantjs/client@1.9.2
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.9.1

### Patch Changes

- 2216969: Send notification emails through branded MJML templates, and keep plus-addressed emails in invitation and login links.
  - @grantjs/schema@1.9.1
  - @grantjs/client@1.9.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.9.0

### Minor Changes

- 099972d: Add project and project-app branding for hosted OAuth: uploadable logos, primary color, help-panel visibility, and an app-level light/dark/system lock on sign-in and authorize pages.

### Patch Changes

- Updated dependencies [099972d]
  - @grantjs/schema@1.9.0
  - @grantjs/client@1.9.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.8.0

### Minor Changes

- f8d52ec: Add Google as a platform and project OAuth sign-in provider, with account linking, verified contact-email bind, and IdP profile picture inheritance.

### Patch Changes

- @grantjs/schema@1.8.0
- @grantjs/client@1.8.0
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.7.0

### Minor Changes

- 31399fc: Add organization logos that owners can upload and that replace initials in lists, the edit dialog, and the organization switcher.

  The logo is stored as `pictureUrl`, written only through `uploadOrganizationPicture` / `POST /api/organizations/:id/picture` (MIME and size checks, public storage). `Organization:UploadPicture` is granted to Organization Owner. Existing deployments need `db:seed` so the new permission is inserted.

### Patch Changes

- Updated dependencies [31399fc]
  - @grantjs/schema@1.7.0
  - @grantjs/client@1.7.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.6.2

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
  - @grantjs/schema@1.6.2
  - @grantjs/client@1.6.2
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.6.1

### Patch Changes

- @grantjs/schema@1.6.1
- @grantjs/client@1.6.1
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.6.0

### Patch Changes

- @grantjs/schema@1.6.0
- @grantjs/client@1.6.0
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.5.5

### Patch Changes

- @grantjs/schema@1.5.5
- @grantjs/client@1.5.5
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.5.4

### Patch Changes

- 9caf929: Fix grant-web Docker startup by shipping @swc/helpers ESM in the Next standalone bundle (next 16.3.2).
  - @grantjs/schema@1.5.4
  - @grantjs/client@1.5.4
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.5.3

### Patch Changes

- Updated dependencies [178dd71]
  - @grantjs/schema@1.5.3
  - @grantjs/client@1.5.3
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.5.2

### Patch Changes

- @grantjs/schema@1.5.2
- @grantjs/client@1.5.2
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.5.1

### Patch Changes

- a720d40: Align webhook create with full-page create viewers and route webhook/notification UI data through Apollo.

  Replace the create dialog with a `/webhooks/new` create viewer (shared events DataTable for create and edit), polish the one-time signing-secret dialog, and migrate webhooks and notifications hooks off REST so idle 401s refresh via Apollo like the rest of the dashboard.
  - @grantjs/schema@1.5.1
  - @grantjs/client@1.5.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.5.0

### Minor Changes

- c515e3e: Add a domain-event backbone with project webhooks and in-app notifications.

  Services publish catalogued events into a transactional outbox that drives signed webhook delivery and preference-aware notifications. The release covers IAM CRUD and assignment events, API key rotate (`api_key.rotated`), CDM import event suppression with `project_sync.completed` / `project_sync.failed` summaries, and dashboard UI for subscriptions, deliveries, and the notification center.

### Patch Changes

- Updated dependencies [c515e3e]
  - @grantjs/schema@1.5.0
  - @grantjs/client@1.5.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.4.2

### Patch Changes

- @grantjs/schema@1.4.2
- @grantjs/client@1.4.2
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.4.1

### Patch Changes

- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.
- Updated dependencies [4fcca1d]
  - @grantjs/schema@1.4.1
  - @grantjs/client@1.4.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.4.0

### Patch Changes

- Updated dependencies [fd61e91]
  - @grantjs/schema@1.4.0
  - @grantjs/client@1.4.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.3.3

### Patch Changes

- @grantjs/schema@1.3.3
- @grantjs/client@1.3.3
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.3.2

### Patch Changes

- ed06fc0: Improve detail page loading states with skeleton placeholders, hide native search clear
  controls, and fix project app update validation for existing sign-up and primary tag values.
- Updated dependencies [ed06fc0]
  - @grantjs/client@1.3.2
  - @grantjs/schema@1.3.2
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.3.1

### Patch Changes

- Updated dependencies [2f5b331]
  - @grantjs/client@1.3.1
  - @grantjs/schema@1.3.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.3.0

### Patch Changes

- @grantjs/schema@1.3.0
- @grantjs/client@1.3.0
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.2.0

### Patch Changes

- @grantjs/schema@1.2.0
- @grantjs/client@1.2.0
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.1.7

### Patch Changes

- @grantjs/schema@1.1.7
- @grantjs/client@1.1.7
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.1.6

### Patch Changes

- @grantjs/schema@1.1.6
- @grantjs/client@1.1.6
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.1.5

### Patch Changes

- @grantjs/schema@1.1.5
- @grantjs/client@1.1.5
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.1.4

### Patch Changes

- Updated dependencies [6abd436]
  - @grantjs/schema@1.1.4
  - @grantjs/client@1.1.4
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.1.3

### Patch Changes

- Updated dependencies [8c9af41]
  - @grantjs/schema@1.1.3
  - @grantjs/client@1.1.3
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.1.2

### Patch Changes

- Updated dependencies [01e0ed1]
  - @grantjs/schema@1.1.2
  - @grantjs/client@1.1.2
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.1.1

### Patch Changes

- @grantjs/schema@1.1.1
- @grantjs/client@1.1.1
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.1.0

### Patch Changes

- @grantjs/schema@1.1.0
- @grantjs/client@1.1.0
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0
