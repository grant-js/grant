# 0015 — Organization ownership is transferable: one owner, always; transfer and delete are owner-only

- **Status**: Proposed
- **Date**: 2026-11-26
- **Context**: story `organization-settings` (plan `plans/2026-11-24-organization-settings-brief.md`); the slice that adds `transferOrganizationOwnership` and the slice that carries this record
- **Related**: [Organization ownership](/core-concepts/organization-ownership), [RBAC](/architecture/rbac), [Members & Invitations](/core-concepts/organization-invitations), [Events, Webhooks & Notifications](/core-concepts/events-webhooks-notifications)
- **Scope**: the Organization Owner role of an organization (tenant `organization`). Account ownership (Personal Account Owner, Organization Account Owner), project roles and the standard groups other than the Organization Owner group are unchanged.
- **Compatibility**: additive. One new action (`Organization:TransferOwnership`), one mutation, one route, one event type, one error `reason` per refusal, and no migration. Existing deployments get the permission through `seedAll`. Minor release.

## Context

An organization's owner is the member who holds the seeded Organization Owner role. The creator is given it when the organization is created (`apps/api/src/handlers/organizations.handler.ts:85-96`), and nothing moves it afterwards:

- `canAssignRole` lets a member assign only a role **strictly below** their own, and it returns `false` for any role without a level (`packages/@grantjs/constants/src/permissions/roles.ts:68`). Nobody can assign Owner, because nobody holds a role above it.
- A member cannot change or remove their own membership (`apps/api/src/services/organization-members.service.ts:97`), so an owner cannot step down.
- Member role changes and removals also go through `canAssignRole` against the target's current role (`organization-members.service.ts:120,219`), so the owner's own membership cannot be edited by anyone.

In practice every organization has exactly one owner, forever. People leave companies and organizations change hands, and the only ways out today are deleting the organization or editing the database. Two other facts matter. `Organization:Delete` is held by the Owner group (`packages/@grantjs/constants/src/permissions/groups.ts:342`), and the dashboard exposes it as a row action next to Edit. And the system relies on the owner count being exactly one: the creator path throws if the Owner role is not seeded, and the notification audience `owners` and the role-level rules assume an Owner exists.

## Decision

**Ownership is transferable, in one way only. An organization always has exactly one owner. Transferring ownership and deleting the organization are owner-only.**

### 1. One transfer operation; no other path touches Owner

`transferOrganizationOwnership` (`apps/api/src/services/organization-members.service.ts`, `transferOwnership`) is the only code that assigns or removes the Owner role of an existing organization. `canAssignRole` is **not** changed: it stays strict, so member role changes, invitations and every other path still cannot give or take Owner. The owner count therefore changes only inside the transfer.

### 2. Exactly one owner, at every point

In the caller's transaction:

1. lock the two `organization_users` rows (`SELECT … FOR UPDATE`, in user-id order, `OrganizationUserRepository.lockMembersForUpdate`), then decide on what the lock returns, so two transfers started at once serialize and the second sees the first one's result;
2. give the **new owner** the Owner role;
3. only then give the **previous owner** the role they chose (Admin, Dev or Viewer: strictly below Owner, one of this organization's roles) **or** soft-delete their membership when they choose to leave.

Step 2 runs before step 3, so an interruption between them leaves two owners, never none; a failure in step 2 leaves the previous owner untouched. A caller must choose exactly one of a role and leaving: an owner cannot stay as a second owner, and cannot leave with a role.

### 3. Who may transfer, and to whom

- **Caller:** a signed-in user, never an API key or app token, who holds the Owner role in that organization at the moment of the call. This is a service check **in addition to** the permission `Organization:TransferOwnership`, which only the Organization Owner group holds (`packages/@grantjs/constants/src/permissions/groups.ts:337-345`, `permissions.ts:588`). The permission is extensible like any other, so a custom group could hold it; the service check is what makes the rule independent of that. An organization-scoped key can hold neither.
- **New owner:** a current member (a pending invitation is not membership; `404`), not the caller (`400`), not deactivated (`409`), with a verified authentication method (`409`). The verified check reads the same source as the session's `isVerified` claim, `user_authentication_methods.is_verified`, so ownership never lands on an address nobody proved.
- Each refusal carries a stable `reason` (`OWNERSHIP_TRANSFER_*`) and a translation key.
- The operation is a sensitive action: it carries the email and MFA guards of `deleteOrganization` (`apps/api/src/graphql/resolvers/mutations.ts:291,301`, `apps/api/src/rest/routes/organizations.routes.ts:233,264`), with no exception for a personal context.

### 4. Delete is owner-only

Deleting the organization is as irreversible as handing it over, so it follows the same rule: **only the owner**. This records a rule the code already follows rather than changing it: the Organization Admin group maps no Organization permission (`packages/@grantjs/constants/src/permissions/groups.ts:348`, `packages/@grantjs/constants/src/permissions/permissions.ts:611`, unchanged since the group was introduced), so only the Owner group holds `update`, `delete` and `upload-picture` on the organization, and now `transfer-ownership`. `docs/architecture/rbac.md` used to list `update` and `delete` for Admin; the settings-view slice corrected it. No migration is needed. Whether Admins should get the MFA policy is a separate, open question; nothing is granted here.

### 5. One event, both people told

A transfer publishes `organization.ownership_transferred` and one audit entry on the organization, in the same transaction (outbox), so webhooks and notifications fire only on commit. It is a `membership` event with the audience `actor` and `subject` and `excludeActor: false`: the previous owner (the actor) and the new owner (the subject) are both told. It **replaces** the per-side `organization.member_role_changed` and `organization.member_removed`: one event, one notification each, and one thing for a mirror to read. `data.before` and `data.after` hold user ids and role ids only.

## Consequences

- **Every organization keeps exactly one owner.** Admins manage members, projects, roles and permissions, but not the organization itself; the ownership role stays single, so who is accountable is never ambiguous.
- **No migration for the transfer.** The permission is new, and the seed links it to the Owner group on existing databases. Serverless deployments must run the migrate/seed step with `DB_BOOTSTRAP_ON_BOOT` as before (ADR 0001). Until the seed runs, nobody holds `Organization:TransferOwnership` and the mutation answers `403`.
- **An owner who leaves, leaves.** With `leaveOrganization`, their membership is soft-deleted in the same transaction; their cached authorization results are dropped after commit.
- **Not decided here:** deleting a **user** who still owns organizations is not guarded today. A follow-up should refuse it, or force a transfer first.
- **Webhooks:** like the other `organization.*` events, the new type is subscribable through the catalog and reaches a project's subscription only when the request ran in that project's scope or the event names a linked entity (ADR 0012); an organization-scoped transfer links no project.
