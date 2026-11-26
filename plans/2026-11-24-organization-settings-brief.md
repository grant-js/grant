# Organization settings view and ownership transfer — brief

Status: **accepted** 2026-11-26 (gate 1), decisions below taken as proposed. Drafted 2026-11-24.

## Problem

- The only organization setting, `requireMfaForSensitiveActions`, sits in the edit dialog
  next to the name and picture (`apps/web/components/features/organizations/organization-edit-dialog.tsx`).
- Deleting lives in a row action (`organization-delete-dialog.tsx`); its typed confirmation is
  the organization **id**, not its name.
- Ownership is the seeded "Organization Owner" role, given to the creator in
  `apps/api/src/handlers/organizations.handler.ts` (`createOrganization`). Nothing can move it:
  `canAssignRole` (`packages/@grantjs/constants/src/permissions/roles.ts`) only lets a member
  assign a role strictly below their own, and `validateMemberManagementPermission` refuses
  changes to your own membership. In practice each organization has exactly one owner, forever.

## ADRs

`decisions/` has no ADR on organization roles or ownership (0001–0014 checked 2026-11-24).
This work adds **ADR 0016 (Proposed): organization ownership is transferable; an organization
always has exactly one owner; deleting and transferring are owner-only.**

## Data model

No new table and no schema change. Membership already carries the role:
`organization_users (organization_id, user_id, role_id)`. A transfer, in one transaction:

1. Lock the organization's membership rows (`SELECT … FOR UPDATE` on the two
   `organization_users` rows) so two concurrent transfers serialize.
2. Re-check inside the lock: the caller still holds Owner; the target is an active member.
3. Set the target's `role_id` to the organization's Owner role.
4. Set the caller's `role_id` to the chosen role (Admin, Dev or Viewer), **or** soft-delete the
   caller's membership when they choose to leave.
5. Audit entry + `organization.ownership_transferred` event, both in the same transaction
   (outbox), so webhooks and notifications fire only on commit.

Invariant: step 3 runs before step 4 in the same transaction, and no other path can assign or
remove Owner (`canAssignRole` stays strict), so an organization cannot end up ownerless.

Target eligibility (refused with a distinct error each):

| Case                                                           | Error                    | HTTP |
| -------------------------------------------------------------- | ------------------------ | ---- |
| Caller is not the current owner (or is an API key / app token) | `AuthorizationError`     | 403  |
| Target is the caller                                           | `BadRequestError`        | 400  |
| Target is not a member (incl. pending invitation)              | `NotFoundError` (member) | 404  |
| Target is deactivated (user or membership soft-deleted)        | `ConflictError`          | 409  |
| Target has no verified email authentication method             | `ConflictError`          | 409  |
| Chosen role for the previous owner is Owner or not an org role | `BadRequestError`        | 400  |

Each carries a stable `code` (e.g. `OWNERSHIP_TRANSFER_TARGET_UNVERIFIED`) and an i18n message key.

## Permission matrix

| Section / action                 | Owner | Admin | Dev       | Viewer    | API enforcement                                                                                     |
| -------------------------------- | ----- | ----- | --------- | --------- | --------------------------------------------------------------------------------------------------- |
| Open Settings view               | ✓     | ✓     | read-only | read-only | Organization `query` (unchanged)                                                                    |
| General: name, picture (dialog)  | ✓     | –     | –         | –         | `update`, `upload-picture`, Owner group only (unchanged)                                            |
| Security: MFA for sensitive acts | ✓     | –     | –         | –         | `update`, Owner group only (unchanged)                                                              |
| Ownership: transfer              | ✓     | –     | –         | –         | new `Organization:transfer-ownership`, Owner group only, **plus** service checks caller holds Owner |
| Danger zone: delete              | ✓     | –     | –         | –         | `delete`, Owner group only (unchanged)                                                              |

Correction (2026-11-26): the first draft of this table gave Admin `update` and `delete`, taken
from `docs/architecture/rbac.md`. The code never did: the Organization Admin group maps no
Organization permission (`packages/@grantjs/constants/src/permissions/groups.ts`,
`permissions.ts`, since the group was introduced). Owner-only delete therefore needs no
constants change and no migration; (a) corrects `rbac.md` instead.

Sensitive actions (transfer, delete, MFA toggle) keep the existing `requireEmailThenMfa*`
guards: MFA is required when the organization enforces it or the caller has a factor enrolled.

## API shape

GraphQL (`packages/@grantjs/schema/src/schema/organizations/…`):

```graphql
input TransferOrganizationOwnershipInput {
  scope: Scope! # tenant organization, id = organization id
  newOwnerId: ID!
  previousOwnerRoleId: ID # one of the org's roles below Owner
  leaveOrganization: Boolean # exactly one of previousOwnerRoleId / leaveOrganization=true
}

type OrganizationOwnershipTransfer {
  organization: Organization!
  newOwner: OrganizationMember!
  previousOwner: OrganizationMember # null when they left
}

extend type Mutation {
  transferOrganizationOwnership(
    input: TransferOrganizationOwnershipInput!
  ): OrganizationOwnershipTransfer!
}
```

REST (+ OpenAPI): `POST /api/organizations/:id/ownership-transfer`, body
`{ newOwnerId, previousOwnerRoleId?, leaveOrganization? }`, response the same shape.

Layers: resolver/route → `OrganizationHandler.transferOwnership` (transaction) →
`IOrganizationMemberService.transferOwnership` (rules, audit, event) → repositories.

Event: `organization.ownership_transferred`, category `membership`, notification class,
audience `['actor', 'subject']` with `excludeActor: false`, so both the previous and the new
owner are notified (in-app + email template, en/de). `data.before/after` carries user ids and
role ids only.

## UI

- New route `/dashboard/organizations/[organizationId]/settings`, "Settings" item in
  `components/navigation/organization-sidebar.tsx`.
- Sections: **Security** (MFA switch, same mutation), **Ownership** (member picker limited to
  eligible members, role-for-me select or "leave", confirm dialog typing the new owner's email
  or the organization name), **Danger zone** (red-bordered card, delete with typed organization
  **name**).
- Edit dialog keeps name and picture only. Row actions keep Edit, replace Delete with
  "Settings" (link).
- No header or layout changes (the header white-labeling work runs in parallel).

## PR split (both against `main`)

- **(a) settings view** — route, sidebar item, Security + Danger zone sections, edit dialog
  trimmed, delete confirmation by name, the `rbac.md` correction,
  docs, i18n, changeset. Ships alone.
- **(b) ownership transfer** — permission, schema, service/handler/resolver/REST/OpenAPI,
  event catalog + notification templates, Ownership section, ADR 0016, unit + e2e tests, docs,
  i18n, changeset. Based on (a).

## Decisions (accepted as proposed, 2026-11-26)

1. Delete stays owner-only, as the code already has it; no migration (see the correction above).
2. Security (the MFA policy) stays owner-only: Admins get no new permission (maintainer decision, 2026-11-26).
3. `organization.ownership_transferred` is a `membership` event, like role changes.
4. A transfer emits only `organization.ownership_transferred`, not `organization.member_role_changed`
   per side: one event, documented, no double notifications.
5. Deleting a user who still owns organizations is not guarded today; out of scope, a follow-up.
