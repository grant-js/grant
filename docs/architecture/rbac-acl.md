---
title: RBAC/ACL Model
description: Comprehensive documentation of resources, actions, and role-based permissions in Grant
---

# RBAC/ACL Model

This document provides a complete mapping of resources, actions, and role-based permissions for the Grant, following standard RBAC (Role-Based Access Control) principles.

## Overview

Grant implements a multi-tenant Role-Based Access Control (RBAC) system with standard roles at different tenant levels:

**Account-Level Roles:**

- **Personal Account Owner** - Full control over personal account and resources
- **Organization Account Owner** - Full control over organization account and resources

**Organization-Level Roles:**

- **Organization Owner** - Full system control within organization scope
- **Organization Admin** - Administrative access to organizations and projects
- **Organization Dev** - Developer access with ability to create and manage resources
- **Organization Viewer** - Read-only access for viewing resources and configurations

## Authentication vs Authorization

This document covers **authorization** (what actions require specific permissions). The following operations only require **authentication** (being logged in) and are NOT covered here:

- Login, registration, session management
- Password reset and email verification
- User profile picture upload
- User session revocation
- Authentication method management (create, delete, set-primary, change-password)

## Step 1: Resources and Actions

The following tables identify all resources in the Grant and the actions that **require authorization**.

### Action Definitions

- **`read`**: Permission to access a single resource by ID (e.g., `GET /users/:id`)
- **`query`**: Permission to access a list/collection of resources (e.g., `GET /users`)

**Note**: Not all resources have both actions:

- Resources with individual read endpoints: User, Account, Organization, Organization Member, Organization Invitation, Project User, User Session, User Authentication Method
- Resources with only query endpoints: Project, Resource, Role, Group, Permission, Tag, API Key (accessed via list queries with optional `ids` filter)

### Core Resources

| Resource         | Actions                                                      | Description                                                                                 |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **User**         | `create`, `read`, `update`, `delete`, `query`, `export-data` | Individual users who can access the platform                                                |
| **Account**      | `read`, `delete`, `query`                                    | Person-centric identities that can own organizations                                        |
| **Organization** | `create`, `read`, `update`, `delete`, `query`                | Business entities that contain projects and users                                           |
| **Project**      | `create`, `update`, `delete`, `query`                        | Isolated environments for managing external system identities (no individual read endpoint) |
| **Resource**     | `create`, `update`, `delete`, `query`                        | Domain entities defined by external systems (no individual read endpoint)                   |
| **Role**         | `create`, `update`, `delete`, `query`                        | Named collections of permissions (no individual read endpoint)                              |
| **Group**        | `create`, `update`, `delete`, `query`                        | Collections of permissions that can be assigned to roles (no individual read endpoint)      |
| **Permission**   | `create`, `update`, `delete`, `query`                        | Specific actions that can be performed on resources (no individual read endpoint)           |
| **Tag**          | `create`, `update`, `delete`, `query`                        | Flexible labeling system for categorization (no individual read endpoint)                   |
| **API Key**      | `create`, `delete`, `query`, `revoke`, `exchange`            | API authentication credentials for programmatic access (no individual read endpoint)        |

### Relationship Resources

| Resource                    | Actions                                                                | Description                                 |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| **Organization Member**     | `read`, `update`, `remove`, `query`                                    | Users belonging to an organization          |
| **Organization Invitation** | `create`, `read`, `query`, `accept`, `revoke`, `resend-email`, `renew` | Invitations for users to join organizations |
| **Project User**            | `read`, `query`                                                        | Users belonging to a project                |

### Session & Authentication Resources (Authorization-Required Actions Only)

| Resource                       | Actions         | Description                                          |
| ------------------------------ | --------------- | ---------------------------------------------------- |
| **User Session**               | `read`, `query` | Active user sessions (read-only via authorization)   |
| **User Authentication Method** | `read`, `query` | Authentication methods (read-only via authorization) |

## Step 2: Roles Based on Job Functions

Grant defines roles at different tenant levels, aligned with common job functions:

### Account-Level Roles

Accounts represent a person's identity on the platform and come in two types:

#### Personal Account

- Represents an individual user's personal workspace
- Each user can have one personal account
- Type: `personal`

#### Organization Account

- Represents an organization's workspace
- Users can own organization accounts
- Type: `organization`

**Account Owner Roles**:

- **Personal Account Owner**: Full control over personal account and all its resources
  - **Use Case**: Individual users managing their personal workspace
  - **Scope**: Account-level (personal account only)
- **Organization Account Owner**: Full control over organization account and all its resources
  - **Use Case**: Organization owners managing their organization workspace
  - **Scope**: Account-level (organization account only)

**Important**: Account ownership is separate from organization ownership. A user can be:

- Owner of their personal account (Personal Account Owner)
- Owner of an organization account (Organization Account Owner)
- Member of organizations with different roles (Organization Owner, Admin, Dev, Viewer)

### Organization-Level Roles

These roles apply within an organization scope:

#### Organization Owner

**Purpose**: Full control over organization and all resources
**Use Case**: Organization owners who need complete control over their organization, projects, and all resources
**Scope**: Organization-level

#### Organization Admin

**Purpose**: Administrative access to organizations and projects
**Use Case**: Organization administrators who manage teams, users, and permissions but don't own the organization account
**Scope**: Organization-level

#### Organization Dev

**Purpose**: Developer access with resource management capabilities
**Use Case**: Developers who need to create and manage resources, roles, and permissions for application development
**Scope**: Organization-level

#### Organization Viewer

**Purpose**: Read-only access for monitoring and auditing
**Use Case**: Stakeholders, auditors, or team members who need visibility without modification rights
**Scope**: Organization-level

### Project-Level Role Inheritance

Project roles are inherited from organization membership/role:

- **Account Projects**: Always fallback to Owner role (since accounts only have Owner role)
- **Organization Projects**: Inherit role from organization membership (Owner → Owner, Admin → Admin, Dev → Dev, Viewer → Viewer)

## Step 2.5: Groups - Role + Resource Combinations

Groups serve as the bridge between roles and permissions. They are defined as **Role + Resource combinations** to create a clear mapping structure.

### Group Naming Convention

Groups follow the pattern: `{Role} {Resource}` (e.g., "Organization Owner", "Project Dev", "Account Admin")

### Standard Groups

Groups are created by combining each role with each resource type, following business criteria for each tenant level:

#### Business Criteria for Groups

**Account-Level**:

- **Only Account Owner groups exist** - Accounts have a single role (Owner) with full access
- Two account types: Personal Account Owner, Organization Account Owner
- Rationale: Each platform user has 1-2 accounts at most, and account access is not shared

**Organization-Level**:

- **All four role groups exist** - Organization members are invited with specific roles
- Rationale: Members can have different roles (Owner, Admin, Dev, Viewer) within the same organization
- Permissions are based on the role assigned during invitation

**Project-Level**:

- **All four role groups exist** - Project roles are inherited from organization membership/role
- **Account Projects**: Always fallback to Owner role (since accounts only have Owner role)
- **Organization Projects**: Inherit role from organization membership

#### Account-Level Groups

| Group Name                   | Role  | Resource | Description                                              |
| ---------------------------- | ----- | -------- | -------------------------------------------------------- |
| `Personal Account Owner`     | Owner | Account  | Full control over personal account and all resources     |
| `Organization Account Owner` | Owner | Account  | Full control over organization account and all resources |

#### Organization-Level Groups

| Group Name            | Role   | Resource     | Description                                  |
| --------------------- | ------ | ------------ | -------------------------------------------- |
| `Organization Owner`  | Owner  | Organization | Full control over organization and resources |
| `Organization Admin`  | Admin  | Organization | Administrative access to organization        |
| `Organization Dev`    | Dev    | Organization | Developer access to organization resources   |
| `Organization Viewer` | Viewer | Organization | Read-only access to organization resources   |

#### Project-Level Groups

| Group Name       | Role   | Resource | Description                             |
| ---------------- | ------ | -------- | --------------------------------------- |
| `Project Owner`  | Owner  | Project  | Full control over project and resources |
| `Project Admin`  | Admin  | Project  | Administrative access to project        |
| `Project Dev`    | Dev    | Project  | Developer access to project resources   |
| `Project Viewer` | Viewer | Project  | Read-only access to project resources   |

### Group Structure

The permission flow follows this hierarchy:

```
User → Role → Group → Permission → Resource
```

**Example Flow:**

1. User is assigned the **Organization Owner** role in an Organization scope
2. The **Organization Owner** role is linked to multiple groups (e.g., "Organization Owner", "User Owner", "Project Owner")
3. Each group contains specific permissions (e.g., "Organization Owner" group contains `create`, `read`, `update`, `delete`, `query` permissions for Organization resource)
4. When evaluating access, the system checks all role-group combinations for the user

## Step 3: Permission Mapping to Groups

Permissions are assigned to groups, which are then assigned to roles. This creates a clear separation of concerns:

1. **Permissions** define what actions can be performed on resources
2. **Groups** collect related permissions for a role-resource combination
3. **Roles** are assigned groups to grant users the appropriate permissions

### Group Categories

Groups fall into two categories:

1. **Common Groups**: Contain permissions available to all authenticated users (all roles)
2. **Role-Specific Groups**: Contain permissions specific to certain roles (Owner, Admin, Dev, Viewer)

### Common Groups (All Roles)

These groups are assigned to all roles, providing basic authenticated user permissions:

| Group Name                          | Resource                   | Permissions                  | Description                                                                   |
| ----------------------------------- | -------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `Account Common`                    | Account                    | `read`, `query`              | Basic account access for all authenticated users                              |
| `User Common`                       | User                       | `read`, `query`              | Basic user viewing for all authenticated users                                |
| `Organization Common`               | Organization               | `create`, `query`            | Basic organization access (can create and query organizations)                |
| `Project Common`                    | Project                    | `query`                      | Basic project viewing for all authenticated users                             |
| `Account Project Owner`             | Project                    | `create`, `update`, `delete` | Project management for account owners                                         |
| `Resource Common`                   | Resource                   | `query`                      | Basic resource viewing for all authenticated users                            |
| `Role Common`                       | Role                       | `query`                      | Basic role viewing for all authenticated users                                |
| `Group Common`                      | Group                      | `query`                      | Basic group viewing for all authenticated users                               |
| `Permission Common`                 | Permission                 | `query`                      | Basic permission viewing for all authenticated users                          |
| `Tag Common`                        | Tag                        | `query`                      | Basic tag viewing for all authenticated users                                 |
| `API Key Common`                    | API Key                    | `query`, `exchange`          | Basic API key access for all authenticated users                              |
| `Organization Member Common`        | Organization Member        | `read`, `query`              | Basic organization member viewing for all authenticated users                 |
| `Organization Invitation Common`    | Organization Invitation    | `read`, `query`, `accept`    | Basic organization invitation access for all authenticated users              |
| `Project User Common`               | Project User               | `read`, `query`              | Basic project user viewing for all authenticated users                        |
| `User Session Common`               | User Session               | `read`, `query`              | Basic user session viewing (own sessions only, enforced by condition)         |
| `User Authentication Method Common` | User Authentication Method | `read`, `query`              | Basic authentication method viewing (own methods only, enforced by condition) |

### Role-Specific Groups

These groups contain permissions specific to certain roles:

#### Account Groups

| Group Name                   | Resource | Permissions | Assigned To                | Description                       |
| ---------------------------- | -------- | ----------- | -------------------------- | --------------------------------- |
| `Personal Account Owner`     | Account  | `delete`    | Personal Account Owner     | Full personal account control     |
| `Organization Account Owner` | Account  | `delete`    | Organization Account Owner | Full organization account control |

#### User Groups

| Group Name    | Resource | Permissions                                 | Assigned To        | Description                                  |
| ------------- | -------- | ------------------------------------------- | ------------------ | -------------------------------------------- |
| `User Owner`  | User     | `create`, `update`, `delete`, `export-data` | Organization Owner | Full user management                         |
| `User Admin`  | User     | `create`, `update`, `delete`, `export-data` | Organization Admin | Full user management                         |
| `User Dev`    | User     | `update` (own user only)                    | Organization Dev   | Limited user management (own profile only)   |
| `User Viewer` | User     | _(no additional permissions)_               | —                  | Viewer has same user access as common groups |

#### Organization Groups

| Group Name            | Resource     | Permissions                   | Assigned To        | Description                                          |
| --------------------- | ------------ | ----------------------------- | ------------------ | ---------------------------------------------------- |
| `Organization Owner`  | Organization | `update`, `delete`            | Organization Owner | Full organization management                         |
| `Organization Admin`  | Organization | `update`, `delete`            | Organization Admin | Full organization management                         |
| `Organization Dev`    | Organization | _(no additional permissions)_ | —                  | Dev has same organization access as common groups    |
| `Organization Viewer` | Organization | _(no additional permissions)_ | —                  | Viewer has same organization access as common groups |

#### Project Groups

| Group Name       | Resource | Permissions                   | Assigned To        | Description                                     |
| ---------------- | -------- | ----------------------------- | ------------------ | ----------------------------------------------- |
| `Project Owner`  | Project  | `create`, `update`, `delete`  | Organization Owner | Full project management                         |
| `Project Admin`  | Project  | `create`, `update`, `delete`  | Organization Admin | Full project management                         |
| `Project Dev`    | Project  | `create`, `update`, `delete`  | Organization Dev   | Full project management                         |
| `Project Viewer` | Project  | _(no additional permissions)_ | —                  | Viewer has same project access as common groups |

#### Resource Groups

| Group Name        | Resource | Permissions                   | Assigned To        | Description                                      |
| ----------------- | -------- | ----------------------------- | ------------------ | ------------------------------------------------ |
| `Resource Owner`  | Resource | `create`, `update`, `delete`  | Organization Owner | Full resource management                         |
| `Resource Admin`  | Resource | `create`, `update`, `delete`  | Organization Admin | Full resource management                         |
| `Resource Dev`    | Resource | `create`, `update`, `delete`  | Organization Dev   | Full resource management                         |
| `Resource Viewer` | Resource | _(no additional permissions)_ | —                  | Viewer has same resource access as common groups |

#### Role Groups

| Group Name    | Resource | Permissions                   | Assigned To        | Description                                  |
| ------------- | -------- | ----------------------------- | ------------------ | -------------------------------------------- |
| `Role Owner`  | Role     | `create`, `update`, `delete`  | Organization Owner | Full role management                         |
| `Role Admin`  | Role     | `create`, `update`, `delete`  | Organization Admin | Full role management                         |
| `Role Dev`    | Role     | `create`, `update`, `delete`  | Organization Dev   | Full role management                         |
| `Role Viewer` | Role     | _(no additional permissions)_ | —                  | Viewer has same role access as common groups |

#### Group Groups

| Group Name     | Resource | Permissions                   | Assigned To        | Description                                   |
| -------------- | -------- | ----------------------------- | ------------------ | --------------------------------------------- |
| `Group Owner`  | Group    | `create`, `update`, `delete`  | Organization Owner | Full group management                         |
| `Group Admin`  | Group    | `create`, `update`, `delete`  | Organization Admin | Full group management                         |
| `Group Dev`    | Group    | `create`, `update`, `delete`  | Organization Dev   | Full group management                         |
| `Group Viewer` | Group    | _(no additional permissions)_ | —                  | Viewer has same group access as common groups |

#### Permission Groups

| Group Name          | Resource   | Permissions                   | Assigned To        | Description                                        |
| ------------------- | ---------- | ----------------------------- | ------------------ | -------------------------------------------------- |
| `Permission Owner`  | Permission | `create`, `update`, `delete`  | Organization Owner | Full permission management                         |
| `Permission Admin`  | Permission | `create`, `update`, `delete`  | Organization Admin | Full permission management                         |
| `Permission Dev`    | Permission | `create`, `update`, `delete`  | Organization Dev   | Full permission management                         |
| `Permission Viewer` | Permission | _(no additional permissions)_ | —                  | Viewer has same permission access as common groups |

#### Tag Groups

| Group Name   | Resource | Permissions                   | Assigned To        | Description                                 |
| ------------ | -------- | ----------------------------- | ------------------ | ------------------------------------------- |
| `Tag Owner`  | Tag      | `create`, `update`, `delete`  | Organization Owner | Full tag management (Owner only)            |
| `Tag Admin`  | Tag      | _(no additional permissions)_ | —                  | Admin cannot manage tags                    |
| `Tag Dev`    | Tag      | _(no additional permissions)_ | —                  | Dev has same tag access as common groups    |
| `Tag Viewer` | Tag      | _(no additional permissions)_ | —                  | Viewer has same tag access as common groups |

**Note**: Only Organization Owner can manage tags. Admin, Dev, and Viewer roles have read-only access via common groups.

#### API Key Groups

| Group Name       | Resource | Permissions                      | Assigned To        | Description                                     |
| ---------------- | -------- | -------------------------------- | ------------------ | ----------------------------------------------- |
| `API Key Owner`  | API Key  | `create`, `delete`, `revoke`     | Organization Owner | Full API key management                         |
| `API Key Admin`  | API Key  | `create`, `delete`, `revoke`     | Organization Admin | Full API key management                         |
| `API Key Dev`    | API Key  | `create`, `delete`\*, `revoke`\* | Organization Dev   | API key creation; delete/revoke own keys only   |
| `API Key Viewer` | API Key  | _(no additional permissions)_    | —                  | Viewer has same API key access as common groups |

\* Dev can only delete/revoke their own API keys (enforced by condition)

#### Organization Member Groups

| Group Name                   | Resource            | Permissions                   | Assigned To        | Description                                                 |
| ---------------------------- | ------------------- | ----------------------------- | ------------------ | ----------------------------------------------------------- |
| `Organization Member Owner`  | Organization Member | `update`, `remove`            | Organization Owner | Full organization member management                         |
| `Organization Member Admin`  | Organization Member | `update`, `remove`            | Organization Admin | Full organization member management                         |
| `Organization Member Dev`    | Organization Member | _(no additional permissions)_ | —                  | Dev has same organization member access as common groups    |
| `Organization Member Viewer` | Organization Member | _(no additional permissions)_ | —                  | Viewer has same organization member access as common groups |

#### Organization Invitation Groups

| Group Name                       | Resource                | Permissions                                 | Assigned To        | Description                                                     |
| -------------------------------- | ----------------------- | ------------------------------------------- | ------------------ | --------------------------------------------------------------- |
| `Organization Invitation Owner`  | Organization Invitation | `create`, `revoke`, `resend-email`, `renew` | Organization Owner | Full organization invitation management                         |
| `Organization Invitation Admin`  | Organization Invitation | `create`, `revoke`, `resend-email`, `renew` | Organization Admin | Full organization invitation management                         |
| `Organization Invitation Dev`    | Organization Invitation | _(no additional permissions)_               | —                  | Dev has same organization invitation access as common groups    |
| `Organization Invitation Viewer` | Organization Invitation | _(no additional permissions)_               | —                  | Viewer has same organization invitation access as common groups |

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

## Step 4: Permission Mapping to Roles (via Groups)

The following tables map each action to the roles that have permission to perform it.

### Core Resource Permissions

#### User Permissions

| Action        | Resource | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| ------------- | -------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `create`      | `user`   |         ✅         |         ✅         |        ❌        |         ❌          |
| `read`        | `user`   |         ✅         |         ✅         |        ✅        |         ✅          |
| `update`      | `user`   |         ✅         |         ✅         |       ✅\*       |         ❌          |
| `delete`      | `user`   |         ✅         |         ✅         |        ❌        |         ❌          |
| `query`       | `user`   |         ✅         |         ✅         |        ✅        |         ✅          |
| `export-data` | `user`   |         ✅         |         ✅         |        ❌        |         ❌          |

\* Dev can only update their own user record

#### Account Permissions

| Action   | Resource  | Personal Account Owner | Organization Account Owner |
| -------- | --------- | :--------------------: | :------------------------: |
| `read`   | `account` |           ✅           |             ✅             |
| `delete` | `account` |           ✅           |             ✅             |
| `query`  | `account` |           ✅           |             ✅             |

#### Organization Permissions

| Action   | Resource       | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| -------- | -------------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `create` | `organization` |         ✅         |         ✅         |        ✅        |         ✅          |
| `update` | `organization` |         ✅         |         ✅         |        ❌        |         ❌          |
| `delete` | `organization` |         ✅         |         ✅         |        ❌        |         ❌          |
| `query`  | `organization` |         ✅         |         ✅         |        ✅        |         ✅          |

**Note**: Organization `read` is enforced by scope (users can only read organizations they belong to).

#### Project Permissions

| Action   | Resource  | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| -------- | --------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `create` | `project` |         ✅         |         ✅         |        ✅        |         ❌          |
| `update` | `project` |         ✅         |         ✅         |        ✅        |         ❌          |
| `delete` | `project` |         ✅         |         ✅         |        ✅        |         ❌          |
| `query`  | `project` |         ✅         |         ✅         |        ✅        |         ✅          |

#### Resource Permissions

| Action   | Resource   | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| -------- | ---------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `create` | `resource` |         ✅         |         ✅         |        ✅        |         ❌          |
| `update` | `resource` |         ✅         |         ✅         |        ✅        |         ❌          |
| `delete` | `resource` |         ✅         |         ✅         |        ✅        |         ❌          |
| `query`  | `resource` |         ✅         |         ✅         |        ✅        |         ✅          |

#### Role Permissions

| Action   | Resource | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| -------- | -------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `create` | `role`   |         ✅         |         ✅         |        ✅        |         ❌          |
| `update` | `role`   |         ✅         |         ✅         |        ✅        |         ❌          |
| `delete` | `role`   |         ✅         |         ✅         |        ✅        |         ❌          |
| `query`  | `role`   |         ✅         |         ✅         |        ✅        |         ✅          |

#### Group Permissions

| Action   | Resource | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| -------- | -------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `create` | `group`  |         ✅         |         ✅         |        ✅        |         ❌          |
| `update` | `group`  |         ✅         |         ✅         |        ✅        |         ❌          |
| `delete` | `group`  |         ✅         |         ✅         |        ✅        |         ❌          |
| `query`  | `group`  |         ✅         |         ✅         |        ✅        |         ✅          |

#### Permission Permissions

| Action   | Resource     | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| -------- | ------------ | :----------------: | :----------------: | :--------------: | :-----------------: |
| `create` | `permission` |         ✅         |         ✅         |        ✅        |         ❌          |
| `update` | `permission` |         ✅         |         ✅         |        ✅        |         ❌          |
| `delete` | `permission` |         ✅         |         ✅         |        ✅        |         ❌          |
| `query`  | `permission` |         ✅         |         ✅         |        ✅        |         ✅          |

#### Tag Permissions

| Action   | Resource | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| -------- | -------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `create` | `tag`    |         ✅         |         ❌         |        ❌        |         ❌          |
| `update` | `tag`    |         ✅         |         ❌         |        ❌        |         ❌          |
| `delete` | `tag`    |         ✅         |         ❌         |        ❌        |         ❌          |
| `query`  | `tag`    |         ✅         |         ✅         |        ✅        |         ✅          |

**Note**: Only Organization Owner can manage tags.

#### API Key Permissions

| Action     | Resource  | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| ---------- | --------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `create`   | `api-key` |         ✅         |         ✅         |        ✅        |         ❌          |
| `delete`   | `api-key` |         ✅         |         ✅         |       ✅\*       |         ❌          |
| `query`    | `api-key` |         ✅         |         ✅         |        ✅        |         ✅          |
| `revoke`   | `api-key` |         ✅         |         ✅         |       ✅\*       |         ❌          |
| `exchange` | `api-key` |         ✅         |         ✅         |        ✅        |         ✅          |

\* Dev can only delete/revoke their own API keys

### Relationship Permissions

#### Organization Member Permissions

| Action   | Resource              | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| -------- | --------------------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `read`   | `organization-member` |         ✅         |         ✅         |        ✅        |         ✅          |
| `update` | `organization-member` |         ✅         |         ✅         |        ❌        |         ❌          |
| `remove` | `organization-member` |         ✅         |         ✅         |        ❌        |         ❌          |
| `query`  | `organization-member` |         ✅         |         ✅         |        ✅        |         ✅          |

#### Organization Invitation Permissions

| Action         | Resource                  | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| -------------- | ------------------------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `create`       | `organization-invitation` |         ✅         |         ✅         |        ❌        |         ❌          |
| `read`         | `organization-invitation` |         ✅         |         ✅         |        ✅        |         ✅          |
| `query`        | `organization-invitation` |         ✅         |         ✅         |        ✅        |         ✅          |
| `accept`       | `organization-invitation` |         ✅         |         ✅         |        ✅        |         ✅          |
| `revoke`       | `organization-invitation` |         ✅         |         ✅         |        ❌        |         ❌          |
| `resend-email` | `organization-invitation` |         ✅         |         ✅         |        ❌        |         ❌          |
| `renew`        | `organization-invitation` |         ✅         |         ✅         |        ❌        |         ❌          |

#### Project User Permissions

| Action  | Resource       | Organization Owner | Organization Admin | Organization Dev | Organization Viewer |
| ------- | -------------- | :----------------: | :----------------: | :--------------: | :-----------------: |
| `read`  | `project-user` |         ✅         |         ✅         |        ✅        |         ✅          |
| `query` | `project-user` |         ✅         |         ✅         |        ✅        |         ✅          |

### Session & Authentication Permissions (Authorization-Required Only)

#### User Session Permissions

| Action  | Resource       | All Roles |
| ------- | -------------- | :-------: |
| `read`  | `user-session` |   ✅\*    |
| `query` | `user-session` |   ✅\*    |

\* Users can only read/query their own sessions (enforced by condition)

#### User Authentication Method Permissions

| Action  | Resource                     | All Roles |
| ------- | ---------------------------- | :-------: |
| `read`  | `user-authentication-method` |   ✅\*    |
| `query` | `user-authentication-method` |   ✅\*    |

\* Users can only read/query their own authentication methods (enforced by condition)

## Permission Naming Convention

Permissions are stored with separate `action` and `resourceId` columns in the database:

- **Action**: The operation being performed in kebab-case (e.g., `create`, `read`, `update`, `delete`, `query`, `export-data`)
- **ResourceId**: The ID of the resource entity being acted upon (references the `resources` table)

### Action Format

All actions use kebab-case naming:

- `create`, `read`, `update`, `delete`, `query` - Standard CRUD operations
- `export-data` - Export user data (GDPR compliance)
- `renew` - Renew organization invitation
- `remove` - Remove organization member
- `accept`, `revoke`, `resend-email` - Organization invitation operations
- `revoke`, `exchange` - API key operations

### Resource Identification

Resources are identified by their ID in the `resources` table. The resource name/slug (e.g., `user`, `project`, `organization`) is stored in the `resources` table and referenced via `resourceId` in the `permissions` table.

Examples:

- `action: create`, `resourceId: <user-resource-id>` - Permission to create users
- `action: query`, `resourceId: <project-resource-id>` - Permission to query projects
- `action: remove`, `resourceId: <organization-member-resource-id>` - Permission to remove organization members

## Multi-Tenant Scope

All permissions are evaluated within the context of the multi-tenant scope:

- **Account Scope**: Actions affecting the account level (account read, deletion)
- **Organization Scope**: Actions within an organization (organization management, members, invitations)
- **Project Scope**: Actions within a project (project resources, roles, permissions)

Users can only perform actions on resources within their accessible scopes based on their role assignments.

## Implementation Notes

### Role Hierarchy

While Grant currently implements a flat role model, the permission mapping above follows a hierarchical pattern where:

- **Owner** has all permissions (superset of Admin)
- **Admin** has administrative permissions (superset of Dev, except for Tags)
- **Dev** has development permissions (superset of Viewer)
- **Viewer** has read-only permissions

This allows for future implementation of role hierarchies if needed.

### Self-Management Permissions

Certain permissions are scoped to self-management via conditions:

- Developers can update their own user profile (`update` action on `user` resource with condition)
- Users can read their own sessions (`read`, `query` actions on `user-session` resource with condition)
- Users can read their own authentication methods (`read`, `query` actions on `user-authentication-method` resource with condition)
- Developers can manage their own API keys (`delete`, `revoke` actions on `api-key` resource with condition)

### Authentication-Only Operations (No Authorization Required)

The following operations only require authentication and are handled separately from the RBAC system:

- **User Profile Picture**: Upload own profile picture
- **User Session Management**: Revoke own sessions
- **Authentication Methods**: Create, delete, set-primary, change-password for own methods
- **Auth Operations**: Login, register, refresh-session, verify-email, resend-verification, request-password-reset, reset-password, me

### Permission Evaluation

When evaluating permissions, the system follows this flow:

1. **Get User Roles**: Retrieve all roles assigned to the user in the appropriate scope (account/organization/project)
2. **Get Role Groups**: For each role, retrieve all groups assigned to that role (e.g., "Organization Owner", "User Admin", "Project Dev")
3. **Get Group Permissions**: For each group, retrieve all permissions assigned to that group
4. **Generate Combinations**: Create all possible role-group combinations for the user
5. **Match Permissions**: Check if any permission matches the requested action and resource
6. **Evaluate Conditions**: If a matching permission has a condition, evaluate it with the execution context (user metadata, resource data, etc.)
7. **Enforce Isolation**: Enforce multi-tenant isolation (users can only access resources within their accessible scopes)

**Evaluation Flow:**

```
User → [Role1, Role2, ...] → [Group1, Group2, ...] → [Permission1, Permission2, ...] → Resource + Action
```

**Key Points:**

- The system evaluates **all role-group combinations** for a user, ensuring comprehensive permission checking
- Conditions are evaluated with execution context (user metadata, resource data) provided at evaluation time
- Permissions without conditions are granted immediately if matched
- Permissions with conditions must pass condition evaluation before access is granted

---

## Implementation Status

✅ **All permission guards have been implemented** across the Grant web application. All UI components that interact with protected GraphQL operations now use the `useGrant` hook from `@grantjs/client` to conditionally render based on user permissions.

**Key Implementation Details**:

- All query hooks in viewer components are guarded
- All mutation hooks in action components and dialogs are guarded
- User detail page features (image upload, name editing, role/tag management) are properly guarded
- Role hierarchy validation is enforced both in frontend and backend
- Project-scoped resources use `useScopeFromParams()` for correct tenant type detection

**Related Documentation:**

- [Data Model](/architecture/data-model) - Database schema and entity relationships
- [Multi-Tenancy](/architecture/multi-tenancy) - Multi-tenant isolation and scoping
- [Security](/architecture/security) - Security architecture and best practices
- [ACL Engine Implementation](/implementation-plans/acl-engine) - Authorization engine implementation details
