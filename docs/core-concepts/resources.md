---
title: Resources
description: Named entities that define available actions for RBAC
---

# Resources

A **resource** is a named entity that declares which actions can be performed on it. Resources are the foundation of Grant's permission model — every permission is a `(resource, action)` pair, optionally scoped with conditions.

## How It Fits Together

```bmermaid
graph LR
    Resource -->|"defines"| Permission
    Permission -->|"bundled into"| Group
    Group -->|"assigned via"| Role
    Role -->|"granted to"| User
```

1. A **resource** declares its allowed actions (e.g. `ApiKey` allows `Create`, `Revoke`, `Exchange`)
2. A **permission** binds a resource + action, optionally with a condition (e.g. "only keys you created")
3. Permissions are bundled into **groups**, groups into **roles**, and roles are assigned to **users**

::: tip
Resources are always scoped to a **project**. Each project can have the platform defaults plus any custom resources you define.
:::

## Built-in Resources

Grant ships with 15 platform resources. These are seeded automatically and cover the core domain:

| Resource                     | Actions                                                                |
| ---------------------------- | ---------------------------------------------------------------------- |
| **User**                     | `Create` `Read` `Update` `Delete` `Query` `ExportData` `UploadPicture` |
| **Account**                  | `Read` `Delete` `Query`                                                |
| **Organization**             | `Create` `Read` `Update` `Delete` `Query`                              |
| **Project**                  | `Create` `Update` `Delete` `Query`                                     |
| **Resource**                 | `Create` `Update` `Delete` `Query`                                     |
| **Role**                     | `Create` `Update` `Delete` `Query`                                     |
| **Group**                    | `Create` `Update` `Delete` `Query`                                     |
| **Permission**               | `Create` `Update` `Delete` `Query`                                     |
| **Tag**                      | `Create` `Update` `Delete` `Query`                                     |
| **ApiKey**                   | `Create` `Delete` `Query` `Revoke` `Exchange`                          |
| **OrganizationMember**       | `Read` `Update` `Remove` `Query`                                       |
| **OrganizationInvitation**   | `Create` `Read` `Query` `Revoke` `ResendEmail` `Renew`                 |
| **ProjectUser**              | `Read` `Query`                                                         |
| **UserSession**              | `Read` `Query`                                                         |
| **UserAuthenticationMethod** | `Read` `Query`                                                         |

The canonical source is [`packages/@grantjs/constants/src/permissions/resources.ts`](https://github.com/logusgraphics/grant/blob/main/packages/%40grantjs/constants/src/permissions/resources.ts).

## Available Actions

Actions are shared across resources — each resource picks the subset it supports:

| Action          | Meaning                                       |
| --------------- | --------------------------------------------- |
| `Create`        | Create a new instance                         |
| `Read`          | Read a single instance                        |
| `Update`        | Modify an existing instance                   |
| `Delete`        | Soft- or hard-delete                          |
| `Query`         | List / paginate / search                      |
| `ExportData`    | Export user data (GDPR)                       |
| `UploadPicture` | Upload a profile image                        |
| `Remove`        | Remove a membership (e.g. org member)         |
| `Revoke`        | Revoke an active entity (API key, invitation) |
| `ResendEmail`   | Resend an invitation email                    |
| `Renew`         | Renew an expired invitation token             |
| `Exchange`      | Exchange API key credentials for a JWT        |

## Conditional Permissions

Permissions can include **conditions** that restrict access beyond the action itself. Conditions compare a field on the request context against a known value using operators like `StringEquals` or `In`.

Example — an `ApiKeyOwner` group might grant `Delete` on the `ApiKey` resource only when `resource.createdBy` equals the requesting user:

```json
{
  "StringEquals": {
    "resource.createdBy": "{{user.id}}"
  }
}
```

This is how Grant implements attribute-based rules within the RBAC model — no separate ABAC engine required. See [Permission Conditions](/core-concepts/permission-conditions) for full syntax reference.

## Custom Resources

Projects can define their own resources with custom actions via the GraphQL `createResource` mutation or the REST API. Custom resources participate in the same RBAC chain as built-in ones: you create the resource, create permissions for it, bundle them into groups, and assign groups to roles.

This is the primary extension point for integrating Grant's permission system with your application's domain.

---

**Related:**

- [Permission Conditions](/core-concepts/permission-conditions) — Full condition syntax reference
- [RBAC System](/architecture/rbac) — Roles, groups, and permission evaluation
- [Data Model](/architecture/data-model) — Entity relationships
- [API Keys](/core-concepts/api-keys) — API key resource actions
