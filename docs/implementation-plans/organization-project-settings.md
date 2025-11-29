# Organization and Project Level Settings - Implementation Plan

## Overview

This document analyzes and specifies the settings that should be available at the **organization level** and **project level** based on the current state of the Grant Platform. This builds upon the completed account-level settings MVP and extends settings management to the multi-tenant hierarchy.

## Current State Analysis

### Account-Level Settings (MVP - Completed)

The account-level settings currently include:

1. **Account Settings** (`/dashboard/settings/account`)
   - Account name and slug management
   - Account type display (Personal/Organization)
   - Complementary account information

2. **Profile Settings** (`/dashboard/settings/profile`)
   - User name
   - Profile picture upload

3. **Security Settings** (`/dashboard/settings/security`)
   - Authentication methods (Email, Google, GitHub)
   - Password change (for email provider)
   - Active sessions management

4. **Privacy Settings** (`/dashboard/settings/privacy`)
   - Data export (GDPR compliance)
   - Account deletion

5. **Preferences Settings** (`/dashboard/settings/preferences`)
   - Language selection
   - Theme (light/dark mode)

### Multi-Tenancy Architecture

The platform implements a three-tier hierarchy:

```
Account (Person's Identity)
├── System Roles (Platform Management)
└── Organizations (Business Entities)
    ├── Organization Members (with roles: owner, admin, dev, viewer)
    └── Projects (Integration Environments)
        └── External System Entities (users, roles, groups, permissions)
```

### Organization Entity Properties

From the codebase analysis:

- **Core Fields**: `id`, `name`, `slug`, `description`, `createdAt`, `updatedAt`, `deletedAt`
- **Relationships**:
  - Projects (one-to-many)
  - Users/Members (many-to-many via `organizationUsers`)
  - Roles (many-to-many via `organizationRoles`)
  - Groups (many-to-many via `organizationGroups`)
  - Permissions (many-to-many via `organizationPermissions`)
  - Tags (many-to-many via `organizationTags`)
- **Roles**: Standard roles seeded per organization (owner, admin, dev, viewer)
- **Purpose**: Billing and management container for related projects

### Project Entity Properties

From the codebase analysis:

- **Core Fields**: `id`, `name`, `slug`, `description`, `organizationId`, `createdAt`, `updatedAt`, `deletedAt`
- **Relationships**:
  - Organization (many-to-one)
  - Users/Members (many-to-many via `projectUsers`)
  - Roles (many-to-many via `projectRoles`)
  - Groups (many-to-many via `projectGroups`)
  - Permissions (many-to-many via `projectPermissions`)
  - Tags (many-to-many via `projectTags`)
  - External Users, Roles, Groups, Permissions (managed for external systems)
- **Purpose**: Isolated environment for managing external system identities

## Organization-Level Settings Specification

### 1. General Settings

**Purpose**: Basic organization information and identification

**Settings**:

- **Organization Name** (`name`)
  - Display name of the organization
  - Required field
  - Max length: 255 characters
  - Validation: Must be unique within account scope
- **Organization Slug** (`slug`)
  - URL-friendly identifier
  - Auto-generated from name (can be manually edited)
  - Required field
  - Max length: 255 characters
  - Validation: Must be unique within account scope, URL-safe format
- **Description** (`description`)
  - Optional text description of the organization
  - Max length: 1000 characters
  - Rich text support (future enhancement)

**Access Control**:

- **Owner**: Full access (create, read, update, delete)
- **Admin**: Read and update access
- **Dev**: Read access
- **Viewer**: Read access

**UI Location**: `/dashboard/organizations/[organizationId]/settings/general`

### 2. Members & Access Settings

**Purpose**: Manage organization membership and role assignments

**Settings**:

- **Member List**
  - View all members of the organization
  - Display: name, email, role, joined date, last active
  - Filter and search capabilities
- **Invite Members**
  - Send invitation emails to new members
  - Assign role during invitation (owner, admin, dev, viewer)
  - Set invitation expiration (default: 7 days)
- **Role Management**
  - View and manage member roles
  - Change member roles (with restrictions)
  - Remove members from organization
- **Role Permissions Overview**
  - Display what each role can do
  - Reference documentation for role capabilities

**Access Control**:

- **Owner**: Full access (invite, remove, change roles)
- **Admin**: Can invite members, change roles (except owner), remove non-owner members
- **Dev**: Read-only access
- **Viewer**: Read-only access

**UI Location**: `/dashboard/organizations/[organizationId]/settings/members`

### 3. Projects Settings

**Purpose**: Manage organization's projects

**Settings**:

- **Project List**
  - View all projects in the organization
  - Display: name, description, tags, member count, created date
  - Filter by tags, search by name
- **Project Creation**
  - Create new projects within the organization
  - Set initial project name, slug, description
  - Assign tags
- **Project Deletion**
  - Delete projects (with confirmation)
  - Handle cascading deletion of project data

**Access Control**:

- **Owner**: Full access (create, read, update, delete)
- **Admin**: Create, read, update (delete requires owner approval - future enhancement)
- **Dev**: Create, read, update (delete requires owner approval - future enhancement)
- **Viewer**: Read-only access

**UI Location**: `/dashboard/organizations/[organizationId]/settings/projects`

### 4. Tags & Categorization

**Purpose**: Organize and categorize organization resources

**Settings**:

- **Tag Management**
  - View all organization tags
  - Create, edit, delete tags
  - Set tag colors
  - Set primary tag for organization
- **Tag Usage**
  - View which resources use each tag
  - Bulk tag operations (future enhancement)

**Access Control**:

- **Owner**: Full access
- **Admin**: Full access
- **Dev**: Read-only access
- **Viewer**: Read-only access

**UI Location**: `/dashboard/organizations/[organizationId]/settings/tags`

### 5. Security Settings

**Purpose**: Organization-level security and access control

**Settings**:

- **Two-Factor Authentication** (Future Enhancement)
  - Require 2FA for organization members
  - Enforce 2FA for specific roles
- **Session Management** (Future Enhancement)
  - View active sessions for organization members
  - Set session timeout policies
- **IP Allowlist** (Future Enhancement)
  - Restrict access from specific IP addresses
  - Whitelist/blacklist IP ranges
- **API Access Tokens** (Future Enhancement)
  - Manage organization-level API tokens
  - Set token expiration and permissions

**Access Control**:

- **Owner**: Full access
- **Admin**: Read and update access (with owner approval for critical changes)
- **Dev**: Read-only access
- **Viewer**: Read-only access

**UI Location**: `/dashboard/organizations/[organizationId]/settings/security`

### 6. Audit & Activity Logs

**Purpose**: Track organization-level changes and activities

**Settings**:

- **Activity Feed**
  - View recent activities in the organization
  - Filter by: user, action type, date range, resource type
  - Export activity logs
- **Audit Logs**
  - Detailed audit trail of all changes
  - Who, what, when, where information
  - Compliance reporting

**Access Control**:

- **Owner**: Full access (view all, export)
- **Admin**: View access (export requires owner approval)
- **Dev**: View own activities only
- **Viewer**: View own activities only

**UI Location**: `/dashboard/organizations/[organizationId]/settings/audit`

### 7. Billing & Subscription (Future Enhancement)

**Purpose**: Manage organization billing and subscription

**Settings**:

- **Subscription Plan**
  - View current plan
  - Upgrade/downgrade plans
  - Usage limits and quotas
- **Billing Information**
  - Payment methods
  - Billing address
  - Invoice history
- **Usage Analytics**
  - Project count
  - Member count
  - API usage
  - Storage usage

**Access Control**:

- **Owner**: Full access
- **Admin**: Read-only access (with owner approval for changes)
- **Dev**: Read-only access
- **Viewer**: No access

**UI Location**: `/dashboard/organizations/[organizationId]/settings/billing`

### 8. Integrations (Future Enhancement)

**Purpose**: Manage external integrations and webhooks

**Settings**:

- **Webhook Configuration**
  - Create and manage webhooks
  - Set webhook URLs and events
  - View webhook delivery history
- **SSO Configuration** (Enterprise Feature)
  - Configure SAML, OAuth, LDAP
  - Set up single sign-on
- **API Integrations**
  - Manage API keys and tokens
  - Set rate limits
  - View API usage

**Access Control**:

- **Owner**: Full access
- **Admin**: Read and update access (with owner approval for critical changes)
- **Dev**: Read-only access
- **Viewer**: No access

**UI Location**: `/dashboard/organizations/[organizationId]/settings/integrations`

### 9. Notifications & Preferences

**Purpose**: Organization-level notification preferences

**Settings**:

- **Email Notifications**
  - Member invitations
  - Role changes
  - Project creation/deletion
  - Security alerts
- **In-App Notifications**
  - Activity feed preferences
  - Notification frequency

**Access Control**:

- **Owner**: Full access (can set defaults for organization)
- **Admin**: Personal preferences only
- **Dev**: Personal preferences only
- **Viewer**: Personal preferences only

**UI Location**: `/dashboard/organizations/[organizationId]/settings/notifications`

### 10. Danger Zone

**Purpose**: Destructive operations for the organization

**Settings**:

- **Transfer Ownership**
  - Transfer organization ownership to another member
  - Requires confirmation and recipient approval
- **Delete Organization**
  - Permanently delete organization and all associated data
  - Requires confirmation with organization name
  - Cascading deletion of all projects and data
  - Soft delete with retention period (30 days default)

**Access Control**:

- **Owner**: Full access
- **Admin**: No access
- **Dev**: No access
- **Viewer**: No access

**UI Location**: `/dashboard/organizations/[organizationId]/settings/danger-zone`

## Project-Level Settings Specification

### 1. General Settings

**Purpose**: Basic project information and identification

**Settings**:

- **Project Name** (`name`)
  - Display name of the project
  - Required field
  - Max length: 255 characters
- **Project Slug** (`slug`)
  - URL-friendly identifier
  - Auto-generated from name (can be manually edited)
  - Required field
  - Max length: 255 characters
  - Validation: Must be unique within organization scope
- **Description** (`description`)
  - Optional text description of the project
  - Max length: 1000 characters
  - Rich text support (future enhancement)
- **Organization**
  - Display parent organization (read-only)
  - Cannot be changed (would require project deletion and recreation)

**Access Control**:

- Based on organization role and project-specific permissions
- **Owner/Admin**: Full access (create, read, update, delete)
- **Dev**: Read and update access
- **Viewer**: Read-only access

**UI Location**: `/dashboard/organizations/[organizationId]/projects/[projectId]/settings/general`

### 2. Members & Access Settings

**Purpose**: Manage project membership and access

**Settings**:

- **Member List**
  - View all members with access to the project
  - Display: name, email, role, joined date, last active
  - Filter and search capabilities
- **Add Members**
  - Add organization members to project
  - Assign project-specific role
  - Inherit from organization role or set custom project role
- **Role Management**
  - View and manage member roles within project
  - Change member roles
  - Remove members from project
- **Access Control**
  - View who has access to what resources
  - Project-specific permission matrix

**Access Control**:

- **Owner/Admin**: Full access (add, remove, change roles)
- **Dev**: Can add members (with role restrictions), read access
- **Viewer**: Read-only access

**UI Location**: `/dashboard/organizations/[organizationId]/projects/[projectId]/settings/members`

### 3. External System Management

**Purpose**: Manage external system entities (users, roles, groups, permissions)

**Settings**:

- **External Users**
  - View all external users managed for the external system
  - Create, edit, delete external users
  - Bulk operations
- **External Roles**
  - Manage roles defined for the external system
  - Create, edit, delete roles
  - Assign roles to external users
- **External Groups**
  - Manage groups defined for the external system
  - Create, edit, delete groups
  - Assign groups to roles
- **External Permissions**
  - Manage permissions defined for the external system
  - Create, edit, delete permissions
  - Assign permissions to groups

**Access Control**:

- **Owner/Admin**: Full access
- **Dev**: Full access (this is the primary purpose of projects)
- **Viewer**: Read-only access

**UI Location**: `/dashboard/organizations/[organizationId]/projects/[projectId]/settings/external-system`

### 4. Tags & Categorization

**Purpose**: Organize and categorize project resources

**Settings**:

- **Tag Management**
  - View all project tags
  - Create, edit, delete tags
  - Set tag colors
  - Set primary tag for project
- **Tag Usage**
  - View which resources use each tag
  - Bulk tag operations (future enhancement)

**Access Control**:

- **Owner/Admin**: Full access
- **Dev**: Full access
- **Viewer**: Read-only access

**UI Location**: `/dashboard/organizations/[organizationId]/projects/[projectId]/settings/tags`

### 5. Security Settings

**Purpose**: Project-level security and access control

**Settings**:

- **Access Control Policies** (Future Enhancement)
  - Set project-specific access policies
  - IP restrictions
  - Time-based access
- **API Access Tokens** (Future Enhancement)
  - Manage project-level API tokens
  - Set token expiration and permissions
  - Scope tokens to specific external system operations

**Access Control**:

- **Owner/Admin**: Full access
- **Dev**: Read and update access (with owner/admin approval for critical changes)
- **Viewer**: Read-only access

**UI Location**: `/dashboard/organizations/[organizationId]/projects/[projectId]/settings/security`

### 6. Audit & Activity Logs

**Purpose**: Track project-level changes and activities

**Settings**:

- **Activity Feed**
  - View recent activities in the project
  - Filter by: user, action type, date range, resource type
  - Export activity logs
- **Audit Logs**
  - Detailed audit trail of all changes
  - External system entity changes
  - Access logs

**Access Control**:

- **Owner/Admin**: Full access (view all, export)
- **Dev**: View access (export requires owner/admin approval)
- **Viewer**: View own activities only

**UI Location**: `/dashboard/organizations/[organizationId]/projects/[projectId]/settings/audit`

### 7. Integrations (Future Enhancement)

**Purpose**: Manage project-specific integrations

**Settings**:

- **External System Integration**
  - Configure connection to external system
  - Set up sync schedules
  - View sync status and history
- **Webhook Configuration**
  - Create and manage project-specific webhooks
  - Set webhook URLs and events
  - View webhook delivery history
- **API Configuration**
  - Manage project API endpoints
  - Set rate limits
  - View API usage

**Access Control**:

- **Owner/Admin**: Full access
- **Dev**: Read and update access (with owner/admin approval for critical changes)
- **Viewer**: Read-only access

**UI Location**: `/dashboard/organizations/[organizationId]/projects/[projectId]/settings/integrations`

### 8. Data Management

**Purpose**: Manage project data and resources

**Settings**:

- **Data Export**
  - Export all project data
  - Export specific resource types (users, roles, groups, permissions)
  - Set export format (JSON, CSV)
- **Data Import**
  - Import external system data
  - Bulk import users, roles, groups, permissions
  - Validate import data
- **Backup & Restore** (Future Enhancement)
  - Create project backups
  - Restore from backup
  - Schedule automatic backups

**Access Control**:

- **Owner/Admin**: Full access
- **Dev**: Export access, import access (with owner/admin approval)
- **Viewer**: Export access (own data only)

**UI Location**: `/dashboard/organizations/[organizationId]/projects/[projectId]/settings/data`

### 9. Notifications & Preferences

**Purpose**: Project-level notification preferences

**Settings**:

- **Email Notifications**
  - External user changes
  - Role assignments
  - Permission changes
  - Integration sync status
- **In-App Notifications**
  - Activity feed preferences
  - Notification frequency

**Access Control**:

- **Owner/Admin**: Full access (can set defaults for project)
- **Dev**: Personal preferences only
- **Viewer**: Personal preferences only

**UI Location**: `/dashboard/organizations/[organizationId]/projects/[projectId]/settings/notifications`

### 10. Danger Zone

**Purpose**: Destructive operations for the project

**Settings**:

- **Transfer Project**
  - Transfer project to another organization (Future Enhancement)
  - Requires confirmation and recipient organization approval
- **Delete Project**
  - Permanently delete project and all associated data
  - Requires confirmation with project name
  - Cascading deletion of all external system entities
  - Soft delete with retention period (30 days default)

**Access Control**:

- **Owner/Admin**: Full access
- **Dev**: No access
- **Viewer**: No access

**UI Location**: `/dashboard/organizations/[organizationId]/projects/[projectId]/settings/danger-zone`

## Implementation Priority

### Phase 1: MVP (Core Settings)

**Organization Level**:

1. General Settings (name, slug, description)
2. Members & Access Settings (basic member management)
3. Projects Settings (view and manage projects)
4. Danger Zone (delete organization)

**Project Level**:

1. General Settings (name, slug, description)
2. Members & Access Settings (basic member management)
3. External System Management (basic CRUD for external entities)
4. Danger Zone (delete project)

### Phase 2: Enhanced Settings

**Organization Level**: 5. Tags & Categorization 6. Audit & Activity Logs 7. Notifications & Preferences

**Project Level**: 4. Tags & Categorization 5. Audit & Activity Logs 6. Data Management (export/import) 7. Notifications & Preferences

### Phase 3: Advanced Features

**Organization Level**: 8. Security Settings 9. Billing & Subscription 10. Integrations

**Project Level**: 8. Security Settings 9. Integrations

## Technical Considerations

### URL Structure

Following the existing pattern from multi-tenancy documentation:

**Organization Settings**:

```
/[locale]/dashboard/organizations/[organizationId]/settings
/[locale]/dashboard/organizations/[organizationId]/settings/general
/[locale]/dashboard/organizations/[organizationId]/settings/members
/[locale]/dashboard/organizations/[organizationId]/settings/projects
/[locale]/dashboard/organizations/[organizationId]/settings/tags
/[locale]/dashboard/organizations/[organizationId]/settings/audit
/[locale]/dashboard/organizations/[organizationId]/settings/danger-zone
```

**Project Settings**:

```
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/settings
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/settings/general
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/settings/members
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/settings/external-system
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/settings/tags
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/settings/audit
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/settings/data
/[locale]/dashboard/organizations/[organizationId]/projects/[projectId]/settings/danger-zone
```

### Component Reusability

Many components from account-level settings can be reused or adapted:

- **SettingsCard**: Reusable card component for settings sections
- **SettingsNav**: Navigation component (can be adapted for org/project context)
- **Form Components**: Input fields, validation patterns
- **Danger Zone**: Similar pattern for destructive operations

### Database Schema Considerations

Most required fields already exist in the database:

- Organization: `name`, `slug`, `description` ✅
- Project: `name`, `slug`, `description`, `organizationId` ✅
- Relationships: All pivot tables exist ✅

**Potential Additions**:

- Organization settings JSONB field for future extensibility
- Project settings JSONB field for future extensibility
- Organization preferences table (if needed for complex preferences)
- Project preferences table (if needed for complex preferences)

### GraphQL Schema Considerations

**Queries Needed**:

- `organization(id: ID!)` - Get organization details
- `project(id: ID!)` - Get project details
- `organizationMembers(organizationId: ID!)` - Get organization members
- `projectMembers(projectId: ID!)` - Get project members

**Mutations Needed**:

- `updateOrganization(id: ID!, input: UpdateOrganizationInput!)` - Update organization
- `updateProject(id: ID!, input: UpdateProjectInput!)` - Update project
- `deleteOrganization(id: ID!)` - Delete organization
- `deleteProject(id: ID!)` - Delete project
- `inviteOrganizationMember(organizationId: ID!, input: InviteMemberInput!)` - Invite member
- `removeOrganizationMember(organizationId: ID!, userId: ID!)` - Remove member
- `addProjectMember(projectId: ID!, userId: ID!, roleId: ID!)` - Add project member
- `removeProjectMember(projectId: ID!, userId: ID!)` - Remove project member

### Authorization Considerations

**Organization-Level Authorization**:

- Check user's role in organization (owner, admin, dev, viewer)
- Enforce role-based access control for each setting
- Owner has full access, others have restricted access based on role

**Project-Level Authorization**:

- Check user's role in organization AND project
- Project access may be more restrictive than organization access
- Some operations may require both organization and project permissions

### UI/UX Considerations

**Navigation**:

- Settings should be accessible from organization/project context menus
- Breadcrumb navigation: Dashboard > Organizations > [Org] > Settings
- Consistent navigation pattern with account-level settings

**Layout**:

- Follow the same layout pattern as account settings
- Sidebar navigation for settings sections
- Mobile-responsive bottom navigation
- Consistent card-based layout for settings sections

**Permissions UI**:

- Clearly indicate what actions are available based on user's role
- Disable/hide unavailable actions
- Show tooltips explaining why actions are unavailable
- Confirmation dialogs for destructive operations

## Next Steps

1. **Review and Refine**: Review this specification with stakeholders
2. **Prioritize Features**: Determine which features are essential for MVP
3. **Create Detailed Implementation Plans**: Break down each setting category into detailed implementation tasks
4. **Database Schema Updates**: Identify any schema changes needed
5. **GraphQL Schema Design**: Design GraphQL queries and mutations
6. **UI/UX Design**: Create mockups for settings pages
7. **Implementation**: Start with Phase 1 MVP features

## References

- [Multi-Tenancy Architecture](/docs/architecture/multi-tenancy.md)
- [Data Model](/docs/architecture/data-model.md)
- [Security Settings Implementation Plan](./security-settings.md)
- [Privacy Settings Implementation Plan](./privacy-settings.md)
- [User Settings Proposal](/docs/development/user-settings-proposal.md)
