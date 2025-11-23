# Backup System Requirements for Data Retention

## Overview

The `cleanupExpiredBackups()` method in `DataRetentionCleanupService` is currently a placeholder. This document outlines what infrastructure and components are needed before implementing backup cleanup functionality.

## Current State

**Status**: ❌ **Not Implemented**

The `cleanupExpiredBackups()` method currently:

- Returns `0` (no backups to clean)
- Logs that backup cleanup is not yet implemented
- Has no actual backup storage or management system

## What Are "Backups" in This Context?

Based on the privacy settings UI and GDPR compliance requirements, "backups" refer to:

**Encrypted snapshots of user data** created before account deletion, stored separately from the main database for disaster recovery purposes. These backups:

1. **Purpose**: Disaster recovery and compliance (GDPR right to data portability)
2. **Content**: Complete user data export (same as data export API)
3. **Storage**: Encrypted, separate from production database
4. **Retention**: 90 days after account deletion (configurable)
5. **Access**: Restricted to system/admin operations only

## Required Infrastructure

### 1. Database Schema

**New Table**: `user_data_backups`

```sql
CREATE TABLE user_data_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  account_id UUID REFERENCES accounts(id),
  backup_type VARCHAR(50) NOT NULL, -- 'account_deletion' | 'manual' | 'scheduled'
  encrypted_data BYTEA NOT NULL, -- Encrypted JSON blob
  encryption_key_id VARCHAR(255), -- Reference to encryption key
  file_path VARCHAR(500), -- If stored in file system
  file_size BIGINT, -- Size in bytes
  checksum VARCHAR(64), -- SHA-256 checksum for integrity
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP NOT NULL, -- When backup should be deleted
  deleted_at TIMESTAMP, -- Soft delete timestamp
  metadata JSONB, -- Additional metadata (encryption method, compression, etc.)
  created_by UUID NOT NULL REFERENCES users(id) -- System user ID
);

CREATE INDEX idx_user_data_backups_user_id ON user_data_backups(user_id);
CREATE INDEX idx_user_data_backups_expires_at ON user_data_backups(expires_at);
CREATE INDEX idx_user_data_backups_deleted_at ON user_data_backups(deleted_at);
```

**Schema File**: `packages/@logusgraphics/grant-database/src/schemas/user-data-backups.schema.ts`

### 2. Backup Service

**New Service**: `UserDataBackupService`

**File**: `apps/api/src/services/user-data-backup.service.ts`

**Responsibilities**:

- Create encrypted backups before account deletion
- Store backups (database or file system)
- Retrieve backups (for recovery)
- Delete expired backups
- Manage encryption/decryption

**Key Methods**:

```typescript
export class UserDataBackupService {
  /**
   * Create an encrypted backup of user data before deletion
   */
  async createBackup(
    userId: string,
    accountId: string,
    backupType: 'account_deletion' | 'manual' | 'scheduled',
    transaction?: Transaction
  ): Promise<UserDataBackup>;

  /**
   * Retrieve and decrypt a backup (admin/system only)
   */
  async getBackup(backupId: string): Promise<DecryptedBackup>;

  /**
   * Delete expired backups
   */
  async deleteExpiredBackups(retentionDate: Date, transaction?: Transaction): Promise<number>;

  /**
   * Get all backups for a user (for recovery)
   */
  async getUserBackups(userId: string): Promise<UserDataBackup[]>;
}
```

### 3. Encryption Infrastructure

**Requirements**:

- **Encryption Library**: Use Node.js `crypto` module or a library like `node-forge`
- **Key Management**:
  - Option A: Application-level encryption key (stored in env, rotated periodically)
  - Option B: AWS KMS / HashiCorp Vault (for production)
- **Encryption Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Rotation**: Support for key rotation without re-encrypting all backups

**Configuration**:

```typescript
export const BACKUP_CONFIG = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyId: getEnv('BACKUP_ENCRYPTION_KEY_ID', 'default'),
    keyRotationEnabled: getEnvBoolean('BACKUP_KEY_ROTATION_ENABLED', false),
  },
  storage: {
    provider: getEnvEnum(
      'BACKUP_STORAGE_PROVIDER',
      ['database', 'filesystem', 's3'] as const,
      'database'
    ),
    // ... storage-specific config
  },
} as const;
```

### 4. Storage Options

#### Option A: Database Storage (Simplest)

**Pros**:

- ✅ Simple implementation
- ✅ Transactional consistency
- ✅ Easy to query and manage
- ✅ No additional infrastructure

**Cons**:

- ❌ Increases database size
- ❌ May impact performance for large backups
- ❌ Database backups include backup data (circular)

**Implementation**:

- Store encrypted JSON in `encrypted_data` BYTEA column
- Use PostgreSQL compression if needed

#### Option B: File System Storage

**Pros**:

- ✅ Separated from database
- ✅ Can use existing file storage adapter
- ✅ Better for large backups

**Cons**:

- ❌ Requires shared filesystem in multi-instance deployments
- ❌ More complex backup management
- ❌ File system backups needed separately

**Implementation**:

- Use existing `FileStorageService` adapter
- Store file path in database
- Encrypt files before storage

#### Option C: S3/Object Storage (Recommended for Production)

**Pros**:

- ✅ Scalable
- ✅ Separated from database
- ✅ Built-in lifecycle policies
- ✅ Can use existing S3 adapter

**Cons**:

- ❌ Requires S3 infrastructure
- ❌ Additional cost
- ❌ More complex setup

**Implementation**:

- Use existing `FileStorageService` with S3 adapter
- Store S3 path in database
- Use S3 lifecycle policies for automatic cleanup

### 5. Integration Points

#### Account Deletion Flow

**Update**: `AccountService.deleteAccount()`

```typescript
async deleteAccount(params: MutationDeleteAccountArgs): Promise<Account> {
  return await TransactionManager.withTransaction(this.db, async (tx) => {
    // 1. Create backup BEFORE deletion
    await this.backupService.createBackup(
      account.ownerId,
      account.id,
      'account_deletion',
      tx
    );

    // 2. Soft delete account
    return await this.softDeleteAccount(params, tx);
  });
}
```

#### Data Retention Cleanup Flow

**Update**: `DataRetentionCleanupService.cleanupExpiredBackups()`

```typescript
async cleanupExpiredBackups(transaction?: Transaction): Promise<number> {
  const retentionDays = config.privacy.backupRetentionDays;
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - retentionDays);

  // Find expired backups
  const expiredBackups = await this.db
    .select({ id: userDataBackups.id })
    .from(userDataBackups)
    .where(
      and(
        isNotNull(userDataBackups.expiresAt),
        lt(userDataBackups.expiresAt, retentionDate),
        isNull(userDataBackups.deletedAt)
      )
    );

  // Delete each expired backup
  let deletedCount = 0;
  for (const backup of expiredBackups) {
    // Delete from storage (S3/filesystem) if applicable
    await this.backupService.deleteBackup(backup.id, transaction);
    deletedCount++;
  }

  return deletedCount;
}
```

## Implementation Checklist

### Phase 1: Database Schema

- [ ] Create `user_data_backups` table schema
- [ ] Add migration
- [ ] Create repository (`UserDataBackupRepository`)
- [ ] Add to schema exports

### Phase 2: Encryption Infrastructure

- [ ] Create encryption service/utility
- [ ] Implement key management
- [ ] Add encryption configuration to `env.config.ts`
- [ ] Add encryption keys to `.env.example` (with warnings)

### Phase 3: Backup Service

- [ ] Create `UserDataBackupService`
- [ ] Implement `createBackup()` method
- [ ] Implement `deleteExpiredBackups()` method
- [ ] Implement `getBackup()` method (for recovery)
- [ ] Add to services registry

### Phase 4: Storage Integration

- [ ] Choose storage provider (database/filesystem/s3)
- [ ] Implement storage-specific logic
- [ ] Add storage configuration
- [ ] Test with different storage providers

### Phase 5: Account Deletion Integration

- [ ] Update `AccountService.deleteAccount()` to create backup
- [ ] Test backup creation during deletion
- [ ] Verify encryption works correctly

### Phase 6: Cleanup Implementation

- [ ] Implement `cleanupExpiredBackups()` in `DataRetentionCleanupService`
- [ ] Test cleanup job
- [ ] Verify backups are deleted after retention period

### Phase 7: Recovery/Admin Tools (Optional)

- [ ] Admin API to list backups
- [ ] Admin API to restore from backup
- [ ] Admin API to manually delete backups

## Security Considerations

1. **Encryption**:
   - All backups must be encrypted at rest
   - Use authenticated encryption (AES-GCM)
   - Store encryption keys securely (env vars or key management service)

2. **Access Control**:
   - Only system user can create backups
   - Only admins can retrieve/restore backups
   - No user-facing API for backup access

3. **Data Privacy**:
   - Backups contain complete user data (same as export)
   - Must comply with GDPR requirements
   - Must be deleted after retention period

4. **Audit Logging**:
   - Log all backup creation
   - Log all backup deletions
   - Log all backup access (admin operations)

## Configuration

### Environment Variables

```env
# Backup Storage Configuration
BACKUP_STORAGE_PROVIDER=database  # 'database' | 'filesystem' | 's3'

# Encryption Configuration
BACKUP_ENCRYPTION_KEY_ID=default
BACKUP_ENCRYPTION_KEY=<base64-encoded-key>  # For application-level encryption
BACKUP_KEY_ROTATION_ENABLED=false

# S3 Storage (if BACKUP_STORAGE_PROVIDER=s3)
BACKUP_S3_BUCKET=grant-backups
BACKUP_S3_PREFIX=user-backups/
BACKUP_S3_REGION=us-east-1

# File System Storage (if BACKUP_STORAGE_PROVIDER=filesystem)
BACKUP_FILESYSTEM_PATH=/var/backups/grant-platform
```

## Alternative: Simplified Approach

If full backup infrastructure is not needed immediately, consider:

1. **Skip Backup Cleanup**: Remove `cleanupExpiredBackups()` call from job (or keep as no-op)
2. **Future Implementation**: Implement backup system when needed
3. **Documentation**: Update UI to clarify backups are "planned" not "current"

**Trade-off**: Privacy settings UI mentions backups, but they're not actually created. This may need UI updates to reflect current state.

## Recommendation

**For MVP/Initial Release**:

- Keep `cleanupExpiredBackups()` as no-op (returns 0)
- Document that backup system is planned
- Focus on account deletion cleanup (which is critical)

**For Production**:

- Implement backup system before enabling in production
- Start with database storage (simplest)
- Migrate to S3 storage as needed
- Ensure encryption is properly implemented

## Related Documentation

- [Privacy Settings Implementation Plan](./privacy-settings.md)
- [File Storage Architecture](../architecture/file-storage.md)
- [Job Scheduling Documentation](../advanced-topics/job-scheduling.md)
