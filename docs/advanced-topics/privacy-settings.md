---
title: Privacy Settings
description: User data export and account deletion with configurable retention periods
---

# Privacy Settings

Grant provides comprehensive privacy settings to help users manage their data and comply with GDPR requirements. This includes data export capabilities and account deletion with configurable retention periods.

## Overview

The privacy settings feature enables users to:

1. **Export their data** - Download all user-related information in a structured JSON format (GDPR right to data portability)
2. **Delete their account** - Request account deletion with user ID confirmation
3. **Understand data retention** - View information about data retention policies

All operations are designed to be secure, auditable, and compliant with privacy regulations.

## Data Export

### Purpose

The data export feature allows users to download all their personal data stored in the platform. This is essential for GDPR compliance and gives users transparency about what data is stored.

### What's Included

The exported data includes:

- **User Profile**: ID, name, email, creation and update timestamps
- **Accounts**: All accounts owned by the user (personal and organization accounts)
- **Authentication Methods**: All authentication methods (email, OAuth providers) with verification status
- **Sessions**: All active and expired sessions with device and location information
- **Organization Memberships**: Organizations the user belongs to with their roles
- **Project Memberships**: Projects the user belongs to with their roles
- **Export Metadata**: Timestamp of when the export was generated

### What's Excluded

For security and privacy reasons, the following data is **not** included in exports:

- Hashed passwords
- Authentication tokens
- Internal system fields
- Other users' data
- Encrypted backup data

### API Usage

**GraphQL Query:**

```graphql
query ExportUserData {
  exportUserData {
    user {
      id
      name
      email
      createdAt
      updatedAt
    }
    accounts {
      id
      name
      slug
      type
      createdAt
      updatedAt
    }
    authenticationMethods {
      provider
      providerId
      isVerified
      isPrimary
      lastUsedAt
      createdAt
    }
    sessions {
      userAgent
      ipAddress
      lastUsedAt
      expiresAt
      createdAt
    }
    organizationMemberships {
      organizationId
      organizationName
      role
      joinedAt
    }
    projectMemberships {
      projectId
      projectName
      role
      joinedAt
    }
    exportedAt
  }
}
```

**REST Endpoint:**

```http
GET /api/users/:id/export
Authorization: Bearer <token>
```

**Response:** JSON file download with user data

### Authorization

- Users can only export their own data
- The user ID in the request must match the authenticated user's ID
- Unauthorized requests return a 403 Forbidden error

## Account Deletion

### Purpose

Account deletion allows users to permanently remove their account and all associated data from the platform. This is a critical privacy feature that gives users control over their data.

### Deletion Process

1. **User Confirmation**: Users must confirm their intent by entering their user ID
2. **Soft Delete**: By default, accounts are soft-deleted (marked with `deletedAt` timestamp)
3. **Retention Period**: Soft-deleted accounts are retained for a configurable period (default: 30 days)
4. **Permanent Deletion**: After the retention period, accounts are permanently deleted by the cleanup job

### What Gets Deleted

When a user deletes their account:

- **All Accounts**: All accounts owned by the user (personal and organization accounts) are marked for deletion
- **User Entity**: The user entity itself is marked for deletion
- **Cascading Effects**: User relationships (roles, groups, memberships) are handled via database cascade rules
- **Sessions**: All user sessions are invalidated
- **Access**: The user loses access to all organizations and projects

### User ID Confirmation

Instead of password verification (which doesn't work for OAuth users), the platform uses **user ID confirmation**:

1. The system displays the user's ID with a copy-to-clipboard button
2. The user must enter their user ID to confirm deletion
3. This prevents accidental deletions while working for all authentication methods

### API Usage

**GraphQL Mutation:**

```graphql
mutation DeleteAccounts($input: DeleteAccountsInput!) {
  deleteAccounts(input: $input) {
    id
    name
    deletedAt
  }
}
```

**Input:**

```graphql
input DeleteAccountsInput {
  userId: ID!
  hardDelete: Boolean
}
```

**REST Endpoint:**

```http
DELETE /api/users/:id/account
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "hardDelete": false
}
```

### Authorization

- Users can only delete their own account
- The `userId` in the request must match the authenticated user's ID
- Unauthorized requests return a 403 Forbidden error

### Deletion Types

**Soft Delete (Default):**

- Accounts and users are marked with `deletedAt` timestamp
- Data is retained for the retention period (configurable, default: 30 days)
- Can be restored within the retention period
- Used for accidental deletions and compliance requirements

**Hard Delete:**

- Permanently removes accounts and users immediately
- Cannot be undone
- Use with caution - only for immediate permanent deletion
- Set `hardDelete: true` in the request

## Data Retention

### Retention Periods

Data retention periods are configurable via environment variables:

- **Account Deletion Retention**: `PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS` (default: 30 days)
- **Backup Retention**: `PRIVACY_BACKUP_RETENTION_DAYS` (default: 90 days)

### Cleanup Job

The data retention cleanup job runs periodically to permanently delete expired accounts:

1. **Finds Expired Accounts**: Accounts deleted more than the retention period ago
2. **Gets User IDs**: Extracts unique user IDs from expired accounts
3. **Permanently Deletes Users**: Hard deletes users (cascades to relationships)
4. **Permanently Deletes Accounts**: Hard deletes accounts (they don't cascade)

**Configuration:**

```env
# Job scheduling
JOBS_DATA_RETENTION_SCHEDULE="0 2 * * *"  # Daily at 2 AM
JOBS_DATA_RETENTION_ENABLED=true

# Retention periods
PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS=30
PRIVACY_BACKUP_RETENTION_DAYS=90
```

### Restoring Deleted Accounts

During the retention period, soft-deleted accounts can be restored by:

1. Removing the `deletedAt` timestamp
2. Restoring all associated accounts
3. Re-enabling user access

After the retention period, accounts are permanently deleted and cannot be restored.

## Security Considerations

### Authorization

- ✅ Users can only export their own data
- ✅ Users can only delete their own accounts
- ✅ User ID confirmation prevents accidental deletions
- ✅ User ID must match authenticated user's ID

### Data Privacy

- ✅ Sensitive data (hashed passwords, tokens) excluded from exports
- ✅ Other users' data not included in exports
- ✅ Internal system fields excluded
- ✅ All date fields properly formatted as ISO strings

### Audit Logging

- ✅ All account deletions are logged for audit purposes
- ✅ Export operations can be logged (if required)
- ✅ Retention cleanup operations are logged

### Transaction Safety

- ✅ Account deletion operations are atomic (single transaction)
- ✅ All accounts and user deleted together or not at all
- ✅ No partial deletions possible

## Frontend Integration

The privacy settings are accessible via the web interface at `/dashboard/settings/privacy`:

- **Data Export**: Button to download user data as JSON
- **Account Deletion**: Dialog with user ID display and confirmation
- **Data Retention Info**: Information about retention policies

### User Experience

1. **Data Export**:
   - Click "Export Data" button
   - Data is downloaded as JSON file
   - File name includes user ID and timestamp

2. **Account Deletion**:
   - Click "Delete My Account" button
   - Dialog shows user ID with copy button
   - User must enter their user ID to confirm
   - Warning messages explain consequences
   - User is logged out after successful deletion

## Configuration

### Environment Variables

```env
# Privacy & Data Retention
PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS=30
PRIVACY_BACKUP_RETENTION_DAYS=90

# Job Scheduling
JOBS_DATA_RETENTION_SCHEDULE="0 2 * * *"
JOBS_DATA_RETENTION_ENABLED=true
```

### Default Values

- Account deletion retention: **30 days**
- Backup retention: **90 days**
- Cleanup job schedule: **Daily at 2 AM**

## Compliance

### GDPR Compliance

The privacy settings feature helps ensure GDPR compliance:

- ✅ **Right to Data Portability**: Users can export their data
- ✅ **Right to Erasure**: Users can delete their accounts
- ✅ **Data Retention**: Configurable retention periods
- ✅ **Transparency**: Users can see what data is stored
- ✅ **Security**: Proper authorization and audit logging

### Best Practices

1. **Regular Exports**: Encourage users to export their data periodically
2. **Clear Communication**: Explain data retention policies clearly
3. **Easy Deletion**: Make account deletion accessible but secure
4. **Audit Trail**: Log all privacy-related operations
5. **Data Minimization**: Only store necessary data

## Related Documentation

- [Implementation Plan](/implementation-plans/privacy-settings) - Detailed implementation guide
- [Job Scheduling](/advanced-topics/job-scheduling) - How scheduled jobs work
- [Audit Logging](/advanced-topics/audit-logging) - Audit trail management
- [API Reference](/api-reference/rest-api) - Complete API documentation
