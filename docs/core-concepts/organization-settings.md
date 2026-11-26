---
title: Organization Settings
description: The organization Settings view in the dashboard, its sections and who may use them
---

# Organization Settings

Each organization has a **Settings** page in the dashboard, reached from the **Settings** item at the end of the organization sidebar group or from the **Settings** action in an organization's row menu. It holds the settings that change how the whole organization behaves. Name and logo stay in the **Edit** dialog on the organizations list.

```
/dashboard/organizations/{organizationId}/settings
```

## Sections

### Security

| Setting                           | What it does                                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Require MFA for sensitive actions | When on, members must complete a second-factor step-up before an action guarded by the organization's MFA policy (updating or deleting the organization, among others) |

The switch calls the same `updateOrganization` mutation the Edit dialog used to call, with `requireMfaForSensitiveActions` as the only field. Changing it still needs the caller's own MFA step-up when the organization already enforces MFA or the caller has a factor enrolled, and it publishes the `organization.mfa_enforcement_changed` event as before. Without the `Organization:update` permission the switch is shown read-only with a hint.

### Danger zone

A red-bordered card, shown only to callers who hold `Organization:delete`. **Delete organization** opens a confirmation that asks for the organization **name**, typed exactly as shown. The delete button stays disabled until it matches. After a successful delete the dashboard returns to the organizations list.

## Who may do what

| Action                             | Owner | Admin | Dev | Viewer | Enforced by                             |
| ---------------------------------- | :---: | :---: | :-: | :----: | --------------------------------------- |
| Change name and logo (Edit dialog) |  Yes  |   –   |  –  |   –    | `Organization:update`, `upload-picture` |
| Change the MFA requirement         |  Yes  |   –   |  –  |   –    | `Organization:update`                   |
| Delete the organization            |  Yes  |   –   |  –  |   –    | `Organization:delete`                   |

The permissions are enforced by the API for both GraphQL and REST. The dashboard only decides what to show, using `useGrant` for the organization scope. `Organization:delete` is held by the **Organization Owner** group and by no other organization group, so deleting an organization is owner-only. See [RBAC](/architecture/rbac#organization-groups) for the group table.

## Related

- [MFA recovery](/core-concepts/mfa-recovery)
- [Members & invitations](/core-concepts/organization-invitations)
