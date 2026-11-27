# @grantjs/cli

## 1.31.1

No changes in this release.

## 1.31.0

### Minor Changes

- d50fd6c: Organization ownership can be transferred. The current owner hands the Organization Owner role to another member with `transferOrganizationOwnership` (GraphQL) or `POST /api/organizations/{id}/ownership-transfer` (REST), and either keeps a role below Owner or leaves the organization. An organization always has exactly one owner: the new owner gets Owner first, concurrent transfers serialize, and the caller must be a signed-in user who holds Owner (not an API key). The new owner must be a current, active member with a verified email. Refusals carry a stable `reason` (`OWNERSHIP_TRANSFER_*`) and a translation key. The transfer is gated by the new permission `Organization:TransferOwnership`, held by the Owner group only, which reaches existing databases through `db:seed` (no migration), and by the email and MFA guards of `deleteOrganization`. It publishes one `organization.ownership_transferred` event (webhook-subscribable; notifies both the previous and the new owner, in-app and by email, en/de) and one audit entry, with user ids and role ids only. `BadRequestError`, `NotFoundError` and `ConflictError` gain an optional `reason`, returned in the error `extensions`. The CLI lists the new operation. The organization Settings page gets an **Ownership** section (owner only): pick the new owner, choose the role you keep or leave, confirm by typing the organization name; refusals show the API's reason in English or German.

## 1.30.5

No changes in this release.

## 1.30.4

No changes in this release.

## 1.30.3

No changes in this release.

## 1.30.2

No changes in this release.

## 1.30.1

No changes in this release.

## 1.30.0

No changes in this release.

## 1.29.3

No changes in this release.

## 1.29.2

No changes in this release.

## 1.29.1

No changes in this release.

## 1.29.0

No changes in this release.

## 1.28.0

No changes in this release.

## 1.27.1

No changes in this release.

## 1.27.0

No changes in this release.

## 1.26.0

No changes in this release.

## 1.25.1

No changes in this release.

## 1.25.0

No changes in this release.

## 1.24.0

No changes in this release.

## 1.23.1

No changes in this release.

## 1.23.0

No changes in this release.

## 1.22.1

No changes in this release.

## 1.22.0

No changes in this release.

## 1.21.0

No changes in this release.

## 1.20.2

No changes in this release.

## 1.20.1

No changes in this release.

## 1.20.0

No changes in this release.

## 1.19.0

No changes in this release.

## 1.18.11

No changes in this release.

## 1.18.10

No changes in this release.

## 1.18.9

No changes in this release.

## 1.18.8

No changes in this release.

## 1.18.7

No changes in this release.

## 1.18.6

No changes in this release.

## 1.18.5

No changes in this release.

## 1.18.4

No changes in this release.

## 1.18.3

No changes in this release.

## 1.18.2

No changes in this release.

## 1.18.1

No changes in this release.

## 1.18.0

### Minor Changes

- 2d0528c: Webhook deliveries now say **which user an event is about**. The CloudEvents envelope has a new extension attribute, `grantsubjectuser: { "userId": "…" }` (or `null` when the event has no subject user), next to `grantactor`. Revoke and remove events such as `user.role_revoked`, `user.group_revoked`, `user.permission_revoked` and `project.user_removed` used to arrive with an empty `data` (the internal `before` snapshot is not delivered) and a `subject` that is the id of the assignment record, so a consumer could not tell whose access changed; it can now read the user id from `grantsubjectuser`. `data` and redaction are unchanged, and the new attribute is additive.

## 1.17.0

No changes in this release.

## 1.16.1

No changes in this release.

## 1.16.0

No changes in this release.

## 1.15.0

No changes in this release.

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

### Minor Changes

- 70afd4e: Agent-first CLI: profile/env credentials, `grant whoami`, `grant api`, OpenAPI-named REST commands, optional origin-verify header, and body refresh tokens for session profiles.

## 1.12.0

No changes in this release.

## 1.11.0

No changes in this release.

## 1.10.0

No changes in this release.

## 1.9.2

## 1.9.1

## 1.9.0

## 1.8.0

## 1.7.0

## 1.6.2

## 1.6.1

## 1.6.0

## 1.5.5

## 1.5.4

## 1.5.3

## 1.5.2

## 1.5.1

## 1.5.0

## 1.4.2

## 1.4.1

## 1.4.0

## 1.3.3

## 1.3.2

## 1.3.1

## 1.3.0

## 1.2.0

## 1.1.7

## 1.1.6

## 1.1.5

## 1.1.4

## 1.1.3

## 1.1.2

## 1.1.1

## 1.1.0

## 1.0.0

Initial public release of the Grant CLI.
