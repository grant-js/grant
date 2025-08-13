# Multi-Tenancy Platform Specification

## Overview

This document outlines the multi-tenancy architecture for the Identity Management Platform, designed to manage users, roles, groups, and permissions for external systems and integrations.

## Core Concepts

### Platform Purpose

The platform serves as an **identity management service** that manages user identities, roles, groups, and permissions for **external systems and integrations**. It provides centralized identity management for multiple organizations and their integration environments.

### Key Entities

#### 1. **Account** (Person's Identity)

- Represents a **person** who can access multiple organizations
- Has **system roles** for platform management (billing, admin, viewer, etc.)
- Can belong to multiple organizations with different roles
- **Top-level entity** in the platform

#### 2. **Organization**

- Groups related projects and integration environments
- Contains multiple projects
- Has system users (accounts) with different management roles
- **Billing and management container**

#### 3. **Project** (Integration Environment)

- **Isolated environment** for managing external system identities
- Contains external users, roles, groups, and permissions
- Each project manages identity data for a specific external system
- **No cross-project inheritance** - each project is independent

#### 4. **System Roles** (Platform Management)

- **Account-level roles**: Billing Admin, Platform Admin, Viewer
- **Organization-level roles**: Org Owner, Org Admin, Member Manager
- Control access to platform features (billing, settings, user management)
- **NOT** roles for external systems

#### 5. **External Entities** (Managed for External Systems)

- **External Users**: Users managed for external systems
- **External Roles**: Roles defined for external systems
- **External Groups**: Groups defined for external systems
- **External Permissions**: Permissions defined for external systems

## Architecture Diagram

```
Account (Person's Identity)
├── System Roles (Platform Management)
│   ├── Billing Admin
│   ├── Platform Admin
│   └── Viewer
├── Organizations (Accessible to this account)
│   ├── Organization A
│   │   ├── System Role: "Org Owner"
│   │   └── Projects (Integration Environments)
│   │       ├── Project Alpha
│   │       │   ├── External Users (managed for external system)
│   │       │   ├── External Roles (managed for external system)
│   │       │   ├── External Groups (managed for external system)
│   │       │   └── External Permissions (managed for external system)
│   │       └── Project Beta
│   └── Organization B
│       ├── System Role: "Org Admin"
│       └── Projects
```

## Entity Relationships

### Core Relationships

```
Account ←→ Organization (via AccountOrganization pivot)
Account ←→ Project (via AccountProject pivot)
Organization ←→ Project (direct relationship)
Project ←→ ExternalUser (via ExternalUserProject pivot)
ExternalUser ←→ ExternalRole (via ExternalUserRole pivot)
ExternalRole ←→ ExternalGroup (via ExternalRoleGroup pivot)
ExternalGroup ←→ ExternalPermission (via ExternalGroupPermission pivot)
```

### Pivot Tables

#### AccountOrganization

```graphql
type AccountOrganization implements Auditable {
  id: ID!
  accountId: ID!
  organizationId: ID!
  systemRoleId: ID! # Account's role in this organization
  account: Account!
  organization: Organization!
  systemRole: SystemRole!
  createdAt: String!
  updatedAt: String!
}
```

#### AccountProject

```graphql
type AccountProject implements Auditable {
  id: ID!
  accountId: ID!
  projectId: ID!
  organizationId: ID! # For validation and queries
  projectRoleId: ID? # Optional project-specific role
  account: Account!
  project: Project!
  organization: Organization!
  projectRole: ProjectRole?
  createdAt: String!
  updatedAt: String!
}
```

#### ExternalUserRole

```graphql
type ExternalUserRole implements Auditable {
  id: ID!
  externalUserId: ID!
  externalRoleId: ID!
  projectId: ID!
  externalUser: ExternalUser!
  externalRole: ExternalRole!
  createdAt: String!
  updatedAt: String!
}
```

## Schema Definitions

### Account Schema

```graphql
type Account implements Auditable {
  id: ID!
  email: String!
  name: String!
  # System roles across the platform
  systemRoles: [SystemRole!]
  # Organizations this account can access
  organizations: [Organization!] # via AccountOrganization
  # Projects this account can access
  projects: [Project!] # via AccountProject
  createdAt: String!
  updatedAt: String!
}
```

### Organization Schema

```graphql
type Organization implements Auditable {
  id: ID!
  name: String!
  slug: String!
  description: String
  # Accounts that can access this organization
  accounts: [Account!] # via AccountOrganization
  # Projects (integration environments)
  projects: [Project!]
  createdAt: String!
  updatedAt: String!
}
```

### Project Schema

```graphql
type Project implements Auditable {
  id: ID!
  name: String!
  slug: String!
  description: String
  organizationId: ID!
  organization: Organization!
  # Accounts that can access this project
  accounts: [Account!] # via AccountProject
  # External system data (managed for external system)
  externalUsers: [ExternalUser!]
  externalRoles: [ExternalRole!]
  externalGroups: [ExternalGroup!]
  externalPermissions: [ExternalPermission!]
  createdAt: String!
  updatedAt: String!
}
```

### External User Schema

```graphql
type ExternalUser implements Auditable {
  id: ID!
  name: String!
  email: String!
  projectId: ID!
  project: Project!
  # External system roles (managed for external system)
  roles: [ExternalRole!]
  groups: [ExternalGroup!]
  createdAt: String!
  updatedAt: String!
}
```

### System Role Schema

```graphql
type SystemRole implements Auditable {
  id: ID!
  name: String! # billing, admin, viewer, etc.
  description: String
  permissions: [SystemPermission!]
  createdAt: String!
  updatedAt: String!
}
```

## URL Structure

### Account Management

```
/[locale]/account/dashboard
/[locale]/account/billing
/[locale]/account/settings
```

### Organization Management

```
/[locale]/organizations/[organization-slug]/dashboard
/[locale]/organizations/[organization-slug]/projects
/[locale]/organizations/[organization-slug]/members
/[locale]/organizations/[organization-slug]/settings
```

### Project Management (Integration Environments)

```
/[locale]/organizations/[organization-slug]/projects/[project-slug]/dashboard
/[locale]/organizations/[organization-slug]/projects/[project-slug]/external-users
/[locale]/organizations/[organization-slug]/projects/[project-slug]/external-roles
/[locale]/organizations/[organization-slug]/projects/[project-slug]/external-groups
/[locale]/organizations/[organization-slug]/projects/[project-slug]/external-permissions
/[locale]/organizations/[organization-slug]/projects/[project-slug]/settings
```

## Use Case Examples

### Example 1: Multi-Organization Account

```
Account: "alice@identitycorp.com"
├── System Roles: Billing Admin, Platform Viewer
├── Organization: "Acme Corp"
│   ├── System Role: "Org Owner"
│   └── Projects:
│       ├── "Acme CRM Integration"
│       │   ├── External Users (for Acme's CRM)
│       │   │   ├── john.doe@acme.com (CRM Admin)
│       │   │   └── jane.smith@acme.com (CRM User)
│       │   └── External Roles (CRM roles)
│       │       ├── CRM Admin
│       │       └── CRM User
│       └── "Acme ERP Integration"
│           ├── External Users (for Acme's ERP)
│           └── External Roles (ERP roles)
└── Organization: "Beta Corp"
    ├── System Role: "Org Admin"
    └── Projects:
        └── "Beta CRM Integration"
            ├── External Users (for Beta's CRM)
            └── External Roles (CRM roles)
```

### Example 2: Project Isolation

```
Organization: "TechCorp"
├── Project: "Production CRM"
│   ├── External Users: 50 (production team)
│   ├── External Roles: Admin, Developer, Support, Viewer
│   └── External Groups: Sales, Support, Development
└── Project: "Staging CRM"
    ├── External Users: 10 (dev team only)
    ├── External Roles: Admin, Developer
    └── External Groups: Development
```

## Security Model

### Access Control Levels

1. **Account Level**: System roles for platform management
2. **Organization Level**: System roles for organization management
3. **Project Level**: External roles for external system management

### Security Principles

- **Least Privilege**: Users have minimum required access
- **Explicit Access**: All access must be explicitly granted
- **Isolation**: Projects are completely isolated from each other
- **Audit Trail**: All access and changes are logged

### Validation Rules

1. **Account-Organization**: Account must have explicit organization access
2. **Account-Project**: Account must have explicit project access (even if org access exists)
3. **External User-Project**: External users are scoped to specific projects
4. **Role Inheritance**: No automatic role inheritance across projects

## Implementation Strategy

### Phase 1: Core Entities

1. Create Account entity and system roles
2. Create Organization entity
3. Create Project entity
4. Implement AccountOrganization and AccountProject pivots

### Phase 2: External System Management

1. Create ExternalUser, ExternalRole, ExternalGroup, ExternalPermission entities
2. Implement all external system pivot tables
3. Create project-scoped queries and mutations

### Phase 3: UI and Navigation

1. Update navigation to reflect new hierarchy
2. Create account, organization, and project management interfaces
3. Implement role-based access control in UI

### Phase 4: Integration Features

1. Add API endpoints for external system integration
2. Implement authentication and authorization flows
3. Add audit logging and monitoring

## Benefits

### For Platform Users

- **Centralized Management**: Manage multiple organizations from one account
- **Flexible Access**: Different roles per organization and project
- **Clear Separation**: Platform management vs. external system management
- **Scalable**: Support for multiple organizations and projects

### For External Systems

- **Isolated Environments**: Each project is completely independent
- **Custom Roles**: Define roles specific to each external system
- **Secure Access**: Explicit access control with audit trails
- **API Integration**: Standardized APIs for external system integration

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

1. **Add Account entity**: Create account for existing users
2. **Add Organization entity**: Create default organization
3. **Add Project entity**: Create default project
4. **Migrate existing data**: Move current users/roles to external entities
5. **Update UI**: Implement new navigation and interfaces

### Data Migration Strategy

1. **Backup existing data**
2. **Create new schema structure**
3. **Migrate data with validation**
4. **Update application code**
5. **Deploy with rollback plan**

## Conclusion

This multi-tenancy architecture provides a robust, scalable foundation for identity management across multiple organizations and integration environments. The clear separation between platform management and external system management ensures security and flexibility while maintaining simplicity for end users.

The architecture supports:

- **Person-centric accounts** with flexible access across organizations
- **Isolated project environments** for secure external system management
- **Explicit access control** with comprehensive audit trails
- **Scalable design** for growth and expansion
- **Clear separation of concerns** between platform and external system management
