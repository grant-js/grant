---
title: Privacy Settings
description: Data export, account deletion, and retention for GDPR compliance
---

# Privacy Settings

Grant provides built-in privacy controls for GDPR compliance: data export, account deletion with configurable retention, and automated cleanup.

## Data Export

Users can download all their personal data as a structured JSON file.

**Included:**

- User profile (ID, name, email, timestamps)
- Accounts owned (personal and organization)
- Authentication methods (providers, verification status)
- Password credentials: whether one exists, its scope (platform, or a project), its source and its dates
- Sessions (device info, IP, expiry)
- Organization and project memberships with roles
- Export metadata (timestamp)

**Excluded** (for security):

- Hashed passwords, tokens, internal system fields, other users' data

**Endpoints:**

```bash
# REST (file download)
GET /api/me/export
Authorization: Bearer <token>
```

```graphql
# GraphQL
query {
  myUserDataExport {
    user {
      id
      name
      email
    }
    accounts {
      id
      name
    }
    exportedAt
  }
}
```

Users can only export their own data — the authenticated user's identity determines the export scope.

## Account Deletion

### Process

1. User confirms intent by entering their **user ID** (works for all auth methods, including OAuth)
2. All accounts owned by the user are **soft-deleted** (`deletedAt` timestamp set)
3. All sessions are invalidated
4. After the retention period, the cleanup job **permanently deletes** the data

### Deletion Types

| Type                      | Behavior                                             | Reversible                    |
| ------------------------- | ---------------------------------------------------- | ----------------------------- |
| **Soft delete** (default) | Marks with `deletedAt`, retains for retention period | Yes — within retention window |
| **Hard delete**           | Immediate permanent removal                          | No                            |

**Endpoints:**

```graphql
mutation {
  deleteAccounts(input: { userId: "user-uuid", hardDelete: false }) {
    id
    deletedAt
  }
}
```

```bash
DELETE /api/me
Authorization: Bearer <token>
Content-Type: application/json
{ "userId": "user-uuid", "hardDelete": false }
```

## Data Retention

| Setting                    | Env Variable                              | Default                  |
| -------------------------- | ----------------------------------------- | ------------------------ |
| Account deletion retention | `PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS` | 30 days                  |
| Backup retention           | `PRIVACY_BACKUP_RETENTION_DAYS`           | 90 days                  |
| Cleanup schedule           | `JOBS_DATA_RETENTION_SCHEDULE`            | `0 2 * * *` (daily 2 AM) |

The **data retention cleanup job** runs on the configured schedule and:

1. Finds accounts soft-deleted longer ago than the retention period
2. Permanently deletes the associated users (cascading to relationships, including their password credentials)
3. Permanently deletes the accounts
4. Permanently deletes soft-deleted password credentials. A credential is soft-deleted when its project membership is removed or when its user is soft-deleted, and has no retention period: it is purged on the next run

See [Job Scheduling](/advanced-topics/job-scheduling) for details on the cleanup job.

## GDPR Coverage

| Right                | Implementation                                                             |
| -------------------- | -------------------------------------------------------------------------- |
| **Data portability** | JSON export via `GET /api/me/export`                                       |
| **Right to erasure** | Account deletion with `DELETE /api/me`                                     |
| **Data retention**   | Configurable periods with automated cleanup                                |
| **Transparency**     | Export shows all stored personal data                                      |
| **Audit trail**      | All deletions logged — see [Audit Logging](/advanced-topics/audit-logging) |

---

**Related:**

- [Job Scheduling](/advanced-topics/job-scheduling) — Data retention cleanup job
- [Audit Logging](/advanced-topics/audit-logging) — Audit trail for privacy operations
