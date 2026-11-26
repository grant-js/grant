---
title: Organization Ownership
description: Every organization has exactly one owner, and the owner can hand the role to another member
---

# Organization Ownership

Every organization has **exactly one owner**: the member who holds the Organization Owner role. The creator is the first owner. Nothing else can assign or remove Owner (an Admin cannot promote anyone to it, and an owner cannot demote themselves with a role change), so ownership moves in one way only: an **ownership transfer** by the current owner.

Transferring ownership and deleting the organization are owner-only. See [ADR 0016](https://github.com/grant-js/grant/blob/main/decisions/0016-transferable-organization-ownership.md) for why.

## Ownership transfer

In one transaction the new owner is given the Owner role first, then the previous owner is given the role they chose or leaves the organization. The organization is never without an owner, and two transfers started at once serialize: the memberships involved are locked `FOR UPDATE`, and the second transfer finds the first one's result.

### Rules

| Rule                                                                                                                                                               | Refused with         | HTTP | `reason`                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ---- | ---------------------------------------------- |
| The caller is a signed-in user (not an API key or app token)                                                                                                       | `AuthorizationError` | 403  | `OWNERSHIP_TRANSFER_SESSION_REQUIRED`          |
| The caller holds `Organization:TransferOwnership` (Owner group only) **and** holds the Owner role in this organization now                                         | `AuthorizationError` | 403  | `OWNERSHIP_TRANSFER_NOT_OWNER` (service check) |
| Exactly one of `previousOwnerRoleId` and `leaveOrganization: true` is set                                                                                          | `BadRequestError`    | 400  | `OWNERSHIP_TRANSFER_INVALID_SELECTION`         |
| `previousOwnerRoleId` is one of this organization's roles strictly below Owner (Admin, Dev, Viewer): not Owner, not a custom role, not another organization's role | `BadRequestError`    | 400  | `OWNERSHIP_TRANSFER_INVALID_ROLE`              |
| The new owner is not the caller                                                                                                                                    | `BadRequestError`    | 400  | `OWNERSHIP_TRANSFER_SELF`                      |
| The new owner is a current member (a pending invitation is not membership)                                                                                         | `NotFoundError`      | 404  | `OWNERSHIP_TRANSFER_TARGET_NOT_MEMBER`         |
| The new owner's user is not deactivated (soft-deleted)                                                                                                             | `ConflictError`      | 409  | `OWNERSHIP_TRANSFER_TARGET_DEACTIVATED`        |
| The new owner has a verified authentication method (`user_authentication_methods.is_verified`, the source of the session's `isVerified` claim)                     | `ConflictError`      | 409  | `OWNERSHIP_TRANSFER_TARGET_UNVERIFIED`         |

The `reason` is returned in the error `extensions` (GraphQL) and `extensions.reason` (REST), next to a `translationKey` (`errors.ownershipTransfer.*`, in every locale), so a client can tell the cases apart without parsing the message. The "not owner" case answers 403 whether the permission or the service check refuses it; only the service check carries the `reason`.

Transfers are a sensitive action: they need a verified email and, when the organization enforces [MFA for sensitive actions](/core-concepts/mfa-recovery) or the caller has a factor enrolled, an MFA-verified session, exactly like deleting the organization.

### GraphQL

```graphql
mutation {
  transferOrganizationOwnership(
    input: {
      scope: { tenant: organization, id: "<organization id>" }
      newOwnerId: "<user id>"
      previousOwnerRoleId: "<Admin, Dev or Viewer role id>" # or: leaveOrganization: true
    }
  ) {
    organization {
      id
    }
    newOwner {
      id
      role {
        name
      }
    }
    previousOwner {
      id
      role {
        name
      }
    } # null when they left
  }
}
```

### REST

`POST /api/organizations/{id}/ownership-transfer` with the body

```json
{
  "scope": { "tenant": "organization", "id": "<organization id>" },
  "newOwnerId": "<user id>",
  "previousOwnerRoleId": "<role id>",
  "leaveOrganization": false
}
```

Like the other organization routes, the body names the `scope` the request is authorized in. It must be the organization in the path (`400` otherwise). The response has the same shape as the GraphQL result. The operation is `postApiOrganizationsByIdOwnershipTransfer` in the OpenAPI document and in the CLI (`grant api`).

### Event, audit and notifications

A transfer publishes one `organization.ownership_transferred` event and writes one audit entry on the organization, both in the same transaction. It does **not** also publish `organization.member_role_changed` or `organization.member_removed` for the two sides: one event, so nobody is notified twice.

- `subjectUserId` is the new owner; the actor is the previous owner. The audience is `actor` and `subject` (`excludeActor: false`), so **both** are notified, in-app and by email (see [Events, Webhooks & Notifications](./events-webhooks-notifications.md)).
- `data.before` and `data.after` carry **user ids and role ids only**: `previousOwnerUserId`, `previousOwnerRoleId`, `newOwnerUserId`, `newOwnerRoleId`. `after.previousOwnerRoleId` is `null` when the previous owner left. The audit entry holds the same two objects. No names or emails.

### Existing deployments

`Organization:TransferOwnership` is a new standard permission. It reaches existing databases through `seedAll` (`db:seed`, or boot with `DB_BOOTSTRAP_ON_BOOT`, ADR 0001): the seed inserts a missing permission and links it to the Organization Owner group. There is no migration.
