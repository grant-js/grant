# 0011 — Password as a scoped credential: platform and project

- **Status**: Proposed
- **Date**: 2026-10-15
- **Amended**: 2026-10-29, for operator set-password, one audited exception to "the hash is never
  returned", and the `project.user_password_set` event this record described but never built
  (§ Amendment 2026-10-29). Sentences that stopped being true are corrected in place and marked.
- **Context**: [#544](https://github.com/grant-js/grant/pull/544), an attempt to make ADR 0010's
  import reach the identities migrated users really have, which showed the storage is wrong, not
  the eligibility rule; and the realisation that "Email" already means two different things
- **Amends**: [0010](./0010-cdm-import-of-bcrypt-password-hashes.md) (a) rules 3 to 6 and 8, and (b)
- **Depends on**: [0008](./0008-per-project-oauth-connections.md) (project grain for project apps)
- **Scope**: design only. This record changes no code; § Slicing lists the implementation slices.
- **Compatibility**: the **import path** is a clean break (no users beyond the maintainer's own
  consume it): no migration of v1.16.0 import data into project credentials, no dual read. The
  **platform cut-over is not a wipe**: platform passwords belong to real users, and § 7 copies
  every Grant-set hash verbatim so nobody resets.

## Context

**"Email" means two things.** On the platform it is email **and password**: registration hashes
the password into the Email method's `providerData.hashedPassword`
(`user-authentication-methods.service.ts:385-398`), login verifies it (`auth.handler.ts:421-430`),
change and reset rewrite it (`user-authentication-methods.service.ts:706-710,821-836`). In a
project app it is **magic link only**, with no password
(`auth.handler.ts:1157-1158`, `requestProjectEmailMagicLink`,
`project-oauth.handler.ts:485-520`). The platform therefore conflates two different facts:
**mailbox proof** (an identity fact: global, `isVerified`, produced by an OTP or a magic link)
and **knowledge of a secret** (a credential). Project apps are about to separate them; the
platform should too.

**Identities are global; a password is the only credential a tenant's input can write.** One
email is one identity and one `user_authentication_methods` row, shared by every organization and
project. A magic link and a GitHub or Google login hold no secret a tenant supplies. The bcrypt
hash of ADR 0010 is the only one, and v1.16.0 writes it into that shared row
(`user-provision.cdm-entity.ts:228-277`), where platform login reads it.

**The legacy source holds one hash per environment for the same person.** Each environment is a
project, so two projects can import different hashes into one global field. Measured on staging:
2,527 identities, 203 in more than one project, 0 in more than one organization.

**0010 already treats the imported hash as a project credential in everything but storage.** Its
part (b) opens a **project app** only, yielding an app authorization code, never a platform
session, and its consequences say the credential stops working for platform login after the
verification window (`auth.handler.ts:460-467`). Rules 4 and 5 of 0010 exist only to make storing
it in the global row safe.

**Precedent.** ADR 0008 moved OAuth connections to project grain for project apps and left
platform login on the global configuration.

### What #544 showed (rejected alternative)

#544 widened eligibility to "confined to the importing project's organization" and handled two
environments disagreeing with a conflict tombstone. It works in tests and is the wrong direction:

- **The membership read cannot be made in the import's own scope.** The import runs as the
  restricted RLS role with the importing project as tenant, so `project_users` shows only that
  project's rows (`project-users.schema.ts:51-55`). Confinement therefore reads on the login role,
  outside the import transaction, a deliberate hole in tenant isolation that needs a second pooled
  connection.
- **Sibling imports race.** The credential is one JSON field with no lock; two environments
  importing at once both write and no conflict is recorded.
- **A conflict has no good outcome.** The tombstone removes both environments' passwords and sends
  the person to reset, because two tenants disagree about a secret neither should own globally.
- **Confinement is a heuristic** for "no other tenant relies on this identity", and needs an
  OAuth-method guard and a rule for membership-less users to stay safe.

All of that is eligibility machinery compensating for a global store. Removing the global store
removes the machinery.

## Decision

**Identity and auth methods hold no Grant-side secret. A password is a credential with a scope:
`platform` (the Grant console) or one `project` (that project's apps).**

### 1. The model

- **Identity**: global, unchanged.
- **Auth methods**: Email (mailbox proof by OTP or magic link, sets `isVerified`), GitHub,
  Google. Global, as today. **The Email method no longer carries a password.**
- **Credential**: `(scope, user, hash, source)`. One verifier (bcrypt compare with a dummy compare
  on a missing row), one throttle shape **per `(scope, user)`**, one reset and change flow and one
  `source` enum, parameterised by scope.
- **No cross-scope reads.** Platform login checks only the platform credential; a project app's
  `password` provider checks only that project's credential. Neither falls back to the other.
- **Identifier-agnostic.** Sign-in is two steps: **(1) resolve a login identifier to a user within
  the scope, (2) verify that user's credential for the scope.** Today the only resolver is the
  email address, through the Email method. The credential row has **no email column** and no
  identifier at all; the verifier takes a **resolved user id**; the lockout keys on
  **`(scope, user)`**, never on the identifier typed, so every identifier that resolves to one
  user shares one guess budget; and the response is **identical for an unknown identifier and a
  wrong password** (generic failure, dummy compare). Further resolvers plug in at step 1 without
  touching storage (§ Follow-ups).
- **MFA unchanged**: global enrolment.

| Surface            | Providers it can offer                                      | List comes from                       |
| ------------------ | ----------------------------------------------------------- | ------------------------------------- |
| Platform (console) | Password and Email magic link (inline form), GitHub, Google | configuration (`/api/auth/providers`) |
| Project app        | Email (magic link), Password, GitHub, Google                | the app's `enabledProviders`          |

### 2. Storage: two tables behind one port

- **`user_credentials`** (platform scope): `id`, `user_id` (`ON DELETE CASCADE`), `hash`,
  `source`, `last_used_at`, `created_at`, `updated_at`, `deleted_at`; unique `(user_id) WHERE
deleted_at IS NULL`. Like `users` and `user_authentication_methods` it is a core table with **no
  RLS** (`docs/architecture/security.md:556-558`: core tables are reached through tenant-scoped
  pivots).
- **`project_user_credentials`** (project scope): the same columns plus `project_id`
  (`ON DELETE CASCADE`), shaped like `project_user_api_keys` and `project_user_groups`
  (`project_id` + `user_id` columns, not a foreign key to `project_users.id`, which is replaced
  when a member is re-added); unique `(project_id, user_id) WHERE deleted_at IS NULL`; the same
  restrictive `tenant_isolation_policy` on `app.current_project_id` as
  `project-user-api-keys.schema.ts:44-49`. Each table has an audit-log table as
  `project-oauth-connections.schema.ts:39-61` does.
- **One port, one service**, parameterised by scope (`{ scope: 'platform' }` or
  `{ scope: 'project', projectId }`): hashing, the verifier, the lockout store and `source`
  rules are written once; only two thin repositories differ.

`hash` is `varchar(255)`, a bcrypt hash (the `$2a$`/`$2b$`/`$2y$` prefix names the algorithm; no
`algorithm` column until a second one exists). `source` is one enum: `register`, `cdm-import`,
`reset`, `change`, `migrated`, `migrated-import` and, since 2026-10-29, `admin-set` (an operator
wrote it; § Amendment 2026-10-29). `change` is in the enum from the start but, for
the **project** scope, nothing writes it until the self-service follow-up lands. The scope is the
table, so there is no `project-reset`: a reset is `reset` in either. The hash never appears in
`providerData`, `metadata`, search, audit values, events or logs, and no API returns it except the
one audited export of § Amendment 2026-10-29.

**Why two tables, not one with a nullable `project_id`.** The deciding point is RLS. The project
policy is `current_project_id IS NULL OR project_id = current_project_id`: an **unscoped** request
sees every row. Platform login is unscoped by nature, so in a single table it would see every
project's credentials and be one missing `project_id IS NULL` away from reading them, while the
platform rows (`project_id` NULL) would be invisible under any project tenant role only because
`NULL = x` happens to be null. The guarantee would rest on a predicate in every query. With two
tables it is structural: a platform query cannot name a project row, a project-scoped import
cannot name a platform row, and the project table keeps exactly the policy its siblings have. A
single table would also need two partial unique indexes (`project_id IS NULL` and `IS NOT NULL`)
and a policy that special-cases NULL.

_Rejected:_ one table with nullable `project_id` (above); a column on `project_users` (replaced
with the membership row, and its `metadata` is exported and searched, which 0010 already rejected
for the hash); keeping the hash in the method's `providerData` with a project key (same race, and
the RLS-blind reads of #544); a credential per `ProjectApp` (finer than needed, deferred in 0008).

_Implementation note (slice 2): the separation is database-enforced._ "A platform query cannot
name a project row, a project-scoped import cannot name a platform row" first held in code only:
migration 0042 gives the restricted role (`grant_app_restricted`) default privileges on every new
table, so it could read `user_credentials`. Since slice 2 (migration 0088) the restricted role has
**no privileges** on `user_credentials`, `user_credential_lockouts` and
`user_credential_audit_logs`, so the separation holds in Postgres. The consequence is that
platform-scope credential operations cannot run inside a scoped request's transaction: the credential
service runs them on the base connection, inside the service (callers never choose a connection or
pass a handle). An unscoped caller transaction (login, register, reset) is joined, so the credential
commits with the caller's writes; a scoped request's operation runs in its own short transaction,
outside the request transaction, and holds one extra pooled connection while it runs. The project
tables are unchanged.

### 3. Platform scope

- **Registration** creates the identity, the Email method (unverified, with its OTP) and the
  **platform credential** (`source: register`) in the same transaction
  (`auth.handler.ts:228-335`; the hash moves out of `providerData` at
  `user-authentication-methods.service.ts:392-397`). The `Connect` action (adding email and
  password to an account that has only OAuth, same branch, `:385-386`) does the same.
- **Login** with email and password resolves the identity through the Email method and verifies
  the **platform credential** only (`auth.handler.ts:421-430` reads the new table). The request
  contract (`provider: email`, `providerData.password`) is **unchanged**, so the cut-over is not
  an API break.
- **Change and reset** write the platform credential (`change`, `reset`), keeping today's rules:
  change needs the current password when one exists and is a first set when none does
  (`user-authentication-methods.service.ts:821-836`), and both revoke platform sessions. The reset
  OTP stays in the Email method's `providerData` (`:660,693`): it is a mailbox-proof token, not a
  credential. **But it is stored in plain text and found by scanning**: `resetPassword` loads
  **every** Email method and compares each `passwordResetOtp.token` in a loop
  (`user-authentication-methods.service.ts:681-697`). Slice 2's reset rewrite **looks tokens up
  by hash** (store a hash of the token, query by it, compare in constant time) instead of
  scanning and holding the token readable.
- **`hasPassword`** on the Email method becomes "a platform credential exists" (the resolver and
  `authMethodHasPassword`, `auth-method-public.lib.ts:5-18`, change, the field does not).
- **The verification window** (`auth.handler.ts:460-467`) is a property of the **Email method's
  mailbox proof**, not of the secret: an unverified method older than
  `AUTH_PROVIDER_VERIFICATION_EXPIRATION_DAYS` is refused at login (`:458-467`,
  `verification.lib.ts:5-7`), and a session carries `requiresEmailVerification` and a
  `verificationExpiry` while it is unverified (`:558,592`). It sits after the credential check and
  applies to whichever method logged in. **It stays exactly as is**: it still gates password
  login on the Email method's `isVerified`, and nothing in the credential move changes who is
  verified or when. The one reading that changes is conceptual: it is now plainly "this mailbox
  was never proven", not "this password is stale".
- **Sign-in surface (console).** The console **keeps its inline email and password form as the
  default**, with the GitHub and Google buttons above "OR", as today
  (`auth.routes.ts:268-277`, `apps/web/lib/oauth-providers.ts`,
  `apps/web/app/[locale]/auth/login/page.tsx`): password-manager autofill and a fast sign-in
  stay. The cut-over itself changes no UI. Slice 6 adds the magic link below.
- **Console magic link: a text link "Send me a magic link"** under the Email field, styled like
  "Forgot password?" under the Password field.
  - It sends to the **address typed in the field**. An empty or invalid field shows the field's
    validation error and **nothing is sent**.
  - The response is **identical whether or not the account exists** ("If an account exists for
    this address, we've sent a link"), as `requestPasswordReset` already answers
    (`auth.handler.ts:780-817`, `auth.routes.ts:232-247`).
  - It **never creates an identity**: registration stays with "Create account" and respects
    disabled public sign-up (`auth.handler.ts:262-267`). Following the link **verifies the Email
    method** (`isVerified`) and signs the person in with a **platform session**, not a
    project-app code.
  - **Rate limits**: per IP, by adding the route to `AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS`
    (`rate-limit.middleware.ts:15-30`; the project equivalent is already there at `:21`), and
    **per address**, which is new: today forgot-password has only the global per-IP limiter
    (`rate-limit.middleware.ts:112-125`), so the per-address limit should be added to it too.
  - **It is also the console's recovery path when a password is locked** (slice 7), which is why
    it lands first.
  - **Eligibility**: **anyone with an existing identity**, the same as any other method. The
    link signs the person in; what they reach is decided by the closed-install rule, not by the
    magic link. When public sign-up is off, a console sign-in by **any method** never creates a
    Personal account for an identity that has none (bootstrap and a valid invitation excepted):
    the person is signed in **account-less** and reaches only their own settings (profile,
    security, preferences, notifications, privacy, project memberships), and account creation is
    refused for them while sign-up is off. That rule is fixed upstream, separately, in the branch
    `fix/closed-install-platform-access` (PR number to follow), and **is a prerequisite of slice
    6**: without it the magic link would hand an imported, account-less identity the Personal
    account that `login` creates today (`auth.handler.ts:496`).
  - **Reused from the project-app magic link** (platform-scoped, so a different callback and a
    session): the one-time token kept in the cache and consumed once
    (`project-oauth.handler.ts:543-559,675`, a platform key prefix and TTL), the mail send
    (`sendProjectOAuthMagicLink`, `:563`, a platform variant), and the verify-on-follow step
    (`resolveUserIdFromEmailForProject`, `auth.handler.ts:1157-1181`), used in a **find-only** mode:
    its create branch (`:1186-1202`) must not run. The callback creates the session as `login`
    does (`auth.handler.ts:568-580`), including the MFA step-up flag (`:66-77`), and hands it to the
    web app the way the platform OAuth callback does.
- **Project apps are not the console.** Nothing in this section applies to the hosted project
  sign-in (§ 5), which keeps one view per provider.

### 4. Project scope: import writes only the importing project's credential

`users[].password` (unchanged contract, `findBy: email` only) upserts the row for
`(importing project, resolved identity)`. **0010 (a)'s write to the global Email method's
`hashedPassword` is removed outright**, with the `passwordSource` marker it set and every rule that
guarded it. The new import path never reads or writes that slot.

**A credential needs a member.** The credential is written in a step **after user assignment**,
in the same transaction, and only for a user who is then a member of the importing project:
either this document assigned them (`roles`, `groups` or `permissions` on the `users[]` row; the
public document has no separate assignments section, `cdm-document.schemas.ts:265-301`, and
`user-assignment.cdm-entity.ts:230-234` skips a row with no assignment, creating no membership) or
they already were. **A password-only row for someone already a member of this project is
allowed**, so a passwords-only delta works. Membership is read inside the import transaction,
where the restrictive policy on `project_users` shows exactly the importing project's rows
(`project-users.schema.ts:51-55`): no cross-tenant read. A password for a user who is not a member
afterwards is a **validation error raised at apply time**, which rolls the transaction back and
names the position, never the address or hash. `validateSyncInput` cannot decide it, because it
is a pure function with no view of existing members.

Eligibility collapses to that. The v1.16.0 rules (this project's own import created it,
unverified, not found through GitHub or Google, no Grant-set password) all protected a global
field and go away. Forward-only provenance moves to the project:

- no row: create (`passwordsImported`);
- `source: cdm-import` and a different hash: replace (`passwordsUpdated`); identical:
  `passwordsUnchanged`;
- any other `source` (the person reset or changed it, or an operator set it): never touched,
  `passwordsSkippedExisting`;
- an absent `password` never deletes anything; `replace` keeps credentials, as 0010 rule 6.

**Counters.** `passwordsImported`, `passwordsUpdated`, `passwordsUnchanged` keep their meaning.
`passwordsSkippedExisting` keeps one narrow meaning: a project credential the person owns. No
conflict counter: two projects never write the same row.

**Verified and OAuth-found identities are no longer excluded.** The reasons to skip them guarded a
credential that opened the identity everywhere. This one opens the importing tenant's apps only,
and the tenant already decides who is a member and what roles they hold. The platform account, the
user's other projects and their GitHub or Google login are untouched. "Verification is the
handover" (0010 rule 4) becomes **a project-side reset or change is the handover**. § 8 is plain
about what limits a planted credential.

### 5. Project-app sign-in: `password` is its own provider

Password sign-in is **not a mode of Email**. `password` is a new value in
`ProjectApp.enabledProviders` (`project-apps.schema.ts:31`, a `string[]`) beside `email` (magic
link, unchanged), `github` and `google`. It **replaces** 0010 (b)'s `allow_password_sign_in`
boolean, so no new column. Two consequences of the list's semantics:

- An **empty or null `enabledProviders` means "every provider"** today
  (`project-oauth.handler.ts:503-504`, `project-oauth-entry.lib.ts:14-16`). `password` is
  **opt-in only**: on when the list names it, never by being empty, so no existing app grows a
  password form.
- The value is one more string in GraphQL, REST and the dashboard's provider field
  (`enabledProviders: [String!]`) and in `ProjectAppPublicInfo.enabledProviders`.

**Hosted sign-in** shows a **"Password" button with a key icon**, parallel to the Email icon and
"Email" label, when the app enables it (`project-oauth-entry.lib.ts:9-20` gains `showPassword`).
Clicking it opens **its own view** with an email and password form and **"Forgot password?"**,
which starts the project reset of § 6, exactly as clicking Email opens its own magic-link view
today. Email stays magic link only. Project apps keep **one view per provider**; they do not use
the console's inline layout.

**The password provider verifies only the project credential.** There is **no fallback to the
global or platform credential**; a person with no project credential there signs in by magic link
or OAuth, or resets (§ 6, which creates one). The result is the app authorization code the
magic-link callback already issues (`project-oauth.handler.ts:724-760`), never a platform session.

**Identifier: email only** for now (identities are email-keyed globally and the legacy source
signs in by email), resolved at step 1 of § 1. Other identifiers are a follow-up.

**Requirements carried from 0010 (b)**, each with what it really is today:

- **Per-identity lockout scoped to `(scope, user)`**, here `(project, user)`, is a prerequisite of
  the sign-in slice and guards **only the project credential**. The only live limiter is per
  client address (`rate-limit.middleware.ts:98-104`, key `auth:${ip}`);
  `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` and `AUTH_LOCKOUT_DURATION_MINUTES` are defined at
  `env.config.ts:149,152` and nothing reads them. _Stale since slices 4 and 7: both are read now
  (`env.config.ts:155,158`), by platform login at `auth.handler.ts:704` and by project password
  sign-in at `project-oauth.handler.ts:956`; see § Amendment 2026-10-29, 8._ A tenant can lock only
  its own project's credential, never platform login (§ 8). The store is built once for both scopes
  (slice 1); the platform scope turns it on later, as its own step (§ Slicing, slice 7).
- Generic failures and a **dummy compare** so timing does not reveal whether a credential exists.
- **MFA at the ceremony** when the platform requires it: `computeRequiresMfaStepUp` steps up only
  when `config.auth.minAalAtLogin === 'aal2'` and the user has an active enrolment
  (`auth.handler.ts:66-77`). 0010 (b)'s "or the app or project requires it" is **not** in that
  function and is not promised here.
- Sign-in **requires an existing membership**: a password never creates one (sign-up stays on
  magic link and OAuth, `project-oauth.handler.ts:758-760`).
- **`email_verified`** is **not a Grant-side control**. No such claim exists in `apps/api/src`;
  project-app tokens carry no verification state and are treated as verified
  (`docs/architecture/security.md`, token table). Whether to expose one is open question 1, and
  nothing here relies on it.

_Alternatives considered:_

- **Fall back to the global or platform credential when the project has none.** It makes the new
  public verify route an extra online guessing surface for a credential that is not the tenant's:
  a project administrator can already add any global user by email, so without planting anything
  they could test that person's platform password. The only live limiter is per client address; a
  **separate** per-identity throttle for that path is an extra guess budget that does not lock
  platform login, and a **shared** one lets a tenant lock a person out of platform login. Neither
  is acceptable, so the provider never reads the platform credential.
- Both credentials accepted at once: the same surface, doubled.
- A per-app precedence setting: another knob for a rule that no longer exists.
- Password as a mode of the Email provider with an `allow_password_sign_in` boolean (0010 (b)): a
  second switch beside `enabledProviders`, and a hosted page that cannot show "Email" and
  "Password" as the two different things they are.
- **A shared inline layout** for the console and project apps (email field, password field,
  "Forgot password?" and "Send me a magic link" together). Rejected for project apps: they keep
  one view per provider, driven by `enabledProviders`, so an app can offer Password without
  Email or the reverse and the hosted page stays a list of providers. The console keeps the
  inline form because it is the default and gives password-manager autofill.

### 6. Reset and change: one flow, parameterised by scope

- **Platform** keeps its flow (`requestPasswordReset`, `resetPassword`, `changePassword`) and
  writes the platform credential. It does not set `isVerified`, as today.
- **Project** "Forgot password?" applies to an **existing member** only, and the response is the
  same whether or not the address is a member, so the form does not enumerate them. Completing it
  proves the mailbox, so it **sets the global `isVerified`** exactly as the magic link does
  (`auth.handler.ts:1172-1181`), and **writes the project credential** (`source: reset`). It
  invalidates **that project's app sessions**: the user's `project_oauth_grants` across the
  project's apps (`project-oauth-grants.schema.ts`, keyed by `project_app_id`; no bulk revoke
  exists yet: the primitive is `revokeGrant` at `project-oauth-grants.service.ts:118`, called one
  grant at a time at `project-oauth.handler.ts:1134,1166`).
- Neither reads or clears the other scope's credential, and a platform reset revokes platform
  sessions only (`auth.handler.ts:909`, which calls `invalidateAllUserSessions`). _Corrected
  2026-10-29: this cited `user-authentication-methods.service.ts:735`; the revocation lives in the
  handler, and that line is now the reset-token check._
- A later import never overwrites a project credential whose `source` is not `cdm-import` (§ 4).

_Implementation note (slice 5):_ **bulk revoke** (Open question 4) is a repository method on
`project_oauth_grants` joined through `project_apps` (`softDeleteActiveGrantsForUserInProject`):
one `UPDATE ... WHERE user_id = $u AND deleted_at IS NULL AND project_app_id IN (SELECT id FROM
project_apps WHERE project_id = $p) RETURNING id`, in the completion's transaction, with an audit
row per revoked grant. No column on the grant: a denormalised `project_id` could drift from the
app's, would need a backfill and buys nothing (`project_oauth_grants_project_app_user_idx` already
serves the lookup). Apps are matched whether or not they are soft-deleted, since a grant on a
retired app is still a live refresh token. Only refresh is cut: an access token already issued
lives until it expires. The **reset token** is a row in `project_password_resets`, one per
`(project, user)`, holding the SHA-256 digest (slice 2's pattern), the Email method it was sent to
(completing the reset marks that method verified) and the request counter of the **per-address
limit**, which the same atomic upsert that stores the digest maintains (`PROJECT_PASSWORD_RESET_*`);
a newer link replaces the older, and a request over the limit is answered like any other and sends
nothing. The console magic link of slice 6 is a different surface and may share the idea, not the
table. Completion runs in one transaction: it consumes the token (row-locked), re-checks
membership, writes the credential (`source: reset`), clears the `(project, user)` lockout, marks
the Email method verified and revokes the grants. The reset link carries the token in the URL
fragment. This slice did not emit the password event: the credential's audit row recorded the
write. The event is implemented as `project.user_password_set` (§ 8), and the completion above
now publishes it as a `reset` write when the stored hash changes (_amended 2026-10-29_).

### 7. Platform cut-over migration (not a wipe)

One **schema migration**, one transaction, idempotent, count-reporting, copies platform passwords
out of the Email method and removes the hash from `providerData`. For each
`user_authentication_methods` row with `provider = 'email'` and a non-empty
`provider_data->>'hashedPassword'`:

| Row                                                       | Result                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| no `passwordSource` (set in Grant)                        | **copied verbatim** to `user_credentials`, `source: migrated`             |
| `passwordSource = 'cdm-import'` and `is_verified = true`  | **copied verbatim**, `source: migrated-import`                            |
| `passwordSource = 'cdm-import'` and `is_verified = false` | **not carried**: the hash is dropped (the tenant-written, unverified one) |

Then `hashedPassword`, `passwordSource` and any import markers are removed from `provider_data`
of every handled row. This **replaces the separate cleanup migration** of the previous draft.

- **Passwords keep working, no resets**: the same bcrypt hash is read from another table, and
  `compareSync` takes the cost from the hash (0010 Context).
- **Verified `cdm-import` hashes are carried** (`migrated-import`). By 0010 rule 4 verification
  was the handover, so Grant owns them, and the person may be using that password to sign in to
  the platform today; dropping it would strand them for a rule that has already decided they own
  it. The distinct `source` keeps them identifiable and, like every non-`cdm-import` source, out
  of reach of an import. _Alternative considered:_ clear them and make those people reset. Safer against a
  hash a tenant once planted and the owner never changed; costlier for real users. Decided: carry.
- **Idempotent**: `INSERT ... ON CONFLICT DO NOTHING`, and once `hashedPassword` is
  removed nothing matches again. **Report**: counts of methods scanned, copied by `source`,
  dropped (unverified import), skipped because a credential already existed, and stripped
  without a copy (soft-deleted methods and a second Email method for the same user, whose hash is
  not carried: the credential belongs to the identity, so the most recently updated hash wins).
  Emitted as `RAISE NOTICE` lines.
- The staging wipe and restore runs this migration on the restored Lisbon data; the real users
  (the maintainer, the Alteos members, personal projects) keep their passwords.

**Residual copies.** The hash also lived in `user_authentication_methods.provider_data`,
including its GIN index (`user-authentication-methods.schema.ts:41`); the update leaves dead
tuples until vacuum, and backups keep the old value. Neither is scrubbed here.

`changePassword` and `resetPassword` stop touching `passwordSource` and `hashedPassword` in the
**same deployable unit** as this migration (§ Slicing), never before it: platform reset does not
set `isVerified`, so removing the marker handling first would let the statement strip a Grant-set
hash that still carried a leftover marker.

_Implementation note (slice 2):_ today's `changePassword` does not revoke sessions (only the reset
flow does, in `auth.handler.ts`); slice 2 keeps exactly that ("keeping today's rules"), so the
sentence "both revoke platform sessions" in § 3 describes reset only. Until slice 3 lands an import
that carries a `password` is validated and then ignored, with a warning in the job result and no
counter moved: the v1.16.0 global slot is gone and the project credential it is replaced by is the
next slice. A migrated database also loses the plain-text `passwordResetOtp` tokens (§ 3): an
outstanding reset link stops working and the person requests a new one.

_Implementation note (slice 3):_ the credential step is `UserProvisionCdmEntity.postApply`, a new
optional second pass of `ICdmEntityHandler` that `ProjectImportService` runs after every handler's
`apply`, in the import transaction (a separate handler would have shared the `provisionedUsers`
input key, and export keys its sections by it). Membership is one `IN` query on `project_users`
(`filterMemberUserIds`), and `ICredentialService.importProjectPasswordHashes` does the one `IN`
read of the project's credentials and the provenance decision in memory, so the hash is compared
inside the service and never returned; only the rows that change are written (upsert, audit row,
lockout reset). The membership refusal names `users[]` positions of the document, never an address.
Two rows that resolve to one person are applied in order, so the last hash wins.

### 8. Security notes

- **What a tenant admin can do.** CDM already lets a project administrator add any global user to
  the project by email (0010 Security notes 1). Now the same administrator can plant a hash for
  that person, which opens **only that tenant's apps** through the password provider. Compare with
  today: a global write that, with the verification window open, opened the **platform** account
  of a person the administrator has no relationship with. The new exposure is inside the tenant's
  own trust domain, where the administrator already controls membership and roles; the old one
  crossed it.
- **What does _not_ limit it on the token.** Grant does not enforce `email_verified` or a
  post-mint MFA check on a project-app token: those tokens skip the email-verification and MFA
  guards (`email-verification-rest-guard.ts:25-28`, `mfa-rest-guard.ts:23`) and carry no
  verification state. The real limits are the token's `aud` (the app's `client_id`) and `scope`,
  which confine it to the tenant's own apps, and MFA **at the sign-in ceremony** when the
  platform requires it (`computeRequiresMfaStepUp`, `auth.handler.ts:66-77`, steps up only when
  `minAalAtLogin` is `aal2`). A tenant app that wants more must ask for it itself.
- **Lockout residual.** The per-`(project, user)` lockout lets a tenant, or anyone able to guess
  its members' addresses, lock the **project** password of those users out. It cannot touch
  platform login or another project, and the user can still use magic link or a reset. If the
  platform scope turns its lockout on (slice 7), the same trade applies there: an
  attacker who knows an address can lock that person's platform password, with OAuth and a
  password reset as the way back.
- **Pre-claim** of an address with no Grant identity yet remains (the same administrator creates
  the identity); the person recovers by a project reset or magic link.
- **Audit.** Each credential table has an audit-log table recording create, replace, reset,
  change and delete with `source`, scope and user, **never the hash**. Events:
  `user.password_changed` as today for the platform scope, and a `project.user_password_set`
  for the project scope; counters only on the import completion event. _Amended 2026-10-29: the
  project event is named `project.user_password_set`, carries `source` instead of a `reason`, is
  published for every non-import write whose stored hash changes, and is **not** published by an
  import. The full rule is in § Amendment 2026-10-29, 6. The audit-log table also gains an
  `export` action, § Amendment 2026-10-29, 4._
- **GDPR.** The data export lists, per scope and project, that a credential exists with its
  `source` and dates, **never the hash** (`me.handler.ts:440-447` builds that list from
  `listForUser`; `:413-436` exports methods without `providerData` for the same reason). Erasure: a
  hard-deleted user cascades; a soft-deleted user's credentials are soft-deleted in the same transaction. Removing a project member
  (`project-users.service.ts:408`) soft-deletes their project credential **in the same
  transaction**, so re-adding them never revives an old password. Slice 1 **extends**
  `data-retention-cleanup.job.ts` to purge soft-deleted credentials on its next run: today it
  hard-deletes only users whose accounts passed `accountDeletionRetentionDays` and purges no
  soft-deleted rows (decided, no retention period). Project removal cascades.
- **Timing and cost** as 0010 Security notes 2 and 6 (cost ceiling, constant-time compare), now per
  credential.

## Slicing plan

1. **Credential storage, port and verifier for both scopes.** The two tables, audit tables,
   migration of the **schema only**, repositories, the scoped service and port, the verifier with
   dummy compare, the per-`(scope, user)` **lockout store** (built here, enabled for the project
   scope by slice 4), member-removal and user-erasure hooks, export entry, and the retention
   extension. No behaviour change.
2. **Platform cut-over: one deployable unit** (one PR, or a stack merged atomically): the data
   migration of § 7, platform register, connect, login, change and reset reading and writing the
   platform credential, `hasPassword`, **and** the import ceasing to write the global slot and
   the marker handling removed from `changePassword` and `resetPassword`, whose rewrite also
   moves the reset token to a **lookup by hash** (§ 3). Tests assert a migrated
   hash still logs in, registration and reset write the credential, and an unverified `cdm-import`
   hash is not carried.
3. **Import writes project credentials** (§ 4): the step after assignment, the apply-time
   membership check, counters, tests, OpenAPI and docs. _Reusable from #544:_ resolving the rows
   up front in one batched lookup and deciding in memory (here one `IN` query on the credential
   table, inside the import transaction and RLS-visible, so none of #544's login-role read or
   confinement logic is needed), the REST `ProjectSyncJob.result` schema listing the password
   counters with descriptions, and its OpenAPI test. _Not reusable:_ confinement, the tombstone
   and `passwordsSkippedConflict`, `clearCdmPasswordMarkers`, the OAuth guard. Slice 3 may merge
   with or after slice 2, but never before it (the import must not write a slot slice 2 removes).
4. **Project-app `password` provider** (0010 (b), re-pointed): the `password` value of
   `enabledProviders` through GraphQL, REST and the dashboard's provider field (replacing
   `allow_password_sign_in`, opt-in only), the sign-in route verifying the project credential
   only, the `(project, user)` lockout switched on, dummy compare, MFA at the ceremony, **and the
   web hosted sign-in UI**: the "Password" button with a key icon, the email and password form,
   the "Forgot password?" link, and i18n.
5. **Project-app reset and forgot password** (§ 6), with the bulk revoke of a user's grants in a
   project.
6. **Platform sign-in: magic link and UI.** The console magic-link request and callback
   endpoints (§ 3), the per-IP and per-address limits, the platform session hand-off, and the
   "Send me a magic link" link with i18n. **Prerequisites:** the upstream closed-install fix
   (`fix/closed-install-platform-access`, § 3), and it **must land before slice 7**. It adds
   routes and a link, no change to the existing form.
7. **Enable the platform lockout** (own step, using the then-unread
   `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` and `AUTH_LOCKOUT_DURATION_MINUTES`; both are read now, § 5):
   only once platform password reset **and** the console magic link are confirmed working on the new credential store, because they are the way back
   from a locked password. The store itself is built in slice 1.

### Release

**Changeset: minor, with a BREAKING note** (Ale's call; strictly semver would say major). The
public contract is almost unchanged (`users[].password`, the four counters, the login and
register requests), but the note must say: password hashes **move** from `providerData.hashedPassword`
to a credential table (anything reading that field breaks; `hasPassword` is preserved); an
imported password no longer opens the platform and unverified `cdm-import` hashes are dropped by
the migration; and a password for a user who is not a project member after an import is rejected.
`grant-api` and `@grantjs/schema` are bumped; slices 1, 4, 5 and 6 add tables, a provider value and
routes.

### Follow-ups (out of scope for the slices above)

- **Further identifier resolvers**, which plug in at step 1 of § 1 and touch neither the
  credential tables nor the verifier or lockout: a **username**, unique per project (and, for the
  platform scope, globally unique), kept in its own per-scope identifier table; a phone number.
  Identities stay email-keyed. Two things travel with that: a **non-mailbox identifier such as a
  username still needs a verified recovery channel** (email or phone) for "Forgot password?", and
  every identifier that resolves to a user shares that user's one `(scope, user)` guess budget.
  A possible use, not claimed as needed: a per-project identifier could let legacy users who
  **share one email address** (today keyed by legacy id, with no password) sign in individually;
  nothing here assumes the legacy system has usernames.
- **Self-service change of a project password.** A signed-in project-app user changes their
  project credential (`source: change`), with the rules of a reset: the `(project, user)`
  lockout, MFA at the ceremony when the platform requires it, and revocation of the user's
  project grants. Until it lands nothing writes `change` in the project scope.
- **Per-environment write-back** of a changed password: per-project credentials make it possible
  without touching a global field.

## Consequences

- The Email method is purely mailbox proof. Registering, resetting and changing a platform
  password never edits `provider_data`.
- Imports stop touching global state, and `passwordsSkippedExisting` drops from "almost everyone"
  to "people who reset it themselves". Two environments of one source system each keep their own
  hash for the same person: no conflicts, nothing lost, no resets.
- A person who verified, then rotated only the legacy password, is **re-synchronized** until they
  reset in the project app; 0010's accepted cost disappears.
- An imported password no longer opens the **platform**: it could only ever do so inside the
  verification window or after verification, which 0010 already called unwanted for project apps.
- Password sign-in is an explicit, opt-in provider with its own button; no app gains it by having
  an empty provider list, and the platform credential is never accepted at a tenant surface.
- 0010's (a) rules 3, 4, 5, 6 and 8 and Security notes 1 describe v1.16.0 and are superseded by
  this record; each carries a pointer here. (b) is re-pointed, not dropped.
- `grant-etl` needs no counter change: #544's `passwordsSkippedConflict` is not shipped. Its
  documents may need an assignment, or an existing membership, for every user that carries a
  password.
- The published `@grantjs/client`, `@grantjs/server` and `@grantjs/cli` keep their request
  contracts; any consumer of `providerData.hashedPassword` (none in this repository outside the
  files cited) is affected.

## Open questions

All of Ale's questions are answered and folded into the sections above (the last, who may use
the console magic link, by the closed-install fix of § 3). Still open, for **grant-agent**:

1. **Which token carries `email_verified`**, if any, and how a project app reads it (there is no
   such claim in `apps/api/src`). Nothing in this record relies on one.
2. **Apply-time membership check** (§ 4): which handler writes the project credential after
   assignment (a new handler ordered after `user-assignment.cdm-entity.ts`, or a step in it), and
   does any ETL send password rows for users that are not and will not be members?
3. **Lockout store**: the cache used for OAuth state, or a table. Its shape, per `(scope, user)`
   and guarding one credential, is decided; only the store is open. It gates slice 4 (the project provider) and slice 7.
4. **Bulk revoke of a user's project grants** (§ 6): a repository method on
   `project_oauth_grants` joined through `project_apps`, or a new column on the grant? _Decided in
   slice 5: the repository method (see the note in § 6)._
5. **Other readers of `providerData.hashedPassword` and `hasPassword`**: this record found
   `auth.handler.ts`, `user-authentication-methods.service.ts`, `auth-method-public.lib.ts`, the
   import entity and an e2e helper. Anything in the published SDKs or the web app that reads the
   field directly, or a user with two Email methods, would need handling in slice 2.

## Amendment 2026-10-29: operator set-password, the export exception and `project.user_password_set`

Status stays Proposed. This section records what the `operator-set-password` story built, checked
against the code on its stack rather than against its plan; where it differs from the text above,
it governs. The need: an operator must be able to give a project user a password without a reset
mail, and a downstream identity mirror (a legacy identity system kept in step with Grant) must be
told when a project password changed and be able to read the hash to carry it across.

### 1. Source `admin-set`

- The seventh value of `CREDENTIAL_SOURCES`. Both `CHECK` constraints on `source`
  (`project_user_credentials_source_check`, `user_credentials_source_check`) are widened by
  migration `0092_admin_set_credential_source.sql`: drop and re-add, no data change. The list is
  one enum for both scopes (§ 2), so both tables take it; only the project scope ever receives it.
- _Why a value of its own rather than `reset` or `change`:_ an audit row and the event's `source`
  then say what happened, and no reader has to infer "an operator" from a reset with no mail.
- **Final with respect to the import.** The import's rule is unchanged (§ 4): only `cdm-import`
  is replaceable, so an `admin-set` credential is skipped and counted in
  `passwordsSkippedExisting` (`importProjectPasswordHashes`, and the conditional
  `upsertImported`). It needed no change to the guard.

### 2. Operator set-password

GraphQL `setProjectUserPassword(input: { userId, password, scope }): User!` and REST
`PUT /api/users/:id/password` (body `{ scope, password }`, answers `200` with the `User`). The
transport enforces `ProjectUser:SetPassword` (§ 3); the handler tests no role. Order of events:

1. The scope must be a project scope (`OrganizationProject` or `AccountProject`), else
   `ValidationError`, and must be the scope the transport authorized (§ 7).
2. The password is checked against the Grant policy with `assertPasswordMeetsPolicy`, **before**
   any transaction or write. A refusal never contains the value.
3. One transaction: the target must already be a member of the project, else `NotFoundError`
   (never a create); the credential is written through `CredentialService.setPassword` with
   `source: 'admin-set'`, which leaves the audit row (`performedBy` is the operator), resets the
   `(project, user)` lockout and publishes the event (§ 6); then the user's project-app OAuth
   grants are revoked, as the project reset does (§ 6, slice 5 note).
4. **Not done, on purpose.** Platform sessions are untouched: a project user authenticates to
   project apps, and a project reset does not touch them either. The Email method is **not** marked
   verified: that is what a reset proves by reaching the mailbox, and an operator set proves
   nothing about it.

The same password set twice is not a no-op: bcrypt salts, so the stored hash is replaced and the
event fires. Detecting "same password" would mean verifying the new value
against the stored hash on an operator path, a comparison oracle for no benefit.

### 3. Permissions

- **`ProjectUser:SetPassword`** is an ordinary, extensible action, declared and checked like
  `ProjectUser:SetEmail`. It belongs to the `ProjectUserOwner` group (Organization Owner, Personal
  Account Owner, Organization Account Owner) and the `ProjectUserAdmin` group (Organization
  Admin), and to no Developer, Viewer or common group. An organization that adds it to another
  role's group gets it with no code change.
- **`ProjectUser:ExportCredentials`** is declared on `ProjectUser` and placed in **no standard
  group**: it reads hashes, so nobody holds it by default, Owner and Admin included. An organization
  grants it deliberately to the group of the role a mirror's API key carries. The seed created
  `permissions` rows only from group templates, so an action with no group would have had no row to
  grant; `STANDALONE_PERMISSIONS` in `@grantjs/constants` lists such actions and
  `seed-permissions.ts` seeds each as a row with no `group_permissions` link.
- Both reach organizations bootstrapped earlier the way every standard permission does: `seedAll`
  is instance-wide and idempotent (ADR 0001). There is no per-organization backfill.

### 4. The export exception

This record, and 0010 rule 7, say a hash exists in the credential store and nowhere else, and that
no API returns it. There is now **one** exception, and it is deliberate, gated and audited:

- **Surfaces.** GraphQL `exportProjectUserCredentials(input: { scope, userIds, kinds })` and REST
  `POST /api/users/credentials/export` (body `{ scope, userIds, kinds }`; POST because it is an
  audited action with a body, not a cacheable read). Both are gated at the transport by
  `ProjectUser:ExportCredentials`. The REST response carries `Cache-Control: no-store`.
- **Shape.** `{ users: [{ userId, password: { algorithm: 'bcrypt', hash } | null }] }`: the CDM
  `users[].password` shape of 0010 rule 1, so a mirror can feed it to an import. A member with no
  project credential is listed with `password: null`. `kinds` is an enum, `CredentialKind`, with
  one member (`PASSWORD`, the default; an empty list is refused), so a later credential type is a
  new kind and not a second export.
- **No partial export.** `userIds` must be non-empty UUIDs and at most one page
  (`config.system.maxPageSize`); the whole project is many calls. **Every** id is checked for
  membership first: a single non-member fails the call with `NotFoundError`, and nothing is read
  or audited.
- **A dedicated read.** Hashes are read by `findHashesForExport`, a repository method that names
  its columns (`userId`, `hash`, `source`, `updatedAt`) and runs in the request's project scope
  under RLS. No existing read grew a hash. Its only caller is `ProjectUserCredentialExportService`,
  which serves the export and the fingerprint of § 5, both behind the same permission.
- **Audit.** Each successful call writes exactly one `export` row on
  `project_user_credential_audit_logs`, in the same transaction as the read: `performedBy` is the
  caller, there is no entity id and no old or new values, and the metadata is
  `{ projectId, userCount, credentialCount, kinds }`, never a hash. The audit write is not
  best-effort here: if it fails the export fails with it. A call refused at the gate, or by the
  membership check, writes no row.
- **Intended holder** is a downstream identity mirror, a machine. There is no export in the web
  UI. _What it does not change:_ a hash is still absent from `providerData`, `metadata`, search,
  other audit values, events, webhook payloads and logs, and from the data export of § 8 (GDPR);
  `hasPassword` keeps its platform-scope, own-account meaning; the project CDM exporter still
  emits no `password`.
- _Residual, accepted:_ a holder can take the bcrypt hash of every member it names out of Grant and
  attack it offline. That is the trade the permission names, and the reason it has no default
  holder, is checked at the transport, needs the same email and MFA steps as other operator
  actions, and leaves one audit row per call.

### 5. The fingerprint: `User.passwordCredential`

`User.passwordCredential { source, updatedAt, fingerprint }` (type `ProjectUserPasswordCredential`)
tells a mirror **when** to call the export without reading a hash.

- `fingerprint` is the lowercase hex SHA-256 of the stored bcrypt hash string. It is computed on
  read, never stored, and never derived from the password. bcrypt output is not recoverable from
  its digest, so the value is a change detector, not a secret: it changes when the hash changes
  and says nothing about the password.
- It is still gated, because it tells a caller that a credential exists, where it came from and
  when it changed. It is readable only by a caller holding `ProjectUser:ExportCredentials`,
  **not** by `ProjectUser:Read`, so a Viewer learns nothing new about credentials. For anyone else
  the field resolves to `null`, not an error, so existing `User` documents keep working.
- It is resolved in the **request's** project scope (`context.user.scope`) and is `null` in any
  other scope, and `null` when the member has no project credential there.
- _Why on `User`, not `ProjectUser`:_ the first plan put it on `ProjectUser`, but no query or
  mutation returns `ProjectUser` (the users list under a project returns `User`), so the field
  would have been unreachable. `User` is global, so the field means something only in a project
  scope, which is why it is scope-resolved. It is one read per `User` returned, not batched.
- It also covers what the event does not: an import changes a credential silently (§ 6), and the
  fingerprint is how a mirror sees that.

### 6. The event: `project.user_password_set`

This is § 8's `project_user.password_set`, built under the catalog's name. The catalog and webhook
redaction both key on the `project.user_*` prefix (`event-catalog.ts`, `isUserEvent` in
`webhook-redaction.lib.ts`), so the draft name would have been the odd one out.

- **Delivery.** `webhookOnly('membership')`: webhook consumers only, an empty audience (no inbox
  row, no email). It is a project event delivered whatever the request scope (ADR 0012), with an
  explicit project scope, `subjectUserId` the project member and the member's `projectUser` row as the
  aggregate.
- **Payload.** `data.after = { projectId, userId, source }`, ids and source only, with `source`
  one of `CREDENTIAL_SOURCES` (so never `cdm-import`: imports are silent, below). Never a
  password or a hash, and no key whose name contains `password`, `hash` or `secret`: redaction
  would blank such a key, and omission, not redaction, is the control.
- **One emission point, change-only.** `CredentialService.write()` publishes it, for project-scope
  writes only, and only when the stored hash differs from the one it replaces
  (`existing?.hash !== hash`). So it fires for every non-import project write (`admin-set`,
  `reset`, and `change` once something writes it) and never for platform scope, whose
  `user.password_changed` is unchanged. Writing the same password twice fires twice (§ 2).
- **A standalone publisher.** The event goes out through `ProjectUserCredentialEventPublisher`,
  behind the port `IProjectUserCredentialEventPublisher` in `@grantjs/core`, a required
  constructor argument of `CredentialService`. It is not a `ProjectUserService` method because
  `ProjectUserService` already depends on `CredentialService`: the other way round is a
  construction cycle. The project scope lookup moved with it to `lib/project-scope-resolver.lib.ts`.
- **CDM imports are silent.** `importProjectPasswordHashes` never publishes, and a project import
  runs under `runWithEventSuppression` like every other import write; an event per row would have
  needed a bypass of that suppression. The mirror learns import-side changes from the import's
  completion event, whose counters (0010 rule 8, § 4) already carry them, and from the
  fingerprint of § 5. An operator-set credential is not replaceable by an import at all (§ 1).

### 7. Authorized-scope guard

`setProjectUserPassword` and `exportProjectUserCredentials` refuse an input scope that differs from
the scope the transport authorized, with `AuthorizationError('Forbidden')` before any read or
write; a generic transport-level check of the same kind is a separate story.

### 8. Corrections made, and one left in the code

- **§ 6, platform reset** cited `user-authentication-methods.service.ts:735` for the session
  revocation; it is `auth.handler.ts:909` (corrected in place).
- **§ 6, slice 5 note** said the password event was left to a later slice; it is now built (§ 6
  above, corrected in place).
- **§ 8, Audit** named the event `project_user.password_set` with a `reason` of `import`, `reset`
  or `change`; corrected in place.
- **§ 8, GDPR** cited `me.handler.ts:386-402` for the export; that range is session revocation and
  `myUserDataExport` starts at `:400`. The credential list is at `:440-447` and the methods
  without `providerData` at `:413-436` (corrected in place).
- **§ 5, lockout** said nothing reads `AUTH_MAX_FAILED_LOGIN_ATTEMPTS`; platform login
  (`auth.handler.ts:704`) and project sign-in (`project-oauth.handler.ts:956`) do (marked in place
  in § 5 and in slice 7 of the slicing plan).
- **Checked and still true:** nothing writes `change` in the project scope (the Follow-ups),
  because self-service change of a project password is not built.
- **Left in the code, not touched by this amendment:** the doc comment on `ICredentialLockoutService`
  in `packages/@grantjs/core/src/ports/services/credential.service.port.ts:154` still says it is
  "not called by any sign-in path until ADR 0011 slice 4". Project password sign-in and platform
  login both call it now, so the comment describes the state when it was written.

## References

- Platform password today: `apps/api/src/handlers/auth.handler.ts:66-77,228-335,421-430,460-467`,
  `apps/api/src/services/user-authentication-methods.service.ts:385-398,706-710,821-836`,
  `apps/api/src/lib/auth-method-public.lib.ts:5-18`
- Import today: `apps/api/src/lib/cdm/entities/user-provision.cdm-entity.ts:92-277`
- Project sign-in: `apps/api/src/handlers/project-oauth.handler.ts:485-520,724-760`,
  `apps/web/lib/project-oauth-entry.lib.ts:9-20`
- Platform provider list: `apps/api/src/rest/routes/auth.routes.ts:268-277`,
  `apps/web/lib/oauth-providers.ts`
- Console magic link, reused pieces: `apps/api/src/handlers/project-oauth.handler.ts:543-563,675`,
  `apps/api/src/handlers/auth.handler.ts:1157-1181`; limits: `apps/api/src/middleware/rate-limit.middleware.ts:15-30,112-125`
- Project tables and conventions: `packages/@grantjs/database/src/schemas/project-apps.schema.ts`,
  `project-oauth-connections.schema.ts`, `project-user-api-keys.schema.ts`, `project-users.schema.ts`,
  `project-oauth-grants.schema.ts`, `user-authentication-methods.schema.ts`
- Rejected alternative: [#544](https://github.com/grant-js/grant/pull/544)
- Operator set-password, export and event (amendment): `apps/api/src/handlers/users.handler.ts`
  (`setProjectUserPassword`, `exportProjectUserCredentials`, `getProjectUserPasswordCredential`),
  `apps/api/src/services/credentials.service.ts`,
  `apps/api/src/services/project-user-credential-events.service.ts`,
  `apps/api/src/services/project-user-credential-exports.service.ts`,
  `apps/api/src/lib/credential-fingerprint.lib.ts`,
  `packages/@grantjs/schema/src/events/event-catalog.ts`,
  `packages/@grantjs/constants/src/permissions/permissions.ts` (`STANDALONE_PERMISSIONS`),
  `packages/@grantjs/database/src/scripts/seed-permissions.ts`,
  `packages/@grantjs/database/src/migrations/0092_admin_set_credential_source.sql`;
  operator docs: `docs/core-concepts/events-webhooks-notifications.md`, `docs/architecture/rbac.md`
