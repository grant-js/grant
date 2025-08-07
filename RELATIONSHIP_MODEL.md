# Relationship Model & Natural Hierarchies

## Overview

This document outlines the relationship model and natural hierarchies for our multi-tenant identity central SaaS platform. The system uses a pure entity approach with pivot tables for scoping, where permissions are defined through action-based scoping.

## Core Principles

### 1. Entity Purity

- Core entities (User, Role, Group, Permission, Organization, Project) remain pure and reusable
- No scope fields are added to core entities
- Scoping is handled through pivot tables

### 2. Action-Based Permission Scoping

- Permissions define their scope through their action names
- No abstract hierarchy - natural relationships define access levels
- Permission actions follow the pattern: `{scope}:{action}`

### 3. Natural Hierarchy

The hierarchy is defined by the natural relationships between entities:

```
Organization
├── Projects
│   ├── Users (project-scoped)
│   ├── Roles (project-scoped)
│   ├── Groups (project-scoped)
│   └── Permissions (project-scoped)
├── Users (organization-scoped)
├── Roles (organization-scoped)
├── Groups (organization-scoped)
└── Permissions (organization-scoped)
```

## Entity Relationships

### Core Entities (Pure)

#### User

- Pure entity with no scope fields
- Can be associated with multiple organizations and projects
- Relationships defined through pivot tables

#### Role

- Pure entity with no scope fields
- Can be used at organization or project level
- Relationships defined through pivot tables

#### Group

- Pure entity with no scope fields
- Contains permissions that define access
- Relationships defined through pivot tables

#### Permission

- Pure entity with no scope fields
- Action field defines scope (e.g., `organization:update`, `projectUser:create`)
- Relationships defined through pivot tables

#### Organization

- Pure entity representing a tenant
- Contains projects and organization-scoped resources

#### Project

- Pure entity representing a project within an organization
- Contains project-scoped resources

### Pivot Tables (Scoping)

#### Organization-Level Pivots

- `OrganizationUser` - Links users to organizations
- `OrganizationRole` - Links roles to organizations
- `OrganizationGroup` - Links groups to organizations
- `OrganizationProject` - Links projects to organizations

#### Project-Level Pivots

- `ProjectUser` - Links users to projects
- `ProjectRole` - Links roles to projects
- `ProjectGroup` - Links groups to projects

#### Standard RBAC Pivots

- `UserRole` - Links users to roles
- `RoleGroup` - Links roles to groups
- `GroupPermission` - Links groups to permissions
- `UserTag` - Links users to tags
- `RoleTag` - Links roles to tags
- `GroupTag` - Links groups to tags
- `PermissionTag` - Links permissions to tags

## Permission Action Scoping

### Organization-Level Permissions

```
organization:read
organization:update
organization:delete
organizationUser:create
organizationUser:read
organizationUser:update
organizationUser:delete
organizationRole:create
organizationRole:read
organizationRole:update
organizationRole:delete
organizationGroup:create
organizationGroup:read
organizationGroup:update
organizationGroup:delete
project:create
project:read
project:update
project:delete
billing:read
billing:update
```

### Project-Level Permissions

```
projectUser:create
projectUser:read
projectUser:update
projectUser:delete
projectRole:create
projectRole:read
projectRole:update
projectRole:delete
projectGroup:create
projectGroup:read
projectGroup:update
projectGroup:delete
user:create
user:read
user:update
user:delete
role:create
role:read
role:update
role:delete
group:create
group:read
group:update
group:delete
permission:create
permission:read
permission:update
permission:delete
```

## Role Templates

### Organization-Level Roles

#### Owner

- **Description**: Can do everything at max level in an organization
- **Groups**: Owner Group, Admin Group, Dev Group
- **Permissions**: `organization:*`, `billing:*`, `project:*`

#### Admin

- **Description**: Can invite members to join, change their role and manage projects
- **Groups**: Admin Group, Dev Group
- **Permissions**: `organizationUser:*`, `project:*`

#### Member

- **Description**: Basic organization member
- **Groups**: Member Group
- **Permissions**: `organization:read`, `project:read`

### Project-Level Roles

#### Project Admin

- **Description**: Can manage users, roles, groups and permissions inside projects
- **Groups**: Project Admin Group
- **Permissions**: `projectUser:*`, `user:*`, `role:*`, `group:*`, `permission:*`

#### Developer

- **Description**: Can create users, roles, groups and permissions inside projects
- **Groups**: Developer Group
- **Permissions**: `user:read`, `user:create`, `user:update`, `role:read`, `group:read`

#### Viewer

- **Description**: Read-only access to project resources
- **Groups**: Viewer Group
- **Permissions**: `user:read`, `role:read`, `group:read`

## Group Templates

### Organization-Level Groups

#### Owner Group

- **Description**: Has owner level permissions
- **Permissions**: `organization:*`, `billing:*`, `project:*`

#### Admin Group

- **Description**: Has admin level permissions
- **Permissions**: `organizationUser:*`, `project:*`

#### Member Group

- **Description**: Basic member permissions
- **Permissions**: `organization:read`, `project:read`

### Project-Level Groups

#### Project Admin Group

- **Description**: Has project administration permissions
- **Permissions**: `projectUser:*`, `user:*`, `role:*`, `group:*`, `permission:*`

#### Developer Group

- **Description**: Has development permissions
- **Permissions**: `user:read`, `user:create`, `user:update`, `role:read`, `group:read`

#### Viewer Group

- **Description**: Has read-only permissions
- **Permissions**: `user:read`, `role:read`, `group:read`

## Setup Workflows

### Organization Creation

1. Create organization entity
2. Create organization-level roles (Owner, Admin, Member)
3. Create organization-level groups (Owner Group, Admin Group, Member Group)
4. Link roles to organization via `OrganizationRole` pivots
5. Link groups to organization via `OrganizationGroup` pivots
6. Assign groups to roles via `RoleGroup` pivots
7. Add permissions to groups via `GroupPermission` pivots
8. Create initial owner user and assign to Owner role

### Project Creation

1. Create project entity
2. Link project to organization via `OrganizationProject` pivot
3. Create project-level roles (Project Admin, Developer, Viewer)
4. Create project-level groups (Project Admin Group, Developer Group, Viewer Group)
5. Link roles to project via `ProjectRole` pivots
6. Link groups to project via `ProjectGroup` pivots
7. Assign groups to roles via `RoleGroup` pivots
8. Add permissions to groups via `GroupPermission` pivots

## Permission Resolution

### User Permission Resolution

1. Get user's organization roles via `OrganizationRole` pivots
2. Get user's project roles via `ProjectRole` pivots (if project specified)
3. For each role, get associated groups via `RoleGroup` pivots
4. For each group, get permissions via `GroupPermission` pivots
5. Combine all permissions and return unique set

### Access Control

- Check if user has required permission action
- Support wildcard permissions (e.g., `user:*` matches all user actions)
- Support system-wide permissions (e.g., `*:*` matches all actions)

## Security Considerations

### Privilege Escalation Prevention

- Users can only manage resources at or below their permission level
- Project-level users cannot modify organization-level resources
- Organization-level users cannot modify system-level resources

### Audit Trail

- All pivot table relationships provide clear audit trail
- Permission changes are tracked through `GroupPermission` pivots
- User role assignments are tracked through `UserRole` pivots

## Benefits

### 1. Entity Purity

- Core entities remain clean and reusable
- No scope pollution in entity definitions
- Easy to extend with new scopes

### 2. Natural Hierarchy

- Relationships define access levels
- No abstract taxonomies
- Intuitive for developers

### 3. Flexible Scoping

- Easy to add new scopes (team, department, etc.)
- Permission actions clearly define scope
- No complex inheritance rules

### 4. Performance

- Pivot tables can be optimized with indexes
- Permission resolution is straightforward
- Clear separation of concerns

### 5. Maintainability

- Clear audit trail through pivot tables
- Easy to understand relationship model
- Consistent patterns across all entities

## Implementation Notes

### Database Design

- All pivot tables include audit fields (createdAt, updatedAt)
- Foreign key constraints ensure data integrity
- Indexes on pivot tables for performance

### GraphQL Schema

- Pivot types implement `Auditable` interface
- Field resolvers handle relationship resolution
- Optimized queries using ID filtering

### Provider Pattern

- Each pivot has its own provider
- Consistent patterns across all providers
- Faker data for development and testing

This relationship model provides a solid foundation for implementing a scalable, multi-tenant RBAC system that maintains entity purity while providing clear scoping and access control.
