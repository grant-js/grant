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
platform session, with `email_verified: false`. Its own consequences say the imported credential
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
| `source`                                                 | `varchar(32)`: `cdm-import`, `project-reset`, `project-change`                                                                                |
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
ignores any import-marked hash already in it. A document with a password for a user it does not also assign to the project
is a **validation error** (like 0010 rule 2): the credential is written after the project
membership exists in the same transaction, and a credential without a member is inert.

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
only, with `email_verified: false`, and the tenant already decides who is a member and what roles
they hold there. Global MFA step-up still applies. The platform account, the user's other
projects and their GitHub or Google login are untouched. "Verification is the handover" (0010 rule 4) is replaced by **a project-side reset or change is the handover**: verifying the mailbox is a
global fact that says nothing about whether the legacy system still owns this project's password.

### 3. Project-app sign-in (0010 (b), re-pointed)

Email and password at a project app verifies against that project's credential for the signing-in
user, and results in the app authorization code the magic-link callback already issues
(`project-oauth.handler.ts:724-760`), never a platform session. Everything 0010 (b) requires
stays: the per-app switch (`allow_password_sign_in`, beside `allow_sign_up`,
`project-apps.schema.ts:31-32`), generic failures and a dummy compare so timing does not reveal
whether a credential exists, the reuse of the auth-route limiter
(`rate-limit.middleware.ts:98-104`, per client address) **plus per-identity throttling as a
prerequisite** (`AUTH_MAX_FAILED_LOGIN_ATTEMPTS` and `AUTH_LOCKOUT_DURATION_MINUTES` are defined at
`env.config.ts:149,152` and nothing reads them), and MFA step-up from the global enrolment
(`auth.handler.ts:66-77`). Sign-in **requires an existing membership**: a password never creates
one (sign-up stays on magic link and OAuth, `project-oauth.handler.ts:758-760`).

**`email_verified`.** No such claim exists in `apps/api/src` today; 0010 (b) assumed one. A
password sign-in always carries `email_verified: false`, whatever the global method's
`isVerified`, because that flag records a mailbox proof by someone, not that this sign-in is the
mailbox's owner. Only a magic link or a provider-verified address in the same sign-in says
`true`. (A magic link sets the global flag as a side effect,
`auth.handler.ts:1172-1181`; unchanged.)

**Precedence when the user also has a global Grant-set password: recommended, the project
credential decides alone when it exists; the global password is the fallback when the project
has none.** Inside one project the answer is then deterministic and explainable ("the project
password, else your Grant password"), a planted or imported project credential cannot be bypassed
by, nor shadow, a password the person set at Grant for a project that has no credential, and each
attempt verifies one hash (plus the dummy compare).

_Rejected:_ both accepted at once (two valid passwords, double the guessing surface per attempt);
a per-app setting (another knob, and a mismatch between apps of one project); project credential
only (cleanest boundary, but strands a person with a Grant password and no project credential
until they reset, and is the likelier choice if Ale prefers that no tenant surface ever sees the
global password, see Open questions).

### 4. Platform login is unchanged

Platform login reads the global Email method only (`auth.handler.ts:421-430`). A project
credential lives in another table and is structurally invisible to it. Hashes v1.16.0 left in
global methods are not read by the new import path; whether they are also cleared is open
question 2.

### 5. Reset and forgot-password from a project app

Requesting a reset from a project app proves the mailbox as the magic link does and **writes the
project credential** (`source: project-reset`); it does not touch the global method. It
invalidates **that project's app sessions**: the user's `project_oauth_grants` across the
project's apps (`project-oauth-grants.schema.ts`, keyed by `project_app_id`; no bulk revoke exists
yet, `project-oauth.handler.ts:1096,1134,1166` revoke one). A **platform** reset or change writes
only the global password and revokes platform sessions
(`user-authentication-methods.service.ts:706-710,735,833-836`); it neither reads nor clears a
project credential. A later import never overwrites a `project-reset` or `project-change`
credential (§ 2).

### 6. No data migration: existing deployments re-provision

v1.16.0 wrote import-marked hashes into global Email methods
(`providerData.passwordSource: 'cdm-import'`). They are not moved. The new import path ignores
them, and a re-import of the same document creates the project credentials. Where an environment
is wiped and re-imported (staging), nothing is left. Where it is not, an unverified method keeps
that global hash, usable for platform login inside the verification window
(`auth.handler.ts:460-467`), until it is cleared or re-imported over by the person. Whether to
ship a one-statement cleanup migration for that case is open question 2.

_Where the clean break changed the design:_ a copy of each hash to its source project
(`users.metadata.cdmImport.projectId`), an idempotent count-reporting script, a dual read in
sign-in and a pass over verified methods were all considered and dropped. Re-importing is the
migration.

**Residual copies.** The hash also lived in `user_authentication_methods.provider_data`, including
its GIN index (`user-authentication-methods.schema.ts:41`), and in backups. Neither is scrubbed
here.

### 7. Security notes

- **What a tenant admin can do.** CDM already lets a project administrator add any global user to
  the project by email (0010 Security notes 1). Now the same administrator can plant a hash for
  that person, which opens **only that tenant's apps**, with `email_verified: false` and global
  MFA step-up. Compare with today: a global write that, with the verification window open, opened
  the **platform** account of a person the administrator has no relationship with. The new
  exposure is inside the tenant's own trust domain, where the administrator already controls
  membership and roles; the old one crossed it.
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
  (`data-retention-cleanup.job.ts`). Project removal cascades.
- **Timing and cost** as 0010 Security notes 2 and 6 (cost ceiling, constant-time compare), now
  per credential.

### 8. Reverse mirror

Per-project credentials make a later per-environment write-back of a changed password possible
without touching a global field; out of scope here.

## Slicing plan

In order, each landing and reviewed on its own:

1. **Schema and port.** `project_user_credentials` + audit table, migration, repository, service
   and port, member-removal and user-erasure hooks, export entry. No behaviour change.
2. **Import write path.** User provisioning writes the project credential after membership,
   rules and counters of § 2, validation error for a password without an assignment, tests,
   OpenAPI and docs. **Deletes** the global write path and the `passwordSource` marker handling
   from `user-provision.cdm-entity.ts`, `changePassword` and `resetPassword` in the same slice.
   _Reusable from #544:_ the pattern of resolving the rows up front in one batched lookup and
   deciding in memory (here one `IN` query on the credential table, inside the import
   transaction and RLS-visible, so none of #544's login-role read or confinement logic is
   needed), the REST `ProjectSyncJob.result` schema listing the password counters with
   descriptions, and its OpenAPI test. _Not reusable:_ confinement, the tombstone and
   `passwordsSkippedConflict`, `clearCdmPasswordMarkers`, the OAuth guard.
3. **Project-app password sign-in**, 0010 (b): the switch, the sign-in route, per-identity
   throttling first, the `email_verified` claim, MFA step-up, precedence of § 3.
4. **Project-app reset and forgot password** (§ 5), with the bulk revoke of a user's grants in a
   project.
5. _(optional, open question 2)_ a cleanup migration for v1.16.0 global hashes.

**Changeset plan, a call for Ale.** The CDM contract is almost unchanged (`users[].password`,
the four counters), but slice 2 changes behaviour a client could notice: an imported password no
longer works for platform login, and a password on a user with no assignment is rejected.
Strictly that is **major**; with no external users, **minor** for `grant-api` and
`@grantjs/schema` is proposed. Slices 1, 3 and 4 are minor (new table, new sign-in route).

## Consequences

- Imports stop touching global credentials and `passwordsSkippedExisting` drops from "almost
  everyone" to "people who reset it themselves".
- Two environments of one source system each keep their own hash for the same person; nothing
  conflicts, nothing is lost, nobody needs a reset.
- A person who verified, then rotated only the legacy password, is **re-synchronized** until they
  reset in the project app; 0010's accepted cost disappears.
- An imported password no longer opens the **platform**: it could only ever do so inside the
  verification window, which 0010 already called intentional but unwanted for project apps.
- 0010's (a) rules 3, 4, 5, 6 and 8 and Security notes 1 describe v1.16.0 and are superseded by
  this record; each carries a pointer here. (b) is re-pointed, not dropped.
- `grant-etl` needs no counter change: #544's `passwordsSkippedConflict` is not shipped. Its
  documents may need an assignment for every user that carries a password (open question 6).

## Open questions

For **Ale**:

1. **Global fallback in project apps.** Recommended: project credential alone when present, global
   Grant password only when the project has none (§ 3). Alternative: never accept the global
   password at a tenant surface. Which?
2. **Cleanup of v1.16.0 global hashes** (clean break, § 6). Staging is re-imported, so nothing is
   needed there. Ship a one-statement migration anyway that removes `hashedPassword` and
   `passwordSource` from unverified Email methods marked `cdm-import`, so no environment keeps an
   import-written password usable for platform login? Recommended yes: it is trivial and closes
   the only remaining exposure. Skip it if nobody but staging ever ran v1.16.0.
3. **Purge timing** of soft-deleted credentials: at the next data-retention run (proposed), or a
   retention period like account deletion?
4. **Does a project reset set the global `isVerified`**, as the magic link does
   (`auth.handler.ts:1172-1181`), or leave it alone?

For **grant-agent**:

5. **Which token carries `email_verified`**, and how does a project app read it today (there is
   no such claim in `apps/api/src`)? 0010 (b) assumed one.
6. **Password without an assignment** as a validation error (§ 2): can `validateSyncInput` check it
   across the `users` and `userAssignments` sections, and does any ETL send such rows?
7. **Per-identity throttling**: which store (the cache used for OAuth state, or a table), and is it
   shared with platform login or separate? It gates slice 4.
8. **Bulk revoke of a user's project grants** (§ 5): a repository method on `project_oauth_grants`
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
