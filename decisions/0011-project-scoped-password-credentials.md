# 0011 — Project-scoped password credentials for project apps

- **Status**: Proposed
- **Date**: 2026-10-15
- **Context**: [#544](https://github.com/grant-js/grant/pull/544), an attempt to make ADR 0010's
  import reach the identities migrated users really have, which showed the storage is wrong, not
  the eligibility rule
- **Amends**: [0010](./0010-cdm-import-of-bcrypt-password-hashes.md) (a) rules 3 to 6 and 8, and (b)
- **Depends on**: [0008](./0008-per-project-oauth-connections.md) (project grain for project apps)
- **Scope**: design only. This record changes no code; § Slicing lists the implementation slices.
- **Compatibility**: none. Grant has no users or integrations beyond its maintainer's own and staging
  can be wiped and re-imported, so this is a **clean break**: no migration of v1.16.0 data, no
  dual read, no deprecation period. Where that changed a trade-off, the text says so.

## Context

**Identities are global; a password is the only credential a tenant's input can write.** One
email is one identity and one `user_authentication_methods` row, shared by every organization and
project. A magic link and a GitHub or Google login carry no secret a tenant supplies. The bcrypt
hash of ADR 0010 is the only one, and it is written into that shared row
(`user-provision.cdm-entity.ts:228-277`, `providerData.hashedPassword`), where platform login
reads it (`auth.handler.ts:421-430`).

**The legacy source holds one hash per environment for the same person.** Each environment is a
project, so two projects can import different hashes into the one global field. Measured on
staging: 2,527 identities, 203 in more than one project, 0 in more than one organization.

**0010 already treats the imported hash as a project credential in everything but storage.**
Its part (b) lets it open a **project app** only, yielding an app authorization code, never a
platform session. Its own consequences say the imported credential
stops working for **platform** login once the verification window passes
(`auth.handler.ts:460-467`). A credential that is meant to open one tenant's apps, and nothing
else, is stored where every tenant and the platform read it. Rules 4 and 5 of 0010 (forward-only
ownership, "an identity the import may write") exist only to make that mismatch safe.

**Precedent.** ADR 0008 moved OAuth connections to project grain for project apps and left
platform login on the global configuration. Same move here, for the one credential a tenant
writes.

### What #544 showed (rejected alternative)

#544 widened eligibility to "confined to the importing project's organization" and handled two
environments disagreeing with a conflict tombstone. It works in tests, and it is the wrong
direction:

- **The membership read cannot be made in the import's own scope.** The import runs as the
  restricted RLS role with the importing project as tenant, so `project_users` shows only that
  project's rows (`project-users.schema.ts:51-55`). Confinement therefore reads on the login role,
  outside the import transaction, a deliberate hole in tenant isolation that needs a second pooled
  connection.
- **Sibling imports race.** The credential is one JSON field with no lock; two environments
  importing at once both write and no conflict is recorded.
- **A conflict has no good outcome.** The tombstone removes both environments' passwords and sends
  the person to reset. Order-independent, but the person loses a working credential because two
  tenants disagree about a secret neither of them should own globally.
- **Confinement is a heuristic for "no other tenant relies on this identity".** It needs an
  OAuth-method guard to stay safe and a rule for membership-less users.

All of that is eligibility machinery compensating for a global store. Removing the global store
removes the machinery.

## Decision

**A tenant's imported or project-set password is a credential of (user, project), stored in its
own table. It is verified only by that project's apps. Platform login never sees it.**

### 1. Storage: `project_user_credentials`

A table named and shaped like its siblings (`project_user_api_keys`, `project_user_groups`:
`project_id` + `user_id` columns, not a foreign key to `project_users.id`, which is replaced when
a member is re-added). Schema file `project-user-credentials.schema.ts` in
`packages/@grantjs/database/src/schemas`, with a `project_user_credential_audit_logs` table as
`project-oauth-connections.schema.ts:39-61` does.

| Column                                                   | Notes                                                                                                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                     | uuid, default random                                                                                                                          |
| `project_id`, `user_id`                                  | uuid, `ON DELETE CASCADE` to `projects` and `users`, not null                                                                                 |
| `hash`                                                   | `varchar(255)`, the stored bcrypt hash (the `$2a$`/`$2b$`/`$2y$` prefix names the algorithm; no `algorithm` column until a second one exists) |
| `source`                                                 | `varchar(32)`: `cdm-import`, `project-reset`, `project-change` (in the enum now, written only once the self-service change follow-up lands)   |
| `last_used_at`, `created_at`, `updated_at`, `deleted_at` | as the siblings                                                                                                                               |

Unique `(project_id, user_id) WHERE deleted_at IS NULL`; indexes on `project_id`, `user_id`,
`deleted_at`. The same restrictive `tenant_isolation_policy` on `app.current_project_id` as
`project-user-api-keys.schema.ts:44-49`, so the import, running as that tenant, sees exactly its
own rows.

**One credential per project, shared by its apps**, as 0008 chose for connections (per-app
credentials deferred for the same reason). The hash never appears in `metadata`, search, audit
values, events or logs, as 0010 rule 7.

_Rejected:_ a column on `project_users` (the membership row is soft-deleted and re-created, and
its `metadata` is exported and searched, which 0010 already rejected for the hash); a JSON field on
the global method keyed by project (same race and the same RLS-blind reads); a credential per
`ProjectApp` (finer than needed, deferred in 0008).

### 2. Import writes only the importing project's credential

`users[].password` (unchanged contract, `findBy: email` only) upserts the row for
`(importing project, resolved identity)`. **0010 (a)'s write to the global Email method's
`hashedPassword` is removed outright**, together with the `passwordSource` marker it set and
every rule that existed to guard it. The new import path never reads or writes that slot, and
ignores any import-marked hash already in it.

**A credential needs a member.** The credential is written in a step **after user assignment**, in
the same transaction, and only for a user who is then a member of the importing project, whether
this document assigned them (`roles`, `groups` or `permissions` on the `users[]` row; the public
document has no separate assignments section, `cdm-document.schemas.ts:265-301`, and
`user-assignment.cdm-entity.ts:230-234` skips a row with no assignment, creating no membership) or
they already were. **A password-only row for someone already a member of this project is
allowed**, so a passwords-only delta works. Membership is read inside the import transaction,
where the restrictive policy on `project_users` shows exactly the importing project's rows
(`project-users.schema.ts:51-55`): no cross-tenant read. Anything else, a password for a user who
is not a member afterwards, is a **validation error raised at apply time**, which rolls the
transaction back and names the position, never the address or hash. `validateSyncInput` cannot
decide it, because it is a pure function with no view of existing members.

Eligibility collapses to: _the row resolves to an identity that is, or becomes in this import, a
member of the importing project._ The v1.16.0 rules (this project's own import created it,
unverified, not found through GitHub or Google, no Grant-set password) all existed to protect a
global field and go away.

Forward-only provenance moves to the project:

- no row: create (`passwordsImported`);
- `source: cdm-import` and a different hash: replace (`passwordsUpdated`); identical:
  `passwordsUnchanged`;
- `source` is anything else (the person reset or changed it in a project app): never touched,
  `passwordsSkippedExisting`;
- an absent `password` never deletes anything; `replace` keeps credentials, as 0010 rule 6.

**Counters.** `passwordsImported`, `passwordsUpdated`, `passwordsUnchanged` keep their meaning.
`passwordsSkippedExisting` keeps one, narrow, meaning: a project credential the person owns. No
conflict counter: two projects never write the same row.

**Verified and OAuth-found identities are no longer excluded.** The reasons to skip them guarded
a credential that opened the identity everywhere. This one opens the importing tenant's apps
only, and the tenant already decides who is a member and what roles they hold there. The
platform account, the user's other projects and their GitHub or Google login are untouched. "Verification is the handover" (0010 rule 4) is replaced by **a project-side reset or change is the
handover**: verifying the mailbox is a global fact that says nothing about whether the legacy
system still owns this project's password. § 7 is plain about what limits a planted credential.

### 3. Project-app sign-in: `password` is its own provider

Password sign-in is **not a mode of Email**. `password` is a new value in
`ProjectApp.enabledProviders` (`project-apps.schema.ts:31`, a `string[]`) beside `email` (magic
link, unchanged), `github` and `google`. It **replaces** 0010 (b)'s `allow_password_sign_in`
boolean, so no new column: the existing per-app provider list is the switch. Two consequences of
that list's semantics:

- An **empty or null `enabledProviders` means "every provider"** today
  (`project-oauth.handler.ts:503-504`, `project-oauth-entry.lib.ts:14-16`). `password` is
  **opt-in only**: it is on when the list names it, never by being empty, so no existing app
  grows a password form.
- The value is one more string in GraphQL, REST and the dashboard's provider field
  (`enabledProviders: [String!]`), and in `ProjectAppPublicInfo.enabledProviders`.

**Hosted sign-in** shows a **"Password" button with a key icon**, parallel to the Email icon and
"Email" label, when the app enables it (`project-oauth-entry.lib.ts:9-20` gains `showPassword`).
Clicking it opens an email and password form with **"Forgot password?"**, which starts the
project-app reset of § 5. Email stays magic link only.

**The password provider verifies only the project credential.** There is **no fallback to the
global Grant password**, and a person with no project credential there signs in by magic link or
OAuth, or resets (§ 5, which creates one). The result is the app authorization code the
magic-link callback already issues (`project-oauth.handler.ts:724-760`), never a platform
session.

**Identifier: email only** for now (identities are email-keyed globally, and the legacy source
signs in by email). Username as an alternative identifier is a follow-up.

**Requirements carried from 0010 (b)**, each with what it really is today:

- **Per-identity lockout scoped to `(project, user)` is a prerequisite of the sign-in slice**, and
  it guards **only the project credential**. The only live limiter is per client address
  (`rate-limit.middleware.ts:98-104`, key `auth:${ip}`);
  `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` and `AUTH_LOCKOUT_DURATION_MINUTES` are defined at
  `env.config.ts:149,152` and nothing reads them. A tenant can therefore lock only its own
  project's credential, never platform login (§ 7 states the residual). Cache or table is the
  slice's choice.
- Generic failures and a **dummy compare** so timing does not reveal whether a credential exists.
- **MFA at the ceremony** when the platform requires it: `computeRequiresMfaStepUp` steps up
  only when `config.auth.minAalAtLogin === 'aal2'` and the user has an active enrolment
  (`auth.handler.ts:66-77`). 0010 (b)'s "or the app or project requires it" is **not** in that
  function and is not promised here.
- Sign-in **requires an existing membership**: a password never creates one (sign-up stays on
  magic link and OAuth, `project-oauth.handler.ts:758-760`).
- **`email_verified`** is **not a Grant-side control**. No such claim exists in `apps/api/src`;
  project-app tokens carry no verification state and are treated as verified
  (`docs/architecture/security.md`, token table). Whether and where to expose one is open
  question 1, and nothing here relies on it.

_Alternatives considered:_

- **Fall back to the global Grant password when the project has no credential** (considered and
  declined). It makes the new public verify route an extra online guessing surface for a
  credential that is not the tenant's: a project administrator can already add any global user
  by email, so without planting anything they could test that person's global password. The only
  live limiter is per client address; a **separate** per-identity throttle for that path is an
  extra guess budget that does not lock platform login, and a **shared** one lets a tenant
  deliberately lock a person out of platform login. Neither is acceptable, so the provider never
  reads the global password. A tenant surface verifying a person's global password is not
  harmless: every guess it answers is information the platform login's limiter never sees.
- Both a project and the global password accepted at once: the same surface, doubled.
- A per-app precedence setting: another knob for a rule that no longer exists.
- Password as a mode of the Email provider with an `allow_password_sign_in` boolean (0010 (b)):
  a second switch beside `enabledProviders`, and a hosted page that cannot show "Email" and
  "Password" as the two different things they are.

### 4. Platform login is unchanged

Platform login reads the global Email method only (`auth.handler.ts:421-430`). A project
credential lives in another table and is structurally invisible to it, and the password provider
never reads the global one: the two never meet. Hashes v1.16.0 left in global methods are not
read by the new import path and are cleared by the cleanup migration of § 6.

### 5. Reset and forgot-password from a project app

This is the "Forgot password?" of § 3. It applies to an **existing member** of the project only,
and the response is the same whether or not the address is a member, so the form does not
enumerate them. Completing a reset proves the mailbox, so it **sets the global `isVerified`**
exactly as the magic link does (`auth.handler.ts:1172-1181`), and **writes the project
credential** (`source: project-reset`); it does not touch the global password. It invalidates
**that project's app sessions**: the user's `project_oauth_grants` across the project's apps
(`project-oauth-grants.schema.ts`, keyed by `project_app_id`; no bulk revoke exists yet: the
primitive is `revokeGrant` at `project-oauth-grants.service.ts:118`, called one grant at a time
at `project-oauth.handler.ts:1134,1166`). A **platform** reset or change writes only the global
password and revokes platform sessions
(`user-authentication-methods.service.ts:706-710,735,833-836`); it neither reads nor clears a
project credential. A later import never overwrites a `project-reset` or `project-change`
credential (§ 2).

### 6. No data migration, one cleanup migration

v1.16.0 wrote import-marked hashes into global Email methods
(`providerData.passwordSource: 'cdm-import'`). They are not moved to project credentials. The new
import path ignores them, and a re-import of the same document creates the project credentials.
Where an environment is wiped and re-imported (staging), nothing is left. Where it is not, an
unverified method would keep that global hash, usable for platform login inside the verification
window (`auth.handler.ts:460-467`). A **committed schema migration**, one statement, closes that:

```sql
UPDATE user_authentication_methods
SET provider_data = provider_data - 'hashedPassword' - 'passwordSource'
WHERE provider = 'email'
  AND is_verified = false
  AND provider_data ->> 'passwordSource' = 'cdm-import';
```

**`changePassword` and `resetPassword` keep removing the marker until this migration has run**
(`user-authentication-methods.service.ts:710,836`). Platform reset does not set `isVerified`, so a
user who resets while unverified would otherwise keep a leftover marker on a Grant-set hash that
the statement below then strips. The marker handling is deleted only in the same deployable unit
as the migration (§ Slicing).

It clears only a hash that is still import-marked on an unverified method. A verified method
keeps its value (Grant owns it by 0010 rule 4: verification was the handover), and so does any
hash with no marker (set in Grant). It is idempotent, since once cleared nothing matches, and it
ships in the same deployable unit as the import slice (§ Slicing, slices 2 and 3).

_Where the clean break changed the design:_ a copy of each hash to its source project
(`users.metadata.cdmImport.projectId`), an idempotent count-reporting script, a dual read in
sign-in and a pass over verified methods were all considered and dropped. Re-importing is the
migration.

**Residual copies.** The migration's updates leave dead tuples until vacuum, and the hash also
lived in `user_authentication_methods.provider_data`, including its GIN index (`user-authentication-methods.schema.ts:41`), and in backups. Neither is scrubbed
here.

### 7. Security notes

- **What a tenant admin can do.** CDM already lets a project administrator add any global user to
  the project by email (0010 Security notes 1). Now the same administrator can plant a hash for
  that person, which opens **only that tenant's apps** through the password provider. Compare with
  today: a global write that, with the verification window open, opened the **platform** account of
  a person the administrator has no relationship with. The new exposure is inside the tenant's own
  trust domain, where the administrator already controls membership and roles; the old one crossed
  it.
- **What does _not_ limit it on the token.** Grant does not enforce `email_verified` or a
  post-mint MFA check on a project-app token: those tokens skip the email-verification and MFA
  guards (`email-verification-rest-guard.ts:25-28`, `mfa-rest-guard.ts:23`) and carry no
  verification state. The real limits are the token's `aud` (the app's `client_id`) and `scope`,
  which confine it to the tenant's own apps, and MFA **at the sign-in ceremony** when the platform
  requires it (`computeRequiresMfaStepUp`, `auth.handler.ts:66-77`, steps up only when
  `minAalAtLogin` is `aal2`). A tenant app that wants more must ask for it itself.
- **Lockout residual.** The per-`(project, user)` lockout of § 3 lets a tenant, or anyone able to
  guess its members' addresses, lock the **project** password of those users out. It cannot
  touch platform login or another project, and the user can still use magic link or a reset.
  That is the accepted price of a throttle that guards only the tenant's own credential.
- **Pre-claim** of an address with no Grant identity yet remains (it was and is the same
  administrator creating the identity); the person recovers by a project reset or magic link.
- **Audit.** `project_user_credential_audit_logs` records create, replace, reset, change and
  delete with `source`, project and user, **never the hash**. Events: `project_user.password_set`
  (reason `import`, `reset` or `change`), counters only on the import completion event.
- **GDPR.** The data export lists, per project, that a credential exists and its `source` and
  dates, **never the hash** (`me.handler.ts:386-402` exports methods without `providerData` for the
  same reason). Erasure: a hard-deleted user cascades; a soft-deleted user's credentials are
  soft-deleted in the same transaction. Removing a member (`project-users.service.ts:408`)
  soft-deletes their credential **in the same transaction**, so re-adding them never revives an
  old password, and the data-retention job purges soft-deleted credentials on its next run
  (slice 1 **extends** `data-retention-cleanup.job.ts` to do so: today it hard-deletes only users
  whose accounts passed `accountDeletionRetentionDays` and purges no soft-deleted rows; decided, no
  retention period). Project removal cascades.
- **Timing and cost** as 0010 Security notes 2 and 6 (cost ceiling, constant-time compare), now
  per credential.

### 8. Reverse mirror

Per-project credentials make a later per-environment write-back of a changed password possible
without touching a global field; out of scope here.

## Slicing plan

In order. Slices 2 and 3 are **one deployable unit** (one PR, or a stack merged atomically);
the others land and are reviewed on their own:

1. **Schema and port.** `project_user_credentials` + audit table, migration, repository, service
   and port, member-removal and user-erasure hooks, export entry. No behaviour change.
2. **Import write path.** User provisioning writes the project credential after membership,
   rules and counters of § 2, the apply-time membership check, tests,
   OpenAPI and docs. **Deletes** the global write path and the `passwordSource` marker handling
   from `user-provision.cdm-entity.ts`, `changePassword` and `resetPassword` in the same deployable unit as slice 3 (the marker clearing in those two stays until the cleanup migration has run, § 6).
   _Reusable from #544:_ the pattern of resolving the rows up front in one batched lookup and
   deciding in memory (here one `IN` query on the credential table, inside the import
   transaction and RLS-visible, so none of #544's login-role read or confinement logic is
   needed), the REST `ProjectSyncJob.result` schema listing the password counters with
   descriptions, and its OpenAPI test. _Not reusable:_ confinement, the tombstone and
   `passwordsSkippedConflict`, `clearCdmPasswordMarkers`, the OAuth guard.
3. **Cleanup migration** (§ 6): the one statement clearing unverified `cdm-import` hashes from
   global Email methods. Its own migration file so it is reviewed and reverted separately, but
   **deployed with slice 2** as one unit.
4. **Project-app password sign-in** (0010 (b), re-pointed): the `password` value of
   `enabledProviders` through GraphQL, REST and the dashboard's provider field (replacing
   `allow_password_sign_in`, opt-in only), the sign-in route verifying the project credential
   only, the `(project, user)` lockout first, dummy compare, MFA at the ceremony, **and the web
   hosted sign-in UI**: the "Password" button with a key icon, the email and password form, the
   "Forgot password?" link, and i18n.
5. **Project-app reset and forgot password** (§ 5), with the bulk revoke of a user's grants in a
   project.

### Release

**Changeset: minor, with a BREAKING note** (Ale's call; strictly semver would say major). The CDM
contract is almost unchanged (`users[].password`, the four counters), but slice 2 changes
behaviour a client could notice, and the note must say so: an imported password no longer works
for platform login (and slice 3 clears the ones v1.16.0 left), and a password for a user who is
not a project member after the import is rejected. `grant-api` and `@grantjs/schema` are bumped; slices 1, 4 and 5 are minor
additions (new table, new sign-in and reset routes).

### Follow-ups (out of scope for the slices above)

- **Username as an alternative identifier** for the password provider, unique per project and
  stored with the project credential (a nullable `username` column with a partial unique index on
  `(project_id, username)`). Identities stay email-keyed globally; the legacy source signs in by
  email, which is why this waits.
- **Self-service change of a project password.** A signed-in project-app user changes their
  project credential (`source: project-change`), with the same rules as a reset: the
  `(project, user)` lockout of slice 4, MFA at the ceremony when the platform requires it, and
  revocation of the user's project grants. `project-change` is in the `source` enum from slice 1 but **nothing writes it
  until this lands**, so until then an import only ever meets `cdm-import` and `project-reset`.
- Per-environment write-back of a changed password (§ 8).

## Consequences

- Imports stop touching global credentials and `passwordsSkippedExisting` drops from "almost
  everyone" to "people who reset it themselves".
- Two environments of one source system each keep their own hash for the same person; nothing
  conflicts, nothing is lost, nobody needs a reset.
- A person who verified, then rotated only the legacy password, is **re-synchronized** until they
  reset in the project app; 0010's accepted cost disappears.
- Password sign-in is an explicit, opt-in provider with its own button; no app gains it by having
  an empty provider list, and the global Grant password is never accepted at a tenant surface.
- An imported password no longer opens the **platform**: it could only ever do so inside the
  verification window, which 0010 already called intentional but unwanted for project apps.
- 0010's (a) rules 3, 4, 5, 6 and 8 and Security notes 1 describe v1.16.0 and are superseded by
  this record; each carries a pointer here. (b) is re-pointed, not dropped.
- `grant-etl` needs no counter change: #544's `passwordsSkippedConflict` is not shipped. Its
  documents may need an assignment, or an existing membership, for every user that carries a password.

## Open questions

Ale's questions were answered in review and are folded into § 3 to § 7 and the slicing plan,
and the throttle's scope is decided in § 3 (per `(project, user)`, guarding only the project
credential). Still open, for **grant-agent**:

1. **Which token carries `email_verified`**, if any, and how a project app reads it (there is no
   such claim in `apps/api/src`, and project-app tokens carry no verification state). Nothing in
   this record relies on one.
2. **Apply-time membership check** (§ 2): which handler writes the credential after assignment
   (a new handler ordered after `user-assignment.cdm-entity.ts`, or a step in it), and does any
   ETL send password rows for users that are not and will not be members?
3. **Lockout store** for the `(project, user)` throttle: the cache used for OAuth state, or a
   table. Its scope is decided; only the store is open. It gates slice 4.
4. **Bulk revoke of a user's project grants** (§ 5): a repository method on `project_oauth_grants`
   joined through `project_apps`, or a new column on the grant?

## References

- Import today: `apps/api/src/lib/cdm/entities/user-provision.cdm-entity.ts:92-277`
- Platform login: `apps/api/src/handlers/auth.handler.ts:66-77,421-430,460-467`
- Project sign-in: `apps/api/src/handlers/project-oauth.handler.ts:485-520,724-760`
- Marker today: `apps/api/src/services/user-authentication-methods.service.ts:706-710,833-836`
- Project tables and conventions: `packages/@grantjs/database/src/schemas/project-apps.schema.ts`,
  `project-oauth-connections.schema.ts`, `project-user-api-keys.schema.ts`, `project-users.schema.ts`,
  `project-oauth-grants.schema.ts`
- Rejected alternative: [#544](https://github.com/grant-js/grant/pull/544)
