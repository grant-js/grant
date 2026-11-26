---
'grant-api': minor
'@grantjs/schema': minor
'@grantjs/cli': minor
---

Organization ownership can be transferred. The current owner hands the Organization Owner role to another member with `transferOrganizationOwnership` (GraphQL) or `POST /api/organizations/{id}/ownership-transfer` (REST), and either keeps a role below Owner or leaves the organization. An organization always has exactly one owner: the new owner gets Owner first, concurrent transfers serialize, and the caller must be a signed-in user who holds Owner (not an API key). The new owner must be a current, active member with a verified email. Refusals carry a stable `reason` (`OWNERSHIP_TRANSFER_*`) and a translation key. The transfer is gated by the new permission `Organization:TransferOwnership`, held by the Owner group only, which reaches existing databases through `db:seed` (no migration), and by the email and MFA guards of `deleteOrganization`. It publishes one `organization.ownership_transferred` event (webhook-subscribable; notifies both the previous and the new owner, in-app and by email, en/de) and one audit entry, with user ids and role ids only. `BadRequestError`, `NotFoundError` and `ConflictError` gain an optional `reason`, returned in the error `extensions`. The CLI lists the new operation.
