---
title: Organization Settings
description: The organization Settings view in the dashboard, its sections and who may use them
---

# Organization Settings

Each organization has a **Settings** page in the dashboard, reached from the **Settings** item at the end of the organization sidebar group or from the **Settings** action in an organization's row menu. It holds the organization's name and logo and the settings that change how the whole organization behaves. The **Edit** dialog on the organizations list still changes name and logo too; both save through the same `updateOrganization` mutation and picture upload.

```
/dashboard/organizations/{organizationId}/settings
```

## Sections

### General

The organization's **name** and **logo**. Hovering the logo offers an upload (the same picture upload as the Edit dialog); **Save** sends only `name` through `updateOrganization`. Without `Organization:update` the name is shown read-only with a hint, and without `Organization:upload-picture` the logo has no upload action.

### Security

| Setting                           | What it does                                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Require MFA for sensitive actions | When on, members must complete a second-factor step-up before an action guarded by the organization's MFA policy (updating or deleting the organization, among others) |

The switch calls the same `updateOrganization` mutation the Edit dialog used to call, with `requireMfaForSensitiveActions` as the only field. Changing it still needs the caller's own MFA step-up when the organization already enforces MFA or the caller has a factor enrolled, and it publishes the `organization.mfa_enforcement_changed` event as before. Without the `Organization:update` permission the switch is shown read-only with a hint.

### Ownership

Shown only to callers who hold `Organization:TransferOwnership`, which only the **Organization Owner** group holds, so it is the owner's alone. It sits between Security and the Danger zone.

1. **New owner**: a picker of the organization's members, without yourself and without pending invitations. The member data does not say whether a member's email is verified, so the API refuses an unverified member and the reason is shown.
2. **Your role after the transfer**: Admin, Dev or Viewer from the organization's roles, or **Leave the organization**.
3. **Transfer ownership** opens a confirmation that asks for the organization **name**, typed exactly as shown, like deleting the organization. The mutation is `transferOrganizationOwnership`; when the organization enforces MFA, or you have a factor enrolled, the usual second-factor step-up runs first.

After a successful transfer the dashboard refetches the organization and its members and re-checks what you may do, so the Ownership section and the Danger zone disappear for you, since you are no longer the owner. If you chose to leave, the dashboard returns to the organizations list. A refused transfer shows the API's reason in your language (not the owner, not a member, deactivated, unverified email, invalid role) and keeps the dialog open.

The rules, the errors and the event are in [Organization ownership](./organization-ownership.md).

### Danger zone

A red-bordered card, shown only to callers who hold `Organization:delete`. **Delete organization** opens a confirmation that asks for the organization **name**, typed exactly as shown. The delete button stays disabled until it matches. After a successful delete the dashboard returns to the organizations list.

## Who may do what

| Action                     | Owner | Admin | Dev | Viewer | Enforced by                             |
| -------------------------- | :---: | :---: | :-: | :----: | --------------------------------------- |
| Change name and logo       |  Yes  |   –   |  –  |   –    | `Organization:update`, `upload-picture` |
| Change the MFA requirement |  Yes  |   –   |  –  |   –    | `Organization:update`                   |
| Transfer ownership         |  Yes  |   –   |  –  |   –    | `Organization:transfer-ownership`       |
| Delete the organization    |  Yes  |   –   |  –  |   –    | `Organization:delete`                   |

The permissions are enforced by the API for both GraphQL and REST. The dashboard only decides what to show, using `useGrant` for the organization scope. `Organization:delete` is held by the **Organization Owner** group and by no other organization group, so deleting an organization is owner-only. See [RBAC](/architecture/rbac#organization-groups) for the group table.

## Related

- [MFA recovery](/core-concepts/mfa-recovery)
- [Organization ownership](./organization-ownership.md)
- [Members & invitations](/core-concepts/organization-invitations)
