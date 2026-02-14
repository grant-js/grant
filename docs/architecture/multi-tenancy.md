---
title: Multi-Tenancy
description: Account-based multi-tenancy with organization and project isolation
---

# Multi-Tenancy Platform Specification

This document outlines the multi-tenancy architecture for the Identity Management Platform, designed to manage users, roles, groups, and permissions for external systems and integrations.

## Core Concepts

### Platform Purpose

The platform serves as an **identity management service** that manages user identities, roles, groups, and permissions for **external systems and integrations**. It provides centralized identity management for multiple organizations and their integration environments.

### Key Entities

#### 1. **Account** (Person's Identity)

- Represents a **person** who can access projects
- Has an **owner** (User) and a **type** (personal or organization)
- Can access multiple projects via the `AccountProject` pivot table
- **Top-level entity** in the platform

#### 2. **User**

- Represents a person in the system
- Can belong to multiple organizations via `OrganizationUser` pivot
- Can belong to multiple projects via `ProjectUser` pivot
- Can own multiple accounts
- Has roles assigned via `UserRole` pivot

#### 3. **Organization**

- Groups related projects and users
- Contains projects via `OrganizationProject` pivot
- Contains users via `OrganizationUser` pivot
- Has roles, groups, and permissions scoped to the organization
- **Management container** for related projects

#### 4. **Project** (Integration Environment)

- **Isolated environment** for managing identities
- Contains users, roles, groups, and permissions scoped to the project
- Relates to organizations via `OrganizationProject` pivot (not direct field)
- Each project manages identity data independently
- **No cross-project inheritance** - each project is independent

#### 5. **Roles, Groups, and Permissions**

- **Roles**: Scoped to either organizations (via `OrganizationRole`) or projects (via `ProjectRole`)
- **Groups**: Scoped to organizations or projects, contain permissions via `GroupPermission`
- **Permissions**: Define actions that can be performed, linked to resources
- These entities are not "external" or "system" - they're simply scoped to a specific context (organization or project)

## Architecture Diagram

```
User (Person)
├── Accounts (owned by user)
│   └── Account (type: personal/organization)
│       └── Projects (via AccountProject)
├── Organizations (via OrganizationUser)
│   └── Organization
│       ├── Projects (via OrganizationProject)
│       ├── Roles (via OrganizationRole)
│       ├── Groups (via OrganizationGroup)
│       ├── Permissions (via OrganizationPermission)
│       └── Users (via OrganizationUser)
└── Projects (via ProjectUser)
    └── Project
        ├── Users (via ProjectUser)
        ├── Roles (via ProjectRole)
        ├── Groups (via ProjectGroup)
        ├── Permissions (via ProjectPermission)
        └── Resources
```

## Entity Relationships

### Core Relationships

```
User ←→ Account (Account.ownerId → User.id)
Account ←→ Project (via AccountProject pivot)
Organization ←→ Project (via OrganizationProject pivot)
Organization ←→ User (via OrganizationUser pivot)
Project ←→ User (via ProjectUser pivot)
Project ←→ Role (via ProjectRole pivot)
Project ←→ Group (via ProjectGroup pivot)
Project ←→ Permission (via ProjectPermission pivot)
Organization ←→ Role (via OrganizationRole pivot)
Organization ←→ Group (via OrganizationGroup pivot)
Organization ←→ Permission (via OrganizationPermission pivot)
User ←→ Role (via UserRole pivot)
Role ←→ Group (via RoleGroup pivot)
Group ←→ Permission (via GroupPermission pivot)
```

### Pivot Tables

#### AccountProject

Links accounts to projects they can access.

```graphql
type AccountProject implements Auditable {
  id: ID!
  accountId: ID!
  projectId: ID!
  account: Account!
  project: Project!
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

#### OrganizationProject

Links organizations to their projects.

```graphql
type OrganizationProject implements Auditable {
  id: ID!
  organizationId: ID!
  projectId: ID!
  organization: Organization!
  project: Project!
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

#### OrganizationUser

Links users to organizations they belong to.

```graphql
type OrganizationUser implements Auditable {
  id: ID!
  organizationId: ID!
  userId: ID!
  organization: Organization!
  user: User!
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

#### ProjectUser

Links users to projects they are part of.

```graphql
type ProjectUser implements Auditable {
  id: ID!
  projectId: ID!
  userId: ID!
  project: Project!
  user: User!
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

#### ProjectRole, OrganizationRole

Roles are scoped to either projects or organizations via pivot tables:

```graphql
type ProjectRole implements Auditable {
  id: ID!
  projectId: ID!
  roleId: ID!
  project: Project!
  role: Role!
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}

type OrganizationRole implements Auditable {
  id: ID!
  organizationId: ID!
  roleId: ID!
  organization: Organization!
  role: Role!
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

#### UserRole

Links users to roles (roles can be scoped to projects or organizations).

```graphql
type UserRole implements Auditable {
  id: ID!
  userId: ID!
  roleId: ID!
  user: User!
  role: Role!
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

#### RoleGroup, GroupPermission

Groups and permissions are linked via pivot tables:

```graphql
type RoleGroup implements Auditable {
  id: ID!
  roleId: ID!
  groupId: ID!
  role: Role!
  group: Group!
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}

type GroupPermission implements Auditable {
  id: ID!
  groupId: ID!
  permissionId: ID!
  group: Group!
  permission: Permission!
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

## Schema Definitions

### Account Schema

Accounts represent a person's identity on the platform. Each account has an owner (User) and a type (personal or organization).

```graphql
type Account implements Auditable {
  id: ID!
  type: AccountType! # 'personal' | 'organization'
  ownerId: ID!
  owner: User!
  projects: [Project!] # via AccountProject
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

### User Schema

Users represent people in the system. They can belong to multiple organizations and projects, and can own accounts.

```graphql
type User implements Auditable {
  id: ID!
  name: String!
  pictureUrl: String
  metadata: JSON
  roles: [Role!] # via UserRole
  tags: [Tag!]
  authenticationMethods: [UserAuthenticationMethod!]
  accounts: [Account!] # Accounts owned by this user
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

### Organization Schema

Organizations group related projects and users. They contain roles, groups, permissions, and users scoped to the organization.

```graphql
type Organization implements Auditable {
  id: ID!
  name: String!
  slug: String!
  projects: [Project!] # via OrganizationProject
  roles: [Role!] # via OrganizationRole
  groups: [Group!] # via OrganizationGroup
  permissions: [Permission!] # via OrganizationPermission
  users: [User!] # via OrganizationUser
  tags: [Tag!]
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

### Project Schema

Projects are isolated environments for managing identities. They contain users, roles, groups, permissions, and resources scoped to the project.

```graphql
type Project implements Auditable {
  id: ID!
  name: String!
  slug: String!
  description: String
  roles: [Role!] # via ProjectRole
  groups: [Group!] # via ProjectGroup
  permissions: [Permission!] # via ProjectPermission
  users: [User!] # via ProjectUser
  resources: [Resource!]
  tags: [Tag!]
  organizationTags: [Tag!]
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

**Note:** Projects relate to organizations via the `OrganizationProject` pivot table, not through a direct `organizationId` field. The relationship is accessed through the organization's `projects` field or project's organization via the pivot.

### Role Schema

Roles are scoped to either organizations or projects via pivot tables. They are not "external" or "system" roles - they're simply roles that exist in a specific context.

```graphql
type Role implements Auditable {
  id: ID!
  name: String!
  description: String
  metadata: JSON
  groups: [Group!] # via RoleGroup
  tags: [Tag!]
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

### Group Schema

Groups are scoped to organizations or projects and contain permissions.

```graphql
type Group implements Auditable {
  id: ID!
  name: String!
  description: String
  metadata: JSON
  permissions: [Permission!] # via GroupPermission
  tags: [Tag!]
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

### Permission Schema

Permissions define what actions can be performed. They are linked to resources and can be scoped to organizations or projects.

```graphql
type Permission implements Auditable {
  id: ID!
  name: String!
  description: String
  action: String!
  resourceId: ID
  resource: Resource
  condition: JSON
  tags: [Tag!]
  createdAt: Date!
  updatedAt: Date!
  deletedAt: Date
}
```

## URL Structure

All routes are prefixed with `/[locale]/dashboard/` where `[locale]` is the language code (e.g., `en`, `pt`).

### Account Management

```
/[locale]/dashboard/account
/[locale]/dashboard/accounts/[accountId]
/[locale]/dashboard/accounts/[accountId]/projects
/[locale]/dashboard/settings
/[locale]/dashboard/settings/account
/[locale]/dashboard/settings/profile
/[locale]/dashboard/settings/preferences
/[locale]/dashboard/settings/privacy
/[locale]/dashboard/settings/security
```

### Organization Management

```
/[locale]/dashboard/organizations
/[locale]/dashboard/organizations/[organizationId]
/[locale]/dashboard/organizations/[organizationId]/projects
/[locale]/dashboard/organizations/[organizationId]/members
/[locale]/dashboard/organizations/[organizationId]/roles
/[locale]/dashboard/organizations/[organizationId]/groups
/[locale]/dashboard/organizations/[organizationId]/permissions
/[locale]/dashboard/organizations/[organizationId]/tags
```

**Note:** The organization detail page (`/[locale]/dashboard/organizations/[organizationId]`) automatically redirects to the projects list.

### Project Management (Organization Projects)

```
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/users
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/users/[userId]
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/roles
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/groups
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/permissions
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/resources
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/tags
```

**Note:** The project detail page (`/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]`) automatically redirects to the users list.

### Project Management (Personal Account Projects)

Personal accounts can also have projects accessed via:

```
/[locale]/dashboard/accounts/[accountId]/projects
/[locale]/dashboard/accounts/[accountId]/projects/[projectId]
/[locale]/dashboard/accounts/[accountId]/projects/[projectId]/users
/[locale]/dashboard/accounts/[accountId]/projects/[projectId]/users/[userId]
/[locale]/dashboard/accounts/[accountId]/projects/[projectId]/roles
/[locale]/dashboard/accounts/[accountId]/projects/[projectId]/groups
/[locale]/dashboard/accounts/[accountId]/projects/[projectId]/permissions
/[locale]/dashboard/accounts/[accountId]/projects/[projectId]/resources
/[locale]/dashboard/accounts/[accountId]/projects/[projectId]/tags
```

**Note:** The project detail page for personal accounts also redirects to the users list.

### Route Parameters

- **`[locale]`**: Language code (e.g., `en`, `pt`)
- **`[organizationId]`**: Organization UUID (not slug)
- **`[projectId]`**: Project UUID (not slug)
- **`[accountId]`**: Account UUID (not slug)
- **`[userId]`**: User UUID (not slug)

## Use Case Examples

### Example 1: Multi-Organization User

```
User: "Alice Johnson"
├── Accounts:
│   └── Account (type: personal, owner: Alice)
│       └── Projects: ["Acme CRM Integration", "Beta Analytics"]
├── Organizations:
│   ├── Organization: "Acme Corp"
│   │   ├── Projects (via OrganizationProject):
│   │   │   ├── "Acme CRM Integration"
│   │   │   │   ├── Users (via ProjectUser): [Alice, John, Jane]
│   │   │   │   ├── Roles (via ProjectRole): [CRM Admin, CRM User]
│   │   │   │   └── Groups (via ProjectGroup): [Sales, Support]
│   │   │   └── "Acme ERP Integration"
│   │   ├── Roles (via OrganizationRole): [Org Admin, Org Member]
│   │   └── Users (via OrganizationUser): [Alice, Bob, Carol]
│   └── Organization: "Beta Corp"
│       ├── Projects: ["Beta CRM Integration"]
│       └── Users: [Alice, David]
└── Projects (direct access via ProjectUser):
    └── "Acme CRM Integration"
        └── Roles (via UserRole): [CRM Admin]
```

### Example 2: Project Isolation

```
Organization: "TechCorp"
├── Projects (via OrganizationProject):
│   ├── Project: "Production CRM"
│   │   ├── Users (via ProjectUser): 50 users
│   │   ├── Roles (via ProjectRole): Admin, Developer, Support, Viewer
│   │   ├── Groups (via ProjectGroup): Sales, Support, Development
│   │   └── Permissions (via ProjectPermission): [read, write, delete]
│   └── Project: "Staging CRM"
│       ├── Users (via ProjectUser): 10 users
│       ├── Roles (via ProjectRole): Admin, Developer
│       └── Groups (via ProjectGroup): Development
└── Users (via OrganizationUser): [Team members]
```

## Security Model

### Access Control Levels

1. **Account Level**: Accounts can access projects via `AccountProject` pivot
2. **Organization Level**: Users belong to organizations via `OrganizationUser`, roles/groups/permissions scoped to organizations
3. **Project Level**: Users belong to projects via `ProjectUser`, roles/groups/permissions scoped to projects

### Security Principles

- **Least Privilege**: Users have minimum required access
- **Explicit Access**: All access must be explicitly granted
- **Isolation**: Projects are completely isolated from each other
- **Audit Trail**: All access and changes are logged

### Validation Rules

1. **Account-Project**: Accounts access projects via `AccountProject` pivot table
2. **Organization-Project**: Projects relate to organizations via `OrganizationProject` pivot (not direct field)
3. **User-Project**: Users belong to projects via `ProjectUser` pivot table
4. **User-Organization**: Users belong to organizations via `OrganizationUser` pivot table
5. **Role Scoping**: Roles are scoped to either organizations (via `OrganizationRole`) or projects (via `ProjectRole`), not both
6. **No Inheritance**: No automatic role or permission inheritance across projects or organizations

## Benefits

### For Platform Users

- **Centralized Management**: Manage multiple organizations and projects from one account
- **Flexible Access**: Different roles per organization and project
- **Clear Separation**: Organization-level vs. project-level entity scoping
- **Scalable**: Support for multiple organizations and projects

### For Identity Management

- **Isolated Environments**: Each project is completely independent
- **Flexible Roles**: Define roles scoped to organizations or projects
- **Secure Access**: Explicit access control via pivot tables with audit trails
- **API Integration**: Standardized APIs for integration with external systems

## Background jobs and tenant context

Async jobs that act on tenant-scoped data must receive and validate tenant/scope so that context is never lost and cross-tenant actions are prevented. **Use cases:** recurring platform-wide work (e.g. data retention) → scheduled jobs, no scope; one-off work triggered by a user (e.g. export, report) → enqueue from the request handler with `scope` from auth. Grant follows a single pattern for this:

- **Job payload:** Execution context may include optional `scope` (`{ tenant, id }`) and `payload`. For tenant-scoped jobs, scope is required and must come from the authenticated context when the job is enqueued.
- **Validation:** Tenant-scoped jobs must call `validateTenantJobContext(context, true)` at the start of execution; jobs missing or invalid scope are rejected.
- **Enqueue from handlers:** When enqueueing jobs from REST/GraphQL handlers, always pass `scope` from the authenticated request context (e.g. `req.context.scope`), never from client input. Scope is the tenant (type + id).

See [Job Scheduling & Background Tasks](/advanced-topics/job-scheduling#6-background-jobs-and-tenant-context) for types, examples, and the enqueue API.

## Technical Considerations

### Database Design

- All entities include audit fields (createdAt, updatedAt)
- Pivot tables include validation fields (organizationId for cross-validation)
- Indexes on frequently queried fields (accountId, projectId, organizationId)

### API Design

- RESTful endpoints following the URL structure
- GraphQL queries scoped by account/organization/project context
- Consistent error handling and validation

### Performance

- Efficient queries with proper indexing
- Caching for frequently accessed data
- Pagination for large datasets

### Scalability

- Horizontal scaling support
- Multi-region deployment capability
- Database sharding strategies for large datasets

## Migration Path

### From Current System

1. **Add Account entity**: Create accounts for existing users
2. **Add Organization entity**: Create default organization
3. **Add Project entity**: Create default project
4. **Migrate existing data**: Move current users/roles to project-scoped entities via pivot tables
5. **Update UI**: Implement new navigation and interfaces

### Data Migration Strategy

1. **Backup existing data**
2. **Create new schema structure**
3. **Migrate data with validation**
4. **Update application code**
5. **Deploy with rollback plan**

## Database-Level Isolation (Row-Level Security)

In addition to application-level scope enforcement, the platform uses PostgreSQL Row-Level Security (RLS) on all 21 tenant-scoped pivot tables as defense in depth. Pivot tables are the tenant boundary — they link shared/core entities (users, roles, groups, permissions, resources, tags) to specific organizations, projects, or accounts.

**Key design decisions:**

- **Pivot-only RLS:** Core tables do not have RLS. A core row (e.g. a `user` or `role`) is only visible through a pivot join. If the pivot is filtered by RLS, the core row is invisible by construction.
- **Session variables:** Each scoped request sets `app.current_organization_id`, `app.current_project_id`, and/or `app.current_account_id` inside a transaction-scoped `SET LOCAL`. Policies compare the pivot's tenant column against the corresponding session variable.
- **Role switching:** Scoped requests `SET LOCAL ROLE grant_app_restricted` (a non-login role without `BYPASSRLS`). The table owner (`grant_user`) bypasses RLS, so system operations and background jobs are unaffected.
- **Mixed-scope policies:** Tables with both `organization_id` and `project_id` (e.g. `organization_projects`) filter by org always and by project only when the session variable is set — allowing org-scoped requests to see all projects within the org.

See [Phase 4 RLS Evaluation](../implementation-plans/phase-4-rls-evaluation.md) for the full implementation details and [Security - Row-Level Security](./security.md#row-level-security-rls) for configuration.

## Conclusion

This multi-tenancy architecture provides a robust, scalable foundation for identity management across multiple organizations and projects. The clear separation between organization-level and project-level entities ensures security and flexibility while maintaining simplicity for end users.

The architecture supports:

- **User-centric design** with users owning accounts and belonging to organizations/projects
- **Isolated project environments** for secure identity management
- **Flexible scoping** with roles, groups, and permissions scoped to organizations or projects
- **Explicit access control** via pivot tables with comprehensive audit trails
- **Scalable design** for growth and expansion
- **Clear separation** between organization-level and project-level entities

---

**Next:** Learn about the [RBAC/ACL System](/architecture/rbac-acl) to understand how permissions work.
