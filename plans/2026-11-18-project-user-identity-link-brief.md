# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Stack: [2026-11-18-project-user-identity-link-stack.md](./2026-11-18-project-user-identity-link-stack.md).

Grounded on `main` at `94faabf6` (package version **v1.29.1**, after #733 "claim an unverified imported identity on a mailbox proof"). Open-source language only: operators, a CDM importer and a legacy IAM mirror. Do not name customer tenants or deployments.

## Metadata

- **Slug**: `project-user-identity-link`
- **Date**: 2026-11-18
- **Author** (human / PM agent): PM agent, from an investigation with Alejandro
- **Status**: approved

## Problem

Identities are global (ADR 0011: one email is one identity and one `user_authentication_methods` row, shared by every organization and project). The same person in several projects is meant to be **one** `users` row with several `project_users` memberships.

Operators still end up with **two Grant users for one person**: a project user with no email (for example one a CDM import created with `findBy: key`, because the source address was invalid or shared inside one environment, or keyed before the importer sent addresses), and a user elsewhere in the organization that already holds the address. `setProjectUserEmail` then refuses with `ConflictError('This authentication method is already connected to another account')` (`user-authentication-methods.service.ts:882-889`; index `user_auth_methods_provider_provider_id_unique`, migration `0012`). The operator cannot see the holder (it is not in the project) and has no way forward.

Relaxing the uniqueness is not an option (every email→user resolution, login, OAuth auto-link, invitations, the #733 claim and CDM `findBy: email` assume one user per address). The fix is to let the operator **link** the project user to the identity that holds the address.

## Objective

An operator who is refused on set-email because another user of the same organization holds the address can link the project user to that identity: the existing identity (Y) takes over the duplicate's (X) membership of this project, with everything the project holds for X, and X is retired. The next CDM import resolves the same key to Y, and a legacy mirror re-pairs instead of offboarding.

## Acceptance criteria

- [ ] **Mutation `linkProjectUserIdentity`** (GraphQL `linkProjectUserIdentity(input: LinkProjectUserIdentityInput!): User!`, input `userId` (X), `email`, `scope`; REST `POST /api/users/:id/link-identity`). `OrganizationProject` scope only; anything else is `ValidationError`. Returns Y in project scope.
- [ ] **Preconditions, all checked before any write; a refusal writes nothing and never echoes an address or another user's id:**
  1. X is a live member of the project (`NotFoundError` otherwise, as set-email).
  2. The normalized address is held by a **live** Email method of a **live** user Y, and Y ≠ X. Not held → `BadRequestError` ("set the email instead"); held by X → no-op.
  3. Y is a member of the project's organization (`organization_users`). Otherwise the same `ConflictError` set-email gives today: no new disclosure.
  4. Y is **not** already a member of the project (merging two members is a non-goal).
  5. X is an identity shell: no authentication method, no platform credential, no active MFA factor, no live session. Anything else is refused ("this user can sign in; remove the user instead"). This keeps the operation from ever deleting a way someone signs in.
- [ ] **One transaction, project-scoped moves only.** X's live `project_users` row for the project is re-pointed to Y (same row id: `metadata` with `cdmImport` and `cdmSource`, `display_name`, picture, search document), and so are X's project-owned pivots: `project_user_groups`, `project_user_permissions`, `project_user_api_keys`, `project_user_credentials` (the imported or operator-set password for this project), and `user_roles` / `user_groups` / `user_permissions` / `user_tags` rows whose target belongs to this project. Project OAuth grants, password resets and lockout rows of X in the project are revoked or deleted, not moved. Rows of X in other projects are untouched. Y's identity (auth methods, credential, MFA, sessions, other memberships, global name and metadata) is untouched.
- [ ] **Retire X.** Strip X's global `metadata.cdmImport` marker when it names this project. Then, if X has no live project membership left, soft-delete X. **Required:** `users.repository.ts:117-153` `findUserIdByCdmImport` ranks the global marker (no membership check) before the membership row's, so a live X with the marker would make the next import resolve the key to X and add X back.
- [ ] **Events.** No `project.user_removed`, `project.user_added` or `user.deleted` is published for the link (a legacy mirror reads `project.user_removed` / `user.deleted` by a non-system actor with an import key as an **offboarding** of that legacy user). One new event, **`project.user_identity_linked`**, `webhookOnly('membership')`, explicit project scope via `ProjectUserService.resolveProjectScope`, `subjectUserId` = Y, `data.after` = `{ projectId, fromUserId, toUserId }`: ids only, never the address, never the import key. Sentinel test as for `project.user_email_changed`.
- [ ] **Audit.** One project-user audit row naming `operation: 'link-identity'`, both user ids and the actor; per-pivot audit rows where the pivot's write path already writes one. No address in `metadata`.
- [ ] **Caches.** Permission and scope caches of X and Y for the project are invalidated (as `deleteUser` and `addProjectUser` do).
- [ ] **CDM next import (integration, Postgres).** After a link: a `findBy: key` import with X's key resolves to Y (`reuse-keyed`), adds no membership for X and creates no user; a `findBy: email` import with the address resolves to Y and rewrites the membership marker to the address, as it does for any reused identity; `replace` mode removes nothing; no deletion tombstone is written (operator deletion is `not-self-deletion`).
- [ ] **Permission `ResourceAction.LinkIdentity` on `ResourceSlug.ProjectUser`**, declared in `@grantjs/constants`, granted through `ProjectUserOwner` (Organization Owner, Personal / Organization Account Owner) and `ProjectUserAdmin` (Organization Admin), like `SetEmail`. Not Dev, Viewer or Common. Separate from `SetEmail`: linking adds an existing person to a project, which no operator API does today (`AddProjectUserInput` is not exposed).
- [ ] **Rate limit.** Counts against the set-email bucket (`tenant:<tenant>:<id>:set-email:<actor>`): the precondition answers reveal the same fact the set-email conflict does.
- [ ] **Web.** When `setProjectUserEmail` fails with `CONFLICT` and the caller holds `ProjectUser:LinkIdentity`, the set-email dialog offers a confirm step: "This address belongs to an existing user of your organization who isn't in this project. Link this project user to that identity? Roles, groups, permissions, API keys and the project password move to it; this project user is removed." Without the permission, the dialog shows today's error with a clearer message. i18n `en` + `de`.
- [ ] **Docs + changeset.** `docs/architecture/rbac.md`, `docs/core-concepts/resources.md`, `docs/core-concepts/events-webhooks-notifications.md` (catalog + "linking is not a removal"), `docs/core-concepts/cdm-import-export.md` (what a link does to keys and markers). Changesets: **minor** `@grantjs/schema`; **patch** `grant-api`, `grant-web` (`@grantjs/constants`, `@grantjs/core` and `@grantjs/database` are in the `.changeset/config.json` ignore list and take none). `pnpm release:check`.

## Named contracts

| Kind             | Name                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Permission       | `ResourceAction.LinkIdentity` on `ResourceSlug.ProjectUser` (`ProjectUser:LinkIdentity`) |
| GraphQL mutation | `linkProjectUserIdentity(input: LinkProjectUserIdentityInput!): User!`                   |
| REST             | `POST /api/users/:id/link-identity` (body `scope`, `email`)                              |
| Event            | `project.user_identity_linked`, `data.after` `{ projectId, fromUserId, toUserId }`       |
| Audit operation  | `link-identity`                                                                          |

## No database migration

Every table involved exists; the link re-points `user_id` on existing rows. If a slice finds a unique index that blocks a re-point (for example a stale soft-deleted row of Y), it handles it in the service, not with SQL. Stop and amend this brief before writing a migration.

## Related systems (outside this repository)

- **Legacy mirror** (importer repository): handle `project.user_identity_linked` as a re-pairing (`fromUserId` → `toUserId`), not an offboarding. Until it does, ignoring the event is safe: the next state read pairs Y with the key through the moved membership marker and `cdmSource.legacy.id`. Separate PR, after this story's API slice.
- **Importer prevention:** keyed duplicates keep being created for sources whose address is invalid or shared within one environment. A `grantUserId` hint cannot repair an existing duplicate (the key already resolves to X → "names another user than the one already imported under this key"); it only prevents new ones. Separate story.

## Gate 1 decisions (Alejandro, 2026-11-18)

1. **Notify Y: yes.** A notice (no link) that they were added to the project, like the previous-address notice of set-email: sent after commit, a failed send is logged and never fails the mutation.
2. **Soft-delete X: yes**, when no live project membership is left, so the duplicate stops showing in organization lists. Slice 3 confirms organization lists filter deleted users.
3. **AccountProject scope: out** (no organization to confine Y to). Revisit if asked.

## Non-goals

- Changing identity uniqueness (per-project or per-organization email identities)
- Merging two users who are both members of the project, or merging anything outside this project
- Moving Y's or X's sign-in methods, platform credential, MFA or sessions
- Linking to a holder outside the project's organization
- A bulk or automatic de-duplication job (a read-only finder can be a later story)
- Importer or mirror changes (see Related systems)
- Published `@grantjs/{client,server,cli}` contract changes beyond additive schema types

## Risk flags

- [x] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [x] GDPR export / deletion / PII
- [ ] None of the above

**Why:** a new way to put an existing identity into a project (no operator API does that today), moves of project credentials and API keys between users, a soft-delete, and an event that a downstream mirror must not read as an offboarding. Wrong precondition → an operator pulls in someone outside the organization, or retires a user who can sign in. Wrong event → the mirror deactivates a person who still has access. Wrong marker handling → the next import re-creates the duplicate.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior Frontend, Senior QA, Senior Security, Verifier. Architect inactive: no new table, port package or tenancy rule.

## Human gate

- [x] Gate 1: Story brief approved — Alejandro 2026-11-18, with the recommended decisions above. Gates 1–2 approved together.
- [ ] Gate 4: Story → `main` — not opened; agents do not merge.
