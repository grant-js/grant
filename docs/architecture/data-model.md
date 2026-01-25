---
title: Data Model
description: Comprehensive overview of the Grant database schema and entity relationships
---

# Data Model

The Grant uses a sophisticated multi-tenant data model built on PostgreSQL with Drizzle ORM. This document provides a comprehensive overview of the database schema, entity relationships, and design patterns.

## Core Entities

The platform is built around several core entities that work together to provide multi-tenant RBAC/ACL functionality:

### Primary Entities

- **Users** - Individual people who can access the platform
- **Accounts** - Person-centric identities that can own multiple organizations
- **Organizations** - Business entities that contain projects and users
- **Projects** - Isolated environments for managing external system identities
- **Resources** - Domain entities defined by external systems (invoices, orders, policies, etc.)
- **Roles** - Named collections of permissions
- **Groups** - Collections of permissions that can be assigned to roles
- **Permissions** - Specific actions that can be performed on resources
- **Tags** - Flexible labeling system for categorization

## Entity Relationship Diagram

The Grant uses a complex multi-tenant data model. To make the relationships clearer, we'll break this into focused diagrams:

### Core Entity Relationships

The Grant supports two types of accounts with different relationship patterns:

#### Personal Account Relationships

Personal accounts are for individual users managing their own workspace projects:

```mermaid
erDiagram
    Users ||--o{ PersonalAccounts : "owns"
    PersonalAccounts ||--o{ PersonalProjects : "manages"
```

#### Organization Account Relationships

Organization accounts are for managing business entities and their projects:

```mermaid
erDiagram
    Users ||--o{ OrganizationAccounts : "owns"
    OrganizationAccounts ||--o{ Organizations : "manages"
    Organizations ||--o{ OrganizationProjects : "contains"
```

#### Account Switching Flow

Users can switch between different account types to access different workspaces:

```mermaid
flowchart TD
    User[User Login] --> AccountType{Account Type?}

    AccountType -->|Personal| PersonalAccount[Personal Account]
    AccountType -->|Organization| OrgAccount[Organization Account]

    PersonalAccount --> PersonalProjects[Personal Projects<br/>- Individual workspace<br/>- Personal tools<br/>- Solo development]

    OrgAccount --> Organizations[Organizations<br/>- Business entities<br/>- Team management<br/>- Multi-user access]

    Organizations --> OrgProjects[Organization Projects<br/>- Team projects<br/>- Shared resources<br/>- Collaborative work]

    PersonalAccount -.->|Switch| OrgAccount
    OrgAccount -.->|Switch| PersonalAccount

    style User stroke:#01579b,stroke-width:3px
    style PersonalAccount stroke:#2e7d32,stroke-width:3px
    style OrgAccount stroke:#ef6c00,stroke-width:3px
    style PersonalProjects stroke:#7b1fa2,stroke-width:3px
    style Organizations stroke:#1565c0,stroke-width:3px
    style OrgProjects stroke:#c2185b,stroke-width:3px
```

### Multi-Tenant User Relationships

```mermaid
erDiagram
    Users ||--o{ OrganizationUsers : "belongs to"
    Organizations ||--o{ OrganizationUsers : "contains"
    Users ||--o{ ProjectUsers : "belongs to"
    Projects ||--o{ ProjectUsers : "contains"
```

### RBAC Entity Relationships

```mermaid
erDiagram
    Users ||--o{ UserRoles : "has"
    Roles ||--o{ UserRoles : "assigned to"
    Roles ||--o{ RoleGroups : "contains"
    Groups ||--o{ RoleGroups : "belongs to"
    Groups ||--o{ GroupPermissions : "has"
    Permissions ||--o{ GroupPermissions : "belongs to"
    Resources ||--o{ Permissions : "defines"
    Projects ||--o{ Resources : "contains"
```

### Tagging System Relationships

```mermaid
erDiagram
    Tags ||--o{ UserTags : "applied to"
    Tags ||--o{ RoleTags : "applied to"
    Tags ||--o{ GroupTags : "applied to"
    Tags ||--o{ PermissionTags : "applied to"
```

## Multi-Tenancy Architecture

The platform implements account-based multi-tenancy with three levels of isolation:

### 1. Account Level

- **Accounts** represent person-centric identities
- Each account can own multiple organizations
- Account-level permissions control platform access

### 2. Organization Level

- **Organizations** are business entities
- Users can belong to multiple organizations
- Organization-level roles and permissions

### 3. Project Level

- **Projects** are isolated environments
- Each project manages external system identities
- Complete isolation between projects

```mermaid
graph TB
    subgraph "Account: Alice Johnson"
        A1[Account: alice@company.com]
        A1 --> O1[Organization: Acme Corp]
        A1 --> O2[Organization: Beta Inc]

        O1 --> P1[Project: CRM Integration]
        O1 --> P2[Project: ERP Integration]
        O2 --> P3[Project: Analytics Platform]

        P1 --> U1[External Users: CRM Team]
        P2 --> U2[External Users: ERP Team]
        P3 --> U3[External Users: Analytics Team]
    end

    style A1 stroke:#2e7d32,stroke-width:3px
    style O1 stroke:#1565c0,stroke-width:3px
    style O2 stroke:#1565c0,stroke-width:3px
    style P1 stroke:#7b1fa2,stroke-width:3px
    style P2 stroke:#7b1fa2,stroke-width:3px
    style P3 stroke:#7b1fa2,stroke-width:3px
    style U1 stroke:#01579b,stroke-width:3px
    style U2 stroke:#01579b,stroke-width:3px
    style U3 stroke:#01579b,stroke-width:3px
```

```mermaid
graph TB
    subgraph "Account: Bob Smith"
        B1[Account: bob@company.com]
        B1 --> O3[Organization: Gamma LLC]

        O3 --> P4[Project: E-commerce Platform]
        P4 --> U4[External Users: E-commerce Team]
    end

    style B1 stroke:#2e7d32,stroke-width:3px
    style O3 stroke:#1565c0,stroke-width:3px
    style P4 stroke:#7b1fa2,stroke-width:3px
    style U4 stroke:#01579b,stroke-width:3px
```

## RBAC Permission Model

The platform uses a flexible Role-Based Access Control (RBAC) system with different evaluation flows depending on the account type:

### Permission Flow

```
User → Role → Group → Permission → Resource
```

Resources define the domain entities that permissions control access to. Each permission is linked to a resource and specifies which action can be performed on that resource type.

### Personal Account Permission Evaluation

For personal accounts, the JWT `aud` and `iss` claims are set to the platform API URL (`config.app.url`), identifying the platform itself as the token consumer and issuer. Scope is identified through a custom `scope` claim in the JWT, which contains the tenant context (e.g., `account:{account-id}`). Permissions are evaluated within that account scope:

```mermaid
flowchart TD
    Start([User Request]) --> Auth{Authenticated?}
    Auth -->|No| Deny[Access Denied]
    Auth -->|Yes| ValidateAud{Validate JWT aud = platform URL?}
    ValidateAud -->|No| Deny
    ValidateAud -->|Yes| ExtractScope[Extract JWT scope claim]
    ExtractScope --> CheckScopeType{scope = account:*?}
    CheckScopeType -->|No| Deny
    CheckScopeType -->|Yes| ExtractAccountId[Extract Account ID from scope]
    ExtractAccountId --> CheckAccountRole{Has Role in Account?}
    CheckAccountRole -->|No| Deny
    CheckAccountRole -->|Yes| CheckAccountGroup{Role has Groups?}
    CheckAccountGroup -->|No| Deny
    CheckAccountGroup -->|Yes| CheckAccountPerm{Groups have Permission<br/>for operation scope?}
    CheckAccountPerm -->|No| Deny
    CheckAccountPerm -->|Yes| Allow[Access Granted]

    style Start stroke:#2563eb,stroke-width:3px
    style Allow stroke:#10b981,stroke-width:3px
    style Deny stroke:#ef4444,stroke-width:3px
    style ValidateAud stroke:#7b1fa2,stroke-width:2px
    style ExtractScope stroke:#7b1fa2,stroke-width:2px
    style CheckScopeType stroke:#7b1fa2,stroke-width:2px
    style ExtractAccountId stroke:#7b1fa2,stroke-width:2px
    style CheckAccountRole stroke:#7b1fa2,stroke-width:2px
    style CheckAccountGroup stroke:#7b1fa2,stroke-width:2px
    style CheckAccountPerm stroke:#7b1fa2,stroke-width:2px
```

### Organization Account Permission Evaluation

For organization accounts, the JWT `aud` and `iss` claims are set to the platform API URL (`config.app.url`), identifying the platform itself as the token consumer and issuer. Scope is identified through a custom `scope` claim in the JWT, which contains the tenant context (e.g., `organization:{org-id}`). Permissions are evaluated within that organization scope:

```mermaid
flowchart TD
    Start([User Request]) --> Auth{Authenticated?}
    Auth -->|No| Deny[Access Denied]
    Auth -->|Yes| ValidateAud{Validate JWT aud = platform URL?}
    ValidateAud -->|No| Deny
    ValidateAud -->|Yes| ExtractScope[Extract JWT scope claim]
    ExtractScope --> CheckScopeType{scope = organization:*?}
    CheckScopeType -->|No| Deny
    CheckScopeType -->|Yes| ExtractOrgId[Extract Organization ID from scope]
    ExtractOrgId --> CheckOrgRole{Has Role in Organization?}
    CheckOrgRole -->|No| Deny
    CheckOrgRole -->|Yes| CheckOrgGroup{Role has Groups?}
    CheckOrgGroup -->|No| Deny
    CheckOrgGroup -->|Yes| CheckOrgPerm{Groups have Permission<br/>for operation scope?}
    CheckOrgPerm -->|No| Deny
    CheckOrgPerm -->|Yes| Allow[Access Granted]

    style Start stroke:#2563eb,stroke-width:3px
    style Allow stroke:#10b981,stroke-width:3px
    style Deny stroke:#ef4444,stroke-width:3px
    style ValidateAud stroke:#ef6c00,stroke-width:2px
    style ExtractScope stroke:#ef6c00,stroke-width:2px
    style CheckScopeType stroke:#ef6c00,stroke-width:2px
    style ExtractOrgId stroke:#ef6c00,stroke-width:2px
    style CheckOrgRole stroke:#ef6c00,stroke-width:2px
    style CheckOrgGroup stroke:#ef6c00,stroke-width:2px
    style CheckOrgPerm stroke:#ef6c00,stroke-width:2px
```

### Project-Scoped Permission Evaluation

For project-specific operations, the JWT `aud` and `iss` claims are set to the platform API URL (`config.app.url`), identifying the platform itself as the token consumer and issuer. Scope is identified through a custom `scope` claim in the JWT, which contains the tenant context (e.g., `project:{project-id}`). This approach guarantees isolation since API keys are created per user, per project:

```mermaid
flowchart TD
    Start([User Request]) --> Auth{Authenticated?}
    Auth -->|No| Deny[Access Denied]
    Auth -->|Yes| ValidateAud{Validate JWT aud = platform URL?}
    ValidateAud -->|No| Deny
    ValidateAud -->|Yes| ExtractScope[Extract JWT scope claim]
    ExtractScope --> CheckScopeType{scope = project:*?}
    CheckScopeType -->|No| Deny
    CheckScopeType -->|Yes| ExtractProjectId[Extract Project ID from scope]
    ExtractProjectId --> CheckProjectRole{Has Role in Project?}
    CheckProjectRole -->|No| Deny
    CheckProjectRole -->|Yes| CheckProjectGroup{Role has Groups?}
    CheckProjectGroup -->|No| Deny
    CheckProjectGroup -->|Yes| CheckProjectPerm{Groups have Permission<br/>for operation scope?}
    CheckProjectPerm -->|No| Deny
    CheckProjectPerm -->|Yes| Allow[Access Granted]

    style Start stroke:#2563eb,stroke-width:3px
    style Allow stroke:#10b981,stroke-width:3px
    style Deny stroke:#ef4444,stroke-width:3px
    style ValidateAud stroke:#c2185b,stroke-width:2px
    style ExtractScope stroke:#c2185b,stroke-width:2px
    style CheckScopeType stroke:#c2185b,stroke-width:2px
    style ExtractProjectId stroke:#c2185b,stroke-width:2px
    style CheckProjectRole stroke:#c2185b,stroke-width:2px
    style CheckProjectGroup stroke:#c2185b,stroke-width:2px
    style CheckProjectPerm stroke:#c2185b,stroke-width:2px
```

### JWT Audience Claim Examples

The ACL package uses the JWT `aud` claim to determine the tenant context:

```typescript
// Personal Account
const personalAud = 'account:8043dfac-2d28-4b37-a066-b7d1902442b4';

// Organization Account
const orgAud = 'organization:24f865c9-7200-43fa-99cc-7fc5dcd87a20';

// Project-Scoped Account
const projectAud = 'project:8a9b2c3d-4e5f-6789-abcd-ef0123456789';
```

### Operation Scope Matching

Permissions are evaluated against the operation's scope:

```typescript
interface Operation {
  projectId?: string; // Optional project context
  resource: string; // Resource being accessed
  action: string; // Action being performed
}

// Example operations
const readUserOperation = {
  projectId: 'proj-123',
  resource: 'user',
  action: 'read',
};

const createProjectOperation = {
  resource: 'project',
  action: 'create',
};
```

## Database Schema Details

### Core Tables

#### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP
);
```

#### Accounts Table

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    owner_id UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP
);
```

#### Organizations Table

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP
);
```

#### Projects Table

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP
);
```

### Pivot Tables

The platform uses extensive pivot tables to manage many-to-many relationships:

#### User-Organization Relationship

```sql
CREATE TABLE organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP,
    UNIQUE(organization_id, user_id) WHERE deleted_at IS NULL
);
```

#### User-Project Relationship

```sql
CREATE TABLE project_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP,
    UNIQUE(project_id, user_id) WHERE deleted_at IS NULL
);
```

#### Role-Group Relationship

```sql
CREATE TABLE role_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP,
    UNIQUE(role_id, group_id) WHERE deleted_at IS NULL
);
```

#### Group-Permission Relationship

```sql
CREATE TABLE group_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP,
    UNIQUE(group_id, permission_id) WHERE deleted_at IS NULL
);
```

## Tagging System

The platform includes a comprehensive tagging system for flexible categorization:

### Tag Relationships

```mermaid
graph LR
    subgraph "Tagging System"
        T[Tags<br/>Flexible Labels]
        T --> UT[User Tags<br/>User Categorization]
        T --> RT[Role Tags<br/>Role Classification]
        T --> GT[Group Tags<br/>Group Organization]
        T --> PT[Permission Tags<br/>Permission Types]
        T --> OT[Organization Tags<br/>Org Classification]
        T --> PRT[Project Tags<br/>Project Categories]

        UT --> U[Users]
        RT --> R[Roles]
        GT --> G[Groups]
        PT --> P[Permissions]
        OT --> O[Organizations]
        PRT --> PR[Projects]
    end

    style T fill:rgba(255, 193, 7, 0.8),stroke:#ff9800,stroke-width:2px,color:#000
    style UT fill:rgba(33, 150, 243, 0.8),stroke:#1976d2,stroke-width:2px,color:#fff
    style RT fill:rgba(33, 150, 243, 0.8),stroke:#1976d2,stroke-width:2px,color:#fff
    style GT fill:rgba(33, 150, 243, 0.8),stroke:#1976d2,stroke-width:2px,color:#fff
    style PT fill:rgba(33, 150, 243, 0.8),stroke:#1976d2,stroke-width:2px,color:#fff
    style OT fill:rgba(33, 150, 243, 0.8),stroke:#1976d2,stroke-width:2px,color:#fff
    style PRT fill:rgba(33, 150, 243, 0.8),stroke:#1976d2,stroke-width:2px,color:#fff
    style U fill:rgba(76, 175, 80, 0.8),stroke:#388e3c,stroke-width:2px,color:#fff
    style R fill:rgba(76, 175, 80, 0.8),stroke:#388e3c,stroke-width:2px,color:#fff
    style G fill:rgba(76, 175, 80, 0.8),stroke:#388e3c,stroke-width:2px,color:#fff
    style P fill:rgba(76, 175, 80, 0.8),stroke:#388e3c,stroke-width:2px,color:#fff
    style O fill:rgba(76, 175, 80, 0.8),stroke:#388e3c,stroke-width:2px,color:#fff
    style PR fill:rgba(76, 175, 80, 0.8),stroke:#388e3c,stroke-width:2px,color:#fff
```

### Tag Usage Examples

- **User Tags**: "admin", "developer", "contractor"
- **Role Tags**: "management", "technical", "support"
- **Group Tags**: "read-only", "write-access", "admin-only"
- **Permission Tags**: "sensitive", "public", "internal"

## Audit Logging

Every entity includes comprehensive audit logging:

### Audit Log Structure

```sql
CREATE TABLE user_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values VARCHAR(1000),
    new_values VARCHAR(1000),
    metadata VARCHAR(1000),
    performed_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Audit Events

- **CREATE** - Entity creation
- **UPDATE** - Entity modification
- **DELETE** - Entity deletion (soft delete)
- **RESTORE** - Entity restoration
- **ASSIGN** - Role/permission assignment
- **REVOKE** - Role/permission revocation

## Indexing Strategy

The database uses strategic indexing for optimal performance:

### Primary Indexes

- **Primary Keys**: All tables have UUID primary keys
- **Foreign Keys**: All foreign key relationships are indexed
- **Soft Deletes**: `deleted_at` columns are indexed for efficient filtering

### Unique Constraints

- **Composite Uniqueness**: Pivot tables use composite unique indexes
- **Soft Delete Awareness**: Unique constraints respect soft delete status
- **Slug Uniqueness**: Organizations and projects have unique slugs

### Performance Indexes

```sql
-- User lookup by organization
CREATE INDEX idx_organization_users_org_id ON organization_users(organization_id);

-- User lookup by project
CREATE INDEX idx_project_users_project_id ON project_users(project_id);

-- Role permission lookup
CREATE INDEX idx_role_groups_role_id ON role_groups(role_id);
CREATE INDEX idx_group_permissions_group_id ON group_permissions(group_id);

-- Audit log queries
CREATE INDEX idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX idx_user_audit_logs_action ON user_audit_logs(action);
```

## Data Isolation Patterns

### Tenant Isolation

- **Account Level**: Complete isolation between accounts
- **Organization Level**: Users can belong to multiple organizations
- **Project Level**: Complete isolation between projects

### Permission Isolation

- **Role Scoping**: Roles are scoped to specific tenants
- **Group Scoping**: Groups are scoped to specific tenants
- **Permission Scoping**: Permissions are scoped to specific tenants

### Data Access Patterns

- **Cross-Tenant Queries**: Prevented by tenant scoping
- **Soft Deletes**: All entities support soft deletion
- **Audit Trails**: Complete audit trail for all changes

## GraphQL Schema Integration

The database schema is automatically exposed through GraphQL:

### Type Generation

- **Drizzle ORM** generates TypeScript types
- **GraphQL Code Generator** creates GraphQL types
- **Type Safety** maintained across the entire stack

### Query Optimization

- **Field Selection**: Only requested fields are fetched
- **Relationship Loading**: Efficient relationship loading
- **Caching**: Strategic caching for frequently accessed data

## Migration Strategy

### Schema Evolution

- **Drizzle Migrations**: Automated migration generation
- **Backward Compatibility**: Careful schema evolution
- **Data Preservation**: Safe data migration patterns

### Deployment Patterns

- **Zero Downtime**: Rolling deployments with migrations
- **Rollback Support**: Safe rollback procedures
- **Data Validation**: Comprehensive data validation

---

## Authentication & Sessions

The platform includes comprehensive authentication and session management:

### User Authentication Methods

Users can authenticate using multiple methods stored in `user_authentication_methods`:

- **Email/Password** - Traditional authentication with hashed passwords
- **OAuth Providers** - Google, GitHub, and other OAuth providers
- Each method tracks verification status and last used timestamp

### User Sessions

Sessions are stored in `user_sessions` with device-aware tracking:

- **Device Identification** - `userAgent` and `ipAddress` fields
- **Session Isolation** - Unique sessions per device/browser combination
- **Token Management** - Refresh tokens stored securely
- **Audience Scoping** - Sessions scoped to specific accounts (`audience` field)
- **Expiration Tracking** - Automatic expiration of inactive sessions

For detailed information about session management, device tracking, and security features, see the [Security & Session Management](/architecture/security) documentation.

**Next:** Learn about [Security](/architecture/security) to understand authentication and authorization mechanisms.
