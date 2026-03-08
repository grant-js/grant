---
title: RBAC Model
description: Resources, actions, and role-based permissions in Grant
---

# RBAC Model

Grant uses multi-tenant RBAC: **roles** are assigned to users in a scope (account or organization), **groups** link roles to **permissions**, and permissions grant **actions** on **resources**.

## Overview

**Account-level:** Personal Account Owner, Organization Account Owner (full control over that account).

**Organization-level:** Organization Owner, Admin, Dev, Viewer — full control down to read-only within the organization.

::: details Scope of this doc
This page covers **authorization** (which actions need which permissions). These need only **authentication** (logged in), not authorization: login/register, session management, password reset, email verification, profile picture upload, session revocation, auth method management (create/delete/set-primary/change-password).
:::

## Resources and Actions

Actions that require authorization: **read** (single resource by ID), **query** (list/collection). Some resources expose only `query` (e.g. Project, Role, Tag, API Key); others support both `read` and `query`.

::: details Which resources have read vs query only
- **Both read + query:** User, Account, Organization, Organization Member, Organization Invitation, Project User, User Session, User Authentication Method
- **Query only:** Project, Resource, Role, Group, Permission, Tag, API Key (list with optional `ids` filter)
:::

### Core Resources

| Resource         | Actions                                                 | Description                          |
| ---------------- | ------------------------------------------------------- | ------------------------------------ |
| **User**         | `create` `read` `update` `delete` `query` `export-data` | Platform users                       |
| **Account**      | `read` `delete` `query`                                 | Personal or organization workspace  |
| **Organization** | `create` `read` `update` `delete` `query`               | Container for projects and members  |
| **Project**      | `create` `update` `delete` `query`                      | Isolated environment (query only)   |
| **Resource**     | `create` `update` `delete` `query`                      | Domain entities (query only)        |
| **Role**         | `create` `update` `delete` `query`                      | Named permission sets (query only)   |
| **Group**        | `create` `update` `delete` `query`                      | Role–resource permission bundles    |
| **Permission**   | `create` `update` `delete` `query`                      | Action on a resource                 |
| **Tag**          | `create` `update` `delete` `query`                      | Labels (query only)                  |
| **API Key**      | `create` `delete` `query` `revoke` `exchange`            | Programmatic credentials             |
| **App**          | `create` `update` `query` `delete`                      | Consent-flow applications            |

### Relationship & Session Resources

| Resource                    | Actions                                                 | Description                |
| --------------------------- | ------------------------------------------------------- | -------------------------- |
| **Organization Member**     | `read` `update` `remove` `query`                        | Users in an organization   |
| **Organization Invitation** | `create` `read` `query` `revoke` `resend-email` `renew` | Join-org invitations       |
| **Project User**            | `read` `query`                                          | Users in a project         |
| **User Session**            | `read` `query`                                          | Active sessions (own only)|
| **User Authentication Method** | `read` `query`                                       | Auth methods (own only)   |

## Roles

### Account-Level

Two account types: **personal** (one per user) and **organization** (owned by users). Each has a single role: **Personal Account Owner** or **Organization Account Owner** — full control over that account. Account ownership is independent of organization membership (you can be account owner and also Org Admin/Dev/Viewer elsewhere).

### Organization-Level

Within an organization, four roles: **Owner** (full control), **Admin** (teams and permissions, no account ownership), **Dev** (create/manage resources, roles, permissions), **Viewer** (read-only).

### Project-Level: Two Kinds of Users

- **Platform users** — People with a Grant account (personal or org member). They use the dashboard to design auth. Their project access is **inherited**: account owner → Owner on account projects; org role (Owner/Admin/Dev/Viewer) applies to org projects. The platform does not define project-level groups for them.
- **Project users** — Third-party identities in a project (Project User resource). They use the project's APIs/apps (API keys, OAuth), not the dashboard. Platform users define **custom** roles, groups, and permissions inside the project for these users; the platform supplies the primitives but not a fixed structure.

## Groups

Groups link **roles** to **permissions** via a **Role + Resource** combination. Naming: `{Resource} {Role}` (e.g. "Organization Owner", "User Dev"). Permissions live in groups; roles get access by being assigned groups.

**Flow:** `User → Role → Group → Permission → Resource`. The system evaluates all role–group combinations for the user when checking access.

::: details Standard account- and organization-level groups (reference)
**Account-level:** Only Owner groups — `Personal Account Owner`, `Organization Account Owner` (Role: Owner, Resource: Account). **Organization-level:** All four — `Organization Owner`, `Organization Admin`, `Organization Dev`, `Organization Viewer`. **Project-level:** No standard groups; platform users' project access is inherited from org role; custom project groups are user-defined.
:::

## Permission Mapping to Groups

**Common groups** — assigned to all roles (basic read/query, some create). **Role-specific groups** — extra permissions for Owner, Admin, Dev, or Viewer. Summary: Tags are Owner-only; API Key delete/revoke for Dev is own-keys only (condition). Expand below for full reference.

::: details Full group → permission reference
### Common Groups (all roles)

| Group Name                          | Resource                   | Permissions                | Description                                                                   |
| ----------------------------------- | -------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `Account Common`                    | Account                    | `read` `query`             | Basic account access for all authenticated users                              |
| `User Common`                       | User                       | `read` `query`             | Basic user viewing for all authenticated users                                |
| `Organization Common`               | Organization               | `create` `query`           | Basic organization access (can create and query organizations)                |
| `Project Common`                    | Project                    | `query`                    | Basic project viewing for all authenticated users                             |
| `Account Project Owner`             | Project                    | `create` `update` `delete` | Project management for account owners                                         |
| `Resource Common`                   | Resource                   | `query`                    | Basic resource viewing for all authenticated users                            |
| `Role Common`                       | Role                       | `query`                    | Basic role viewing for all authenticated users                                |
| `Group Common`                      | Group                      | `query`                    | Basic group viewing for all authenticated users                               |
| `Permission Common`                 | Permission                 | `query`                    | Basic permission viewing for all authenticated users                          |
| `Tag Common`                        | Tag                        | `query`                    | Basic tag viewing for all authenticated users                                 |
| `API Key Common`                    | API Key                    | `query` `exchange`         | Basic API key access for all authenticated users                              |
| `Organization Member Common`        | Organization Member        | `read` `query`             | Basic organization member viewing for all authenticated users                 |
| `Organization Invitation Common`    | Organization Invitation    | `query`                    | Basic organization invitation access for all authenticated users              |
| `Project User Common`               | Project User               | `read` `query`             | Basic project user viewing for all authenticated users                        |
| `User Session Common`               | User Session               | `read` `query`             | Basic user session viewing (own sessions only, enforced by condition)         |
| `User Authentication Method Common` | User Authentication Method | `read` `query`             | Basic authentication method viewing (own methods only, enforced by condition) |

### Role-Specific Groups

These groups contain permissions specific to certain roles:

#### Account Groups

| Group Name                   | Resource | Permissions | Assigned To                | Description                       |
| ---------------------------- | -------- | ----------- | -------------------------- | --------------------------------- |
| `Personal Account Owner`     | Account  | `delete`    | Personal Account Owner     | Full personal account control     |
| `Organization Account Owner` | Account  | `delete`    | Organization Account Owner | Full organization account control |

#### User Groups

| Group Name    | Resource | Permissions                              | Assigned To        | Description                                  |
| ------------- | -------- | ---------------------------------------- | ------------------ | -------------------------------------------- |
| `User Owner`  | User     | `create` `update` `delete` `export-data` | Organization Owner | Full user management                         |
| `User Admin`  | User     | `create` `update` `delete` `export-data` | Organization Admin | Full user management                         |
| `User Dev`    | User     | `update` (own user only)                 | Organization Dev   | Limited user management (own profile only)   |
| `User Viewer` | User     | _(no additional permissions)_            | —                  | Viewer has same user access as common groups |

#### Organization Groups

| Group Name            | Resource     | Permissions                   | Assigned To        | Description                                          |
| --------------------- | ------------ | ----------------------------- | ------------------ | ---------------------------------------------------- |
| `Organization Owner`  | Organization | `update` `delete`             | Organization Owner | Full organization management                         |
| `Organization Admin`  | Organization | `update` `delete`             | Organization Admin | Full organization management                         |
| `Organization Dev`    | Organization | _(no additional permissions)_ | —                  | Dev has same organization access as common groups    |
| `Organization Viewer` | Organization | _(no additional permissions)_ | —                  | Viewer has same organization access as common groups |

#### Project Resource Groups

These groups control what organization-level roles can do **with** the Project resource (create, update, delete projects). They are not project-scope groups — see [Project-Level: Two Kinds of Users](#project-level-two-kinds-of-users).

| Group Name       | Resource | Permissions                   | Assigned To        | Description                                     |
| ---------------- | -------- | ----------------------------- | ------------------ | ----------------------------------------------- |
| `Project Owner`  | Project  | `create` `update` `delete`    | Organization Owner | Full project management                         |
| `Project Admin`  | Project  | `create` `update` `delete`    | Organization Admin | Full project management                         |
| `Project Dev`    | Project  | `create` `update` `delete`    | Organization Dev   | Full project management                         |
| `Project Viewer` | Project  | _(no additional permissions)_ | —                  | Viewer has same project access as common groups |

#### Resource Groups

| Group Name        | Resource | Permissions                   | Assigned To        | Description                                      |
| ----------------- | -------- | ----------------------------- | ------------------ | ------------------------------------------------ |
| `Resource Owner`  | Resource | `create` `update` `delete`    | Organization Owner | Full resource management                         |
| `Resource Admin`  | Resource | `create` `update` `delete`    | Organization Admin | Full resource management                         |
| `Resource Dev`    | Resource | `create` `update` `delete`    | Organization Dev   | Full resource management                         |
| `Resource Viewer` | Resource | _(no additional permissions)_ | —                  | Viewer has same resource access as common groups |

#### Role Groups

| Group Name    | Resource | Permissions                   | Assigned To        | Description                                  |
| ------------- | -------- | ----------------------------- | ------------------ | -------------------------------------------- |
| `Role Owner`  | Role     | `create` `update` `delete`    | Organization Owner | Full role management                         |
| `Role Admin`  | Role     | `create` `update` `delete`    | Organization Admin | Full role management                         |
| `Role Dev`    | Role     | `create` `update` `delete`    | Organization Dev   | Full role management                         |
| `Role Viewer` | Role     | _(no additional permissions)_ | —                  | Viewer has same role access as common groups |

#### Group Groups

| Group Name     | Resource | Permissions                   | Assigned To        | Description                                   |
| -------------- | -------- | ----------------------------- | ------------------ | --------------------------------------------- |
| `Group Owner`  | Group    | `create` `update` `delete`    | Organization Owner | Full group management                         |
| `Group Admin`  | Group    | `create` `update` `delete`    | Organization Admin | Full group management                         |
| `Group Dev`    | Group    | `create` `update` `delete`    | Organization Dev   | Full group management                         |
| `Group Viewer` | Group    | _(no additional permissions)_ | —                  | Viewer has same group access as common groups |

#### Permission Groups

| Group Name          | Resource   | Permissions                   | Assigned To        | Description                                        |
| ------------------- | ---------- | ----------------------------- | ------------------ | -------------------------------------------------- |
| `Permission Owner`  | Permission | `create` `update` `delete`    | Organization Owner | Full permission management                         |
| `Permission Admin`  | Permission | `create` `update` `delete`    | Organization Admin | Full permission management                         |
| `Permission Dev`    | Permission | `create` `update` `delete`    | Organization Dev   | Full permission management                         |
| `Permission Viewer` | Permission | _(no additional permissions)_ | —                  | Viewer has same permission access as common groups |

#### Tag Groups

| Group Name   | Resource | Permissions                   | Assigned To        | Description                                 |
| ------------ | -------- | ----------------------------- | ------------------ | ------------------------------------------- |
| `Tag Owner`  | Tag      | `create` `update` `delete`    | Organization Owner | Full tag management (Owner only)            |
| `Tag Admin`  | Tag      | _(no additional permissions)_ | —                  | Admin cannot manage tags                    |
| `Tag Dev`    | Tag      | _(no additional permissions)_ | —                  | Dev has same tag access as common groups    |
| `Tag Viewer` | Tag      | _(no additional permissions)_ | —                  | Viewer has same tag access as common groups |

**Note**: Only Organization Owner can manage tags. Admin, Dev, and Viewer roles have read-only access via common groups.

#### API Key Groups

| Group Name       | Resource | Permissions                    | Assigned To        | Description                                     |
| ---------------- | -------- | ------------------------------ | ------------------ | ----------------------------------------------- |
| `API Key Owner`  | API Key  | `create` `delete` `revoke`     | Organization Owner | Full API key management                         |
| `API Key Admin`  | API Key  | `create` `delete` `revoke`     | Organization Admin | Full API key management                         |
| `API Key Dev`    | API Key  | `create` `delete`\* `revoke`\* | Organization Dev   | API key creation; delete/revoke own keys only   |
| `API Key Viewer` | API Key  | _(no additional permissions)_  | —                  | Viewer has same API key access as common groups |

::: info
Dev can only delete/revoke their own API keys (enforced by condition) \*
:::

#### Organization Member Groups

| Group Name                   | Resource            | Permissions                   | Assigned To        | Description                                                 |
| ---------------------------- | ------------------- | ----------------------------- | ------------------ | ----------------------------------------------------------- |
| `Organization Member Owner`  | Organization Member | `update` `remove`             | Organization Owner | Full organization member management                         |
| `Organization Member Admin`  | Organization Member | `update` `remove`             | Organization Admin | Full organization member management                         |
| `Organization Member Dev`    | Organization Member | _(no additional permissions)_ | —                  | Dev has same organization member access as common groups    |
| `Organization Member Viewer` | Organization Member | _(no additional permissions)_ | —                  | Viewer has same organization member access as common groups |

#### Organization Invitation Groups

| Group Name                       | Resource                | Permissions                              | Assigned To        | Description                                                     |
| -------------------------------- | ----------------------- | ---------------------------------------- | ------------------ | --------------------------------------------------------------- |
| `Organization Invitation Owner`  | Organization Invitation | `create` `revoke` `resend-email` `renew` | Organization Owner | Full organization invitation management                         |
| `Organization Invitation Admin`  | Organization Invitation | `create` `revoke` `resend-email` `renew` | Organization Admin | Full organization invitation management                         |
| `Organization Invitation Dev`    | Organization Invitation | _(no additional permissions)_            | —                  | Dev has same organization invitation access as common groups    |
| `Organization Invitation Viewer` | Organization Invitation | _(no additional permissions)_            | —                  | Viewer has same organization invitation access as common groups |

#### Project User Groups

All roles have only common group permissions for Project User (read, query):

| Group Name            | Resource     | Permissions                   | Assigned To | Description                                          |
| --------------------- | ------------ | ----------------------------- | ----------- | ---------------------------------------------------- |
| `Project User Owner`  | Project User | _(no additional permissions)_ | —           | Owner has same project user access as common groups  |
| `Project User Admin`  | Project User | _(no additional permissions)_ | —           | Admin has same project user access as common groups  |
| `Project User Dev`    | Project User | _(no additional permissions)_ | —           | Dev has same project user access as common groups    |
| `Project User Viewer` | Project User | _(no additional permissions)_ | —           | Viewer has same project user access as common groups |

#### User Session Groups

All roles have only common group permissions for User Session (read, query own sessions):

| Group Name            | Resource     | Permissions                   | Assigned To | Description                                                         |
| --------------------- | ------------ | ----------------------------- | ----------- | ------------------------------------------------------------------- |
| `User Session Owner`  | User Session | _(no additional permissions)_ | —           | Owner has same user session access as common groups (own sessions)  |
| `User Session Admin`  | User Session | _(no additional permissions)_ | —           | Admin has same user session access as common groups (own sessions)  |
| `User Session Dev`    | User Session | _(no additional permissions)_ | —           | Dev has same user session access as common groups (own sessions)    |
| `User Session Viewer` | User Session | _(no additional permissions)_ | —           | Viewer has same user session access as common groups (own sessions) |

#### User Authentication Method Groups

All roles have only common group permissions for User Authentication Method (read, query own methods):

| Group Name                          | Resource                   | Permissions                   | Assigned To | Description                                                       |
| ----------------------------------- | -------------------------- | ----------------------------- | ----------- | ----------------------------------------------------------------- |
| `User Authentication Method Owner`  | User Authentication Method | _(no additional permissions)_ | —           | Owner has same auth method access as common groups (own methods)  |
| `User Authentication Method Admin`  | User Authentication Method | _(no additional permissions)_ | —           | Admin has same auth method access as common groups (own methods)  |
| `User Authentication Method Dev`    | User Authentication Method | _(no additional permissions)_ | —           | Dev has same auth method access as common groups (own methods)    |
| `User Authentication Method Viewer` | User Authentication Method | _(no additional permissions)_ | —           | Viewer has same auth method access as common groups (own methods) |

:::

## Permission Mapping to Roles

Action × role matrices: Owner/Admin/Dev can do most writes; Viewer is read-only. Exceptions: **Tags** — Owner only; **User update** and **API Key delete/revoke** — Dev only for self (condition).

::: details Full permission matrix (all resources)

### Core Resource Permissions

#### User Permissions

| Action        | Resource |                            Organization Owner                            |                            Organization Admin                            |                              Organization Dev                              |                           Organization Viewer                            |
| ------------- | -------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :------------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `create`      | `user`   | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |   <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>   |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `read`        | `user`   | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>  | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |
| `update`      | `user`   | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>\* |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `delete`      | `user`   | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |   <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>   |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `query`       | `user`   | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>  | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |
| `export-data` | `user`   | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |   <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>   |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |

::: info
Dev can only update their own user record \*
:::

#### Account Permissions

| Action   | Resource  |                          Personal Account Owner                          |                        Organization Account Owner                        |
| -------- | --------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `read`   | `account` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |
| `delete` | `account` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |
| `query`  | `account` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

#### Organization Permissions

| Action   | Resource       |                            Organization Owner                            |                            Organization Admin                            |                             Organization Dev                             |                           Organization Viewer                            |
| -------- | -------------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `create` | `organization` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |
| `update` | `organization` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `delete` | `organization` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `query`  | `organization` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

::: info
Organization `read` is enforced by scope (users can only read organizations they belong to).
:::

#### Project Permissions

| Action   | Resource  |                            Organization Owner                            |                            Organization Admin                            |                             Organization Dev                             |                           Organization Viewer                            |
| -------- | --------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `create` | `project` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `update` | `project` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `delete` | `project` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `query`  | `project` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

#### Resource Permissions

| Action   | Resource   |                            Organization Owner                            |                            Organization Admin                            |                             Organization Dev                             |                           Organization Viewer                            |
| -------- | ---------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `create` | `resource` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `update` | `resource` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `delete` | `resource` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `query`  | `resource` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

#### Role Permissions

| Action   | Resource |                            Organization Owner                            |                            Organization Admin                            |                             Organization Dev                             |                           Organization Viewer                            |
| -------- | -------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `create` | `role`   | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `update` | `role`   | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `delete` | `role`   | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `query`  | `role`   | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

#### Group Permissions

| Action   | Resource |                            Organization Owner                            |                            Organization Admin                            |                             Organization Dev                             |                           Organization Viewer                            |
| -------- | -------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `create` | `group`  | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `update` | `group`  | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `delete` | `group`  | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `query`  | `group`  | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

#### Permission Permissions

| Action   | Resource     |                            Organization Owner                            |                            Organization Admin                            |                             Organization Dev                             |                           Organization Viewer                            |
| -------- | ------------ | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `create` | `permission` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `update` | `permission` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `delete` | `permission` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `query`  | `permission` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

#### Tag Permissions

| Action   | Resource |                            Organization Owner                            |                            Organization Admin                            |                             Organization Dev                             |                           Organization Viewer                            |
| -------- | -------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `create` | `tag`    | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `update` | `tag`    | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `delete` | `tag`    | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `query`  | `tag`    | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

**Note**: Only Organization Owner can manage tags.

#### API Key Permissions

| Action     | Resource  |                            Organization Owner                            |                            Organization Admin                            |                              Organization Dev                              |                           Organization Viewer                            |
| ---------- | --------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :------------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `create`   | `api-key` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `delete`   | `api-key` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>\* |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `query`    | `api-key` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>  | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |
| `revoke`   | `api-key` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>\* |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `exchange` | `api-key` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>  | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

\* Dev can only delete/revoke their own API keys

### Relationship Permissions

#### Organization Member Permissions

| Action   | Resource              |                            Organization Owner                            |                            Organization Admin                            |                             Organization Dev                             |                           Organization Viewer                            |
| -------- | --------------------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `read`   | `organization-member` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |
| `update` | `organization-member` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `remove` | `organization-member` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `query`  | `organization-member` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

#### Organization Invitation Permissions

| Action         | Resource                  |                            Organization Owner                            |                            Organization Admin                            |                             Organization Dev                             |                           Organization Viewer                            |
| -------------- | ------------------------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `create`       | `organization-invitation` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `read`         | `organization-invitation` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |
| `query`        | `organization-invitation` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |
| `revoke`       | `organization-invitation` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `resend-email` | `organization-invitation` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |
| `renew`        | `organization-invitation` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |  <span class="rbac-perm-icon"><IconFluentColorDismissCircle20 /></span>  |

#### Project User Permissions

| Action  | Resource       |                            Organization Owner                            |                            Organization Admin                            |                             Organization Dev                             |                           Organization Viewer                            |
| ------- | -------------- | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| `read`  | `project-user` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |
| `query` | `project-user` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span> |

### Session & Authentication Permissions (Authorization-Required Only)

#### User Session Permissions

| Action  | Resource       |                                 All Roles                                  |
| ------- | -------------- | :------------------------------------------------------------------------: |
| `read`  | `user-session` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>\* |
| `query` | `user-session` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>\* |

\* Users can only read/query their own sessions (enforced by condition)

#### User Authentication Method Permissions

| Action  | Resource                     |                                 All Roles                                  |
| ------- | ---------------------------- | :------------------------------------------------------------------------: |
| `read`  | `user-authentication-method` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>\* |
| `query` | `user-authentication-method` | <span class="rbac-perm-icon"><IconFluentColorCheckmarkCircle20 /></span>\* |

\* Users can only read/query their own authentication methods (enforced by condition)

:::

## Naming and Scope

**Permissions** are stored as `action` (kebab-case: `create`, `read`, `update`, `delete`, `query`, `export-data`, `remove`, `revoke`, `resend-email`, `renew`, `exchange`) plus `resourceId` (references the `resources` table). **Scopes:** Account (account-level actions), Organization (org and members), Project (project resources). Access is limited to resources in the user's assigned scopes.

## Implementation Notes

**Role hierarchy (conceptual):** Owner ⊃ Admin ⊃ Dev ⊃ Viewer; only Tags are Owner-only (Admin has no tag write). **Self-management (conditions):** Dev can update own user; all users can read own sessions and auth methods; Dev can delete/revoke own API keys. See [Permission Conditions](/core-concepts/permission-conditions) for syntax. **Auth-only (no RBAC):** Login, register, session refresh, password reset, profile picture, session revocation, auth method CRUD — require only authentication.

::: details Permission evaluation steps
1. Get user's roles in the scope (account/org/project). 2. For each role, get assigned groups. 3. For each group, get permissions. 4. Build all role–group combinations. 5. Match requested action + resource to any permission. 6. If permission has a condition, evaluate with execution context. 7. Enforce tenant isolation (resource in user's scope). Flow: `User → Roles → Groups → Permissions → Resource + Action`. Conditions: [Permission Conditions](/core-concepts/permission-conditions).
:::

---

**Related:** [Data Model](/architecture/data-model) · [Multi-Tenancy](/architecture/multi-tenancy) · [Security](/architecture/security)
