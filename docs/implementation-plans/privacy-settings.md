# Privacy Settings Implementation Plan

## Overview

Privacy settings APIs have been fully implemented to support:

1. **Data Export** - Export current user data (GDPR compliance) ✅ **COMPLETE**
2. **User Account Deletion** - Mark user and all accounts for deletion (soft delete) ✅ **COMPLETE**
3. **Data Retention** - Configurable retention days with automated cleanup job ✅ **COMPLETE**

## ✅ Implementation Status

### Completed Features

- ✅ **Data Export API** (GraphQL query + REST endpoint)
  - Exports user profile, accounts, authentication methods, sessions, organization memberships, and project memberships
  - Returns structured JSON data with all user-related information
  - GDPR-compliant data portability

- ✅ **Account Deletion API** (GraphQL mutation + REST endpoint)
  - Deletes user entity and ALL associated accounts in a single transaction
  - Uses user ID confirmation (works for all authentication methods including OAuth)
  - Soft delete by default (can be restored within retention period)
  - Supports hard delete option for immediate permanent deletion
  - Authorization: Users can only delete their own account

- ✅ **Data Retention Cleanup Job**
  - Scheduled job that runs periodically (configurable via cron)
  - Finds expired soft-deleted accounts (based on retention period)
  - Permanently deletes expired users and accounts
  - Configurable retention period via `PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS` (default: 30 days)

- ✅ **Frontend Integration**
  - Privacy settings UI with data export and account deletion
  - User ID display with copy-to-clipboard functionality
  - User ID confirmation required for account deletion
  - Error handling and user feedback

### Architecture

The implementation follows the established architectural pattern:

- **Handlers** orchestrate services and manage transactions
- **Services** remain pure and only access repositories
- **Repositories** handle all database access
- **Complex queries** (like membership lookups) are handled in repositories

## Current State Analysis

### Database Schema ✅

- **`accounts`** table has:
  - `id`, `name`, `slug`, `type`, `ownerId`
  - `deletedAt` (timestamp) - supports soft delete ✅
  - `createdAt`, `updatedAt`
  - Index on `deletedAt` for efficient queries ✅

- **`users`** table has:
  - `id`, `name`, `email`
  - `deletedAt` (timestamp) - supports soft delete ✅
  - `createdAt`, `updatedAt`

- **`user_sessions`** table exists for session tracking ✅
- **`user_authentication_methods`** table exists for auth methods ✅

### Existing Services ✅

- **`AccountService`** has:
  - ✅ `deleteAccount(params, transaction?)` - supports soft/hard delete
  - ✅ `softDeleteAccount` method in repository
  - ✅ Audit logging for deletions

- **`UserService`** has:
  - ✅ `deleteUser(params, transaction?)` - supports soft/hard delete
  - ✅ `softDeleteUser` method in repository
  - ✅ Audit logging for deletions

### GraphQL Schema ⚠️

- ✅ `deleteAccount` mutation exists
- ✅ `deleteUser` mutation exists
- ❌ No `exportUserData` query/mutation
- ❌ No password verification for account deletion

### Environment Configuration ⚠️

- ❌ No data retention configuration in `env.config.ts`
- ❌ No `.env.example` file with retention settings

## Implementation Plan

### Phase 1: Environment Configuration

#### 1.1 Add Data Retention Configuration

**File:** `apps/api/src/config/env.config.ts`

Add to `SECURITY_CONFIG` or create new `PRIVACY_CONFIG`:

```typescript
export const PRIVACY_CONFIG = {
  /** Data retention period in days for deleted accounts (default: 30) */
  accountDeletionRetentionDays: getEnvNumber('PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS', 30),

  /** Data retention period in days for backups (default: 90) */
  backupRetentionDays: getEnvNumber('PRIVACY_BACKUP_RETENTION_DAYS', 90),
} as const;
```

Add to `config` export:

```typescript
export const config = {
  // ... existing configs
  privacy: PRIVACY_CONFIG,
} as const;
```

#### 1.2 Update .env.example

**File:** Create `apps/api/.env.example` (or update if exists)

```env
# Privacy & Data Retention
# Number of days before permanently deleting soft-deleted accounts
PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS=30

# Number of days to retain encrypted backups after account deletion
PRIVACY_BACKUP_RETENTION_DAYS=90
```

### Phase 2: Data Export API

#### 2.1 Create User Data Export Service

**File:** `apps/api/src/services/user-data-export.service.ts`

```typescript
export class UserDataExportService {
  constructor(
    private readonly repositories: Repositories,
    private readonly user: AuthenticatedUser | null,
    private readonly db: DbSchema
  ) {}

  async exportUserData(userId: string): Promise<UserDataExport> {
    // Collect all user-related data:
    // - User profile (name, email, createdAt, updatedAt)
    // - Accounts (name, slug, type, createdAt, updatedAt)
    // - Authentication methods (provider, providerId, isVerified, createdAt)
    // - Sessions (userAgent, ipAddress, lastUsedAt, expiresAt)
    // - Organization memberships (organization name, role, joinedAt)
    // - Project memberships (project name, role, joinedAt)
    // - Audit logs (if available)
    // Return structured JSON object
  }
}
```

**Data Structure:**

```typescript
interface UserDataExport {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  };
  accounts: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    createdAt: string;
    updatedAt: string;
  }>;
  authenticationMethods: Array<{
    provider: string;
    providerId: string;
    isVerified: boolean;
    isPrimary: boolean;
    lastUsedAt: string | null;
    createdAt: string;
  }>;
  sessions: Array<{
    userAgent: string | null;
    ipAddress: string | null;
    lastUsedAt: string | null;
    expiresAt: string;
    createdAt: string;
  }>;
  organizationMemberships: Array<{
    organizationId: string;
    organizationName: string;
    role: string;
    joinedAt: string;
  }>;
  projectMemberships: Array<{
    projectId: string;
    projectName: string;
    role: string;
    joinedAt: string;
  }>;
  exportedAt: string;
}
```

#### 2.2 Add GraphQL Query for Data Export

**File:** `packages/@logusgraphics/grant-schema/src/schema/users/queries/export-user-data.graphql`

```graphql
type UserDataExport {
  user: UserExportData!
  accounts: [AccountExportData!]!
  authenticationMethods: [AuthenticationMethodExportData!]!
  sessions: [SessionExportData!]!
  organizationMemberships: [OrganizationMembershipExportData!]!
  projectMemberships: [ProjectMembershipExportData!]!
  exportedAt: DateTime!
}

type UserExportData {
  id: ID!
  name: String!
  email: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type AccountExportData {
  id: ID!
  name: String!
  slug: String!
  type: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type AuthenticationMethodExportData {
  provider: String!
  providerId: String!
  isVerified: Boolean!
  isPrimary: Boolean!
  lastUsedAt: DateTime
  createdAt: DateTime!
}

type SessionExportData {
  userAgent: String
  ipAddress: String
  lastUsedAt: DateTime
  expiresAt: DateTime!
  createdAt: DateTime!
}

type OrganizationMembershipExportData {
  organizationId: ID!
  organizationName: String!
  role: String!
  joinedAt: DateTime!
}

type ProjectMembershipExportData {
  projectId: ID!
  projectName: String!
  role: String!
  joinedAt: DateTime!
}

extend type Query {
  exportUserData: UserDataExport!
}
```

**File:** `packages/@logusgraphics/grant-schema/src/operations/users/export-user-data.graphql`

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

#### 2.3 Create GraphQL Resolver

**File:** `apps/api/src/graphql/resolvers/users/queries/export-user-data.resolver.ts`

```typescript
import { QueryResolvers } from '@logusgraphics/grant-schema';
import { GraphqlContext } from '@/graphql/types';

export const exportUserDataResolver: QueryResolvers<GraphqlContext>['exportUserData'] = async (
  _parent,
  _args,
  context
) => {
  const userId = context.user?.id;
  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }

  return await context.services.userDataExport.exportUserData(userId);
};
```

#### 2.4 Add Handler Method

**File:** `apps/api/src/handlers/users.handler.ts`

```typescript
async exportUserData(userId: string): Promise<UserDataExport> {
  return await this.services.userDataExport.exportUserData(userId);
}
```

#### 2.5 Add REST Endpoint

**File:** `apps/api/src/rest/schemas/users.schemas.ts`

Add response schema:

```typescript
export const exportUserDataResponseSchema = z.object({
  user: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.string().email(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  accounts: z.array(/* ... */),
  authenticationMethods: z.array(/* ... */),
  sessions: z.array(/* ... */),
  organizationMemberships: z.array(/* ... */),
  projectMemberships: z.array(/* ... */),
  exportedAt: z.string().datetime(),
});
```

**File:** `apps/api/src/rest/controllers/users.controller.ts`

Add controller method:

```typescript
async exportUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const requestedUserId = req.params.id;

  // Verify user can only export their own data
  if (userId !== requestedUserId) {
    throw new ForbiddenError('You can only export your own data');
  }

  const exportData = await this.context.handlers.users.exportUserData(userId);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);
  res.json(exportData);
}
```

**File:** `apps/api/src/rest/routes/users.routes.ts`

Add route:

```typescript
router.get(
  '/users/:id/export',
  authenticateMiddleware,
  asyncHandler((req, res) => usersController.exportUserData(req, res))
);
```

**File:** `apps/api/src/rest/openapi/users.openapi.ts`

Add OpenAPI documentation:

```typescript
export const exportUserDataEndpoint = {
  get: {
    summary: 'Export user data',
    description: 'Export all personal data for the authenticated user (GDPR compliance)',
    operationId: 'exportUserData',
    tags: ['Users'],
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'User ID (must match authenticated user)',
      },
    ],
    responses: {
      '200': {
        description: 'User data export',
        content: {
          'application/json': {
            schema: exportUserDataResponseSchema,
          },
        },
      },
      '401': { $ref: '#/components/responses/Unauthorized' },
      '403': { $ref: '#/components/responses/Forbidden' },
    },
  },
};
```

### Phase 3: User Account Deletion (Correction Plan)

**⚠️ IMPORTANT CORRECTION:** The current implementation incorrectly treats "account deletion" as deleting a single account workspace. However, when users click "Delete My Account" in privacy settings, they expect to delete their **user entity** and all associated data, not just one workspace.

#### Architecture Clarification

- **Users** are the core identity (with authentication methods: email, GitHub, Google, etc.)
- **Accounts** are workspaces (personal or organization) - users can have up to 2 accounts
- **User relationships** cascade on delete: `user_roles`, `organization_users`, `project_users`, `user_sessions`, `user_authentication_methods`, `user_tags` all have `ON DELETE CASCADE`
- **Accounts** do NOT cascade - `accounts.owner_id` has `ON DELETE NO ACTION` (must be handled manually)

#### Correct Flow

1. User clicks "Delete My Account" in privacy settings
2. **Mark ALL user's accounts for deletion** (soft delete all accounts owned by the user)
3. **Mark user for deletion** (soft delete the user entity)
4. Data retention cleanup job:
   - Find expired accounts (soft-deleted beyond retention period)
   - Get unique owners of those expired accounts
   - Hard delete those users (which cascades to all relationships)
   - Hard delete the accounts (since they won't cascade)

#### 3.1 Create User Deletion Mutation (Privacy Settings)

**File:** `packages/@logusgraphics/grant-schema/src/schema/users/inputs/delete-user-privacy.graphql`

```graphql
input DeleteUserPrivacyInput {
  # No password required - user is already authenticated via JWT
  # For OAuth users (GitHub, Google), password verification doesn't make sense
  # For email users, we could optionally require password, but it's not mandatory
  confirmText: String! # User must type "DELETE" or similar to confirm
}
```

**File:** `packages/@logusgraphics/grant-schema/src/schema/users/mutations/delete-user-privacy.graphql`

```graphql
extend type Mutation {
  deleteMyAccount(input: DeleteUserPrivacyInput!): User!
}
```

#### 3.2 Update User Service - Add Privacy Deletion Method

**File:** `apps/api/src/services/users.service.ts`

```typescript
/**
 * Delete user account from privacy settings
 * This marks ALL user's accounts and the user itself for deletion
 */
public async deleteUserAccount(
  userId: string,
  confirmText: string,
  transaction?: Transaction
): Promise<User> {
  const context = 'UserService.deleteUserAccount';

  // Verify confirmation text
  if (confirmText !== 'DELETE') {
    throw new BadRequestError(
      'Confirmation text must be "DELETE"',
      'errors:validation.invalid',
      { field: 'confirmText' }
    );
  }

  // Get all accounts owned by this user
  const userAccounts = await this.repositories.accountRepository.getAccounts(
    { ownerIds: [userId], limit: -1 },
    transaction
  );

  // Soft delete all user's accounts
  await Promise.all(
    userAccounts.accounts.map((account) =>
      this.repositories.accountRepository.softDeleteAccount(
        { input: { id: account.id } },
        transaction
      )
    )
  );

  // Soft delete the user (this will cascade to relationships when hard deleted)
  return await this.deleteUser(
    { id: userId, hardDelete: false },
    transaction
  );
}
```

#### 3.3 Create GraphQL Resolver

**File:** `apps/api/src/graphql/resolvers/users/mutations/delete-user-privacy.resolver.ts`

```typescript
import { MutationResolvers } from '@logusgraphics/grant-schema';
import { AuthenticationError } from '@/lib/errors';
import { GraphqlContext } from '@/graphql/types';

export const deleteMyAccountResolver: MutationResolvers<GraphqlContext>['deleteMyAccount'] = async (
  _parent,
  { input },
  context
) => {
  const userId = context.user?.id;
  if (!userId) {
    throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
  }

  return await context.handlers.users.deleteUserAccount(userId, input.confirmText);
};
```

#### 3.4 Update Handler

**File:** `apps/api/src/handlers/users.handler.ts`

```typescript
public async deleteUserAccount(userId: string, confirmText: string): Promise<User> {
  return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
    return await this.services.users.deleteUserAccount(userId, confirmText, tx);
  });
}
```

#### 3.5 Update Data Retention Cleanup Service

**File:** `apps/api/src/services/data-retention-cleanup.service.ts`

```typescript
async cleanupExpiredAccounts(transaction?: Transaction): Promise<number> {
  const retentionDays = config.privacy.accountDeletionRetentionDays;
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - retentionDays);

  logger.info(
    { retentionDays, retentionDate: retentionDate.toISOString() },
    'Starting cleanup of expired accounts'
  );

  // Find accounts that were deleted before the retention date
  const expiredAccounts = await this.db
    .select({ id: accounts.id, ownerId: accounts.ownerId })
    .from(accounts)
    .where(and(isNotNull(accounts.deletedAt), lt(accounts.deletedAt, retentionDate)));

  if (expiredAccounts.length === 0) {
    logger.debug('No expired accounts found for cleanup');
    return 0;
  }

  logger.info({ count: expiredAccounts.length }, 'Found expired accounts to delete');

  // Get unique user IDs whose accounts have expired
  const expiredUserIds = [...new Set(expiredAccounts.map((a) => a.ownerId))];

  // Hard delete users (this cascades to all relationships via FK constraints)
  let deletedUsers = 0;
  for (const userId of expiredUserIds) {
    try {
      await this.repositories.userRepository.hardDeleteUserById(userId, transaction);
      deletedUsers++;
      logger.debug({ userId }, 'Permanently deleted expired user');
    } catch (error) {
      logger.error({ userId, err: error }, 'Failed to permanently delete expired user');
      // Continue with other users even if one fails
    }
  }

  // Hard delete accounts (they don't cascade, so we need to delete them explicitly)
  let deletedAccounts = 0;
  for (const account of expiredAccounts) {
    try {
      await this.repositories.accountRepository.hardDeleteAccountById(
        account.id,
        transaction
      );
      deletedAccounts++;
      logger.debug({ accountId: account.id }, 'Permanently deleted expired account');
    } catch (error) {
      logger.error(
        { accountId: account.id, err: error },
        'Failed to permanently delete expired account'
      );
      // Continue with other accounts even if one fails
    }
  }

  logger.info(
    { deletedUsers, deletedAccounts, totalFound: expiredAccounts.length },
    'Completed cleanup of expired accounts'
  );

  return deletedAccounts;
}
```

#### 3.6 Add Repository Method for System-Level User Deletion

**File:** `apps/api/src/repositories/users.repository.ts`

```typescript
/**
 * System-level hard delete that bypasses password verification
 * Used by background jobs and cleanup operations
 */
public async hardDeleteUserById(
  userId: string,
  transaction?: Transaction
): Promise<User> {
  const baseParams: BaseDeleteArgs = {
    id: userId,
  };
  return this.hardDelete(baseParams, transaction);
}
```

#### 3.7 Add REST Endpoint (Optional - for consistency)

**File:** `apps/api/src/rest/schemas/users.schemas.ts`

```typescript
export const deleteUserAccountRequestSchema = z.object({
  confirmText: z.string().min(1, 'Confirmation text is required'),
});
```

**File:** `apps/api/src/rest/controllers/users.controller.ts`

```typescript
/**
 * DELETE /api/users/:id/account
 * Delete user account from privacy settings (marks all accounts and user for deletion)
 */
async deleteUserAccount(
  req: TypedRequest<{
    params: typeof userParamsSchema;
    body: typeof deleteUserAccountRequestSchema;
  }>,
  res: Response
) {
  const userId = req.params.id;
  const { confirmText } = req.body;

  // Verify user can only delete their own account
  if (!this.user || this.user.id !== userId) {
    throw new AuthorizationError(
      'You can only delete your own account',
      'errors:auth.forbidden'
    );
  }

  const deletedUser = await this.context.handlers.users.deleteUserAccount(userId, confirmText);

  return this.success(res, deletedUser);
}
```

#### 3.8 Authentication Method Considerations

**Current Issue:** Password verification doesn't work for OAuth users (GitHub, Google, etc.)

**Solution Options:**

1. **Confirmation Text Only** (Recommended):
   - User must type "DELETE" to confirm
   - No password required (works for all auth methods)
   - User is already authenticated via JWT

2. **Conditional Password Verification**:
   - If user has email auth method → require password
   - If user only has OAuth → use confirmation text only
   - More complex but provides extra security for email users

**Recommendation:** Use confirmation text only for simplicity and consistency across all authentication methods.

### Phase 4: Data Retention Cleanup Job (Required)

**Note:** Job scheduling is critical for this feature. See `docs/implementation-plans/job-scheduling-options.md` for detailed options and recommendations. **BullMQ is recommended** for production deployments.

#### 4.1 Update Cleanup Service (Correction)

**File:** `apps/api/src/services/data-retention-cleanup.service.ts`

**Current Implementation:** Only deletes expired accounts.

**Corrected Implementation:** Must also delete the users who own those expired accounts.

```typescript
async cleanupExpiredAccounts(transaction?: Transaction): Promise<number> {
  const retentionDays = config.privacy.accountDeletionRetentionDays;
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - retentionDays);

  // Find accounts that were deleted before the retention date
  const expiredAccounts = await this.db
    .select({ id: accounts.id, ownerId: accounts.ownerId })
    .from(accounts)
    .where(and(isNotNull(accounts.deletedAt), lt(accounts.deletedAt, retentionDate)));

  if (expiredAccounts.length === 0) {
    return 0;
  }

  // Get unique user IDs whose accounts have expired
  const expiredUserIds = [...new Set(expiredAccounts.map((a) => a.ownerId))];

  // Hard delete users first (this cascades to all relationships via FK constraints)
  // Relationships that cascade: user_roles, organization_users, project_users,
  // user_sessions, user_authentication_methods, user_tags
  let deletedUsers = 0;
  for (const userId of expiredUserIds) {
    try {
      await this.repositories.userRepository.hardDeleteUserById(userId, transaction);
      deletedUsers++;
    } catch (error) {
      logger.error({ userId, err: error }, 'Failed to permanently delete expired user');
    }
  }

  // Hard delete accounts (they don't cascade, so we need to delete them explicitly)
  let deletedAccounts = 0;
  for (const account of expiredAccounts) {
    try {
      await this.repositories.accountRepository.hardDeleteAccountById(
        account.id,
        transaction
      );
      deletedAccounts++;
    } catch (error) {
      logger.error({ accountId: account.id, err: error }, 'Failed to permanently delete expired account');
    }
  }

  return deletedAccounts;
}
```

**Note:** The cleanup service is already implemented but needs to be updated to delete users as well. See Phase 3.5 for the corrected implementation.

#### 4.2 Create Scheduled Job Using Adapter Pattern

**Note:** See `docs/implementation-plans/job-scheduling-options.md` for detailed job scheduling options. We'll use the **adapter pattern** (same as email, cache, storage) to support both `node-cron` (dev/single-instance) and `bullmq` (production/multi-instance) providers.

**Architecture:**

- `IJobAdapter` interface - defines job scheduling contract
- `JobFactory` - creates appropriate adapter based on config
- `NodeCronJobAdapter` - simple in-process scheduling
- `BullMQJobAdapter` - distributed scheduling with Redis
- Switch providers via `JOBS_PROVIDER` environment variable

**File:** `apps/api/src/jobs/data-retention-cleanup.job.ts`

```typescript
import { ScheduledJob, JobHandler, JobExecutionContext, JobResult } from '@/lib/jobs';
import { DataRetentionCleanupService } from '@/services/data-retention-cleanup.service';
import { logger } from '@/lib/logger';

export const DATA_RETENTION_JOB_ID = 'data-retention-cleanup';

export function createDataRetentionJob(
  schedule: string = '0 2 * * *' // Daily at 2 AM
): ScheduledJob {
  return {
    id: DATA_RETENTION_JOB_ID,
    name: 'Data Retention Cleanup',
    schedule,
    enabled: true,
  };
}

export function createDataRetentionHandler(
  cleanupService: DataRetentionCleanupService
): JobHandler {
  return async (context: JobExecutionContext): Promise<JobResult> => {
    logger.info({ jobId: context.jobId }, 'Starting data retention cleanup job');

    try {
      const accountsDeleted = await cleanupService.cleanupExpiredAccounts();
      const backupsDeleted = await cleanupService.cleanupExpiredBackups();

      logger.info(
        { jobId: context.jobId, accountsDeleted, backupsDeleted },
        'Data retention cleanup completed'
      );

      return {
        success: true,
        data: { accountsDeleted, backupsDeleted },
      };
    } catch (error) {
      logger.error({ jobId: context.jobId, err: error }, 'Data retention cleanup failed');
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}
```

**File:** `apps/api/src/lib/jobs/initialize.ts`

```typescript
import { JobFactory, IJobAdapter } from './job.factory';
import { config } from '@/config';
import { logger } from '@/lib/logger';
import {
  createDataRetentionJob,
  createDataRetentionHandler,
} from '@/jobs/data-retention-cleanup.job';
import { DataRetentionCleanupService } from '@/services/data-retention-cleanup.service';

let jobAdapter: IJobAdapter | null = null;

export async function initializeJobs(cleanupService: DataRetentionCleanupService): Promise<void> {
  if (!config.jobs?.enabled) {
    logger.info('Job scheduling is disabled');
    return;
  }

  // Create job adapter based on configuration
  jobAdapter = JobFactory.createJobAdapter({
    provider: config.jobs.provider,
    redis: config.jobs.redis,
  });

  // Schedule data retention cleanup job
  const schedule = config.jobs?.dataRetention?.schedule || '0 2 * * *';
  const job = createDataRetentionJob(schedule);
  const handler = createDataRetentionHandler(cleanupService);

  await jobAdapter.schedule(job, handler);

  logger.info(
    {
      provider: config.jobs.provider,
      jobsScheduled: [job.id],
    },
    'Job scheduling initialized'
  );
}

export async function shutdownJobs(): Promise<void> {
  if (jobAdapter) {
    await jobAdapter.shutdown();
    jobAdapter = null;
    logger.info('Job scheduling shut down');
  }
}
```

**Update:** `apps/api/src/server.ts`

```typescript
import { initializeJobs, shutdownJobs } from '@/lib/jobs/initialize';
import { DataRetentionCleanupService } from '@/services/data-retention-cleanup.service';

// After server starts, initialize jobs
if (config.jobs?.enabled) {
  const cleanupService = new DataRetentionCleanupService(/* ... */);
  await initializeJobs(cleanupService);
}

// In graceful shutdown
await shutdownJobs();
```

**Note:** The adapter pattern allows switching between `node-cron` (for development/single-instance) and `bullmq` (for production/multi-instance) via the `JOBS_PROVIDER` environment variable. See `docs/implementation-plans/job-scheduling-options.md` for full adapter implementation details (interface, factory, and adapters).

### Phase 5: Frontend Integration

#### 5.1 Update Privacy Settings Component

**File:** `apps/web/components/settings/PrivacySettings.tsx`

- Replace placeholder `handleExportData` with actual GraphQL query
- Replace placeholder `handleDeleteAccount` with actual mutation
- Add error handling and success notifications

#### 5.2 Create GraphQL Hooks

**File:** `apps/web/hooks/users/useUserDataExport.ts`

```typescript
export function useUserDataExport() {
  const { data, loading, error } = useQuery(ExportUserDataDocument);

  const exportData = async () => {
    // Trigger download of JSON file
  };

  return { exportData, loading, error };
}
```

**File:** `apps/web/hooks/accounts/useAccountDeletion.ts`

```typescript
export function useAccountDeletion() {
  const [deleteAccount, { loading, error }] = useMutation(DeleteAccountDocument);

  const handleDelete = async (accountId: string, password: string) => {
    await deleteAccount({
      variables: {
        input: {
          id: accountId,
          password,
        },
      },
    });
  };

  return { deleteAccount: handleDelete, loading, error };
}
```

#### 5.3 Update Privacy Settings Component

**File:** `apps/web/components/settings/PrivacySettings.tsx`

```typescript
const { exportData, loading: exporting } = useUserDataExport();
const { deleteAccount, loading: deleting } = useAccountDeletion();

const handleExportData = async () => {
  try {
    const data = await exportData();
    // Trigger download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-data-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    // Handle error
  }
};

const handleDeleteAccount = async (password: string) => {
  try {
    await deleteAccount(currentAccountId, password);
    // Show success message
    // Redirect to logout/login
  } catch (error) {
    // Handle error
  }
};
```

## Implementation Summary

### ✅ All Phases Completed

1. **Phase 1:** Environment configuration (retention days) ✅
2. **Phase 2:** Data export API (GraphQL query + REST endpoint) ✅
3. **Phase 3:** User account deletion API ✅
   - `deleteAccount` mutation deletes user entity and ALL associated accounts
   - Uses user ID confirmation (works for all authentication methods)
   - Soft delete by default with configurable retention period
4. **Phase 4:** Data retention cleanup job ✅
   - Scheduled job finds and permanently deletes expired accounts/users
   - Configurable via environment variables
5. **Phase 5:** Frontend integration ✅
   - Privacy settings UI with data export and account deletion
   - User ID confirmation with copy-to-clipboard functionality
   - Error handling and user feedback

### Implementation Details

**Account Deletion Flow:**

1. User requests account deletion from privacy settings
2. System displays user ID with copy button
3. User confirms by entering their user ID
4. Frontend validates user ID matches
5. GraphQL mutation `deleteAccount` is called with `userId`
6. Handler orchestrates deletion:
   - Gets all accounts owned by user
   - Soft deletes all accounts
   - Soft deletes user entity
   - All operations in a single transaction
7. Data retention job runs periodically:
   - Finds accounts deleted more than retention period ago
   - Gets unique user IDs from expired accounts
   - Permanently deletes users (cascades to relationships)
   - Permanently deletes accounts

## Security Considerations

1. **Authorization:**
   - ✅ Users can only export their own data
   - ✅ Users can only delete their own accounts
   - ✅ User ID confirmation required for account deletion (prevents accidental deletion)
   - ✅ User ID must match authenticated user's ID

2. **Data Privacy:**
   - ✅ Don't export sensitive data (hashed passwords, tokens)
   - ✅ Don't export other users' data in exports
   - ✅ Exclude internal system fields
   - ✅ All date fields properly formatted as ISO strings

3. **User Account Deletion:**
   - ✅ Soft delete user and all their accounts by default (can restore within retention period)
   - ✅ User ID confirmation prevents accidental deletion (works for all auth methods including OAuth)
   - ✅ All operations in a single transaction (atomic)
   - ✅ Audit logging for all deletions
   - ✅ User relationships cascade on hard delete (via FK constraints)
   - ✅ Accounts must be explicitly deleted (don't cascade)

4. **Data Retention:**
   - ✅ Configurable retention periods via environment variables
   - ✅ Automated cleanup job prevents data accumulation
   - ✅ Backup retention separate from account retention
   - ✅ Job runs on configurable schedule (cron pattern)

## Testing Checklist

### Backend Tests

**GraphQL Tests:**

- ✅ Data export query includes all user data (user, accounts, auth methods, sessions, memberships)
- ✅ Data export query excludes sensitive data (hashed passwords, tokens)
- ✅ Data export query only includes user's own data
- ✅ User account deletion mutation requires user ID confirmation
- ✅ User account deletion mutation marks all user's accounts for deletion
- ✅ User account deletion mutation marks user for deletion
- ✅ User account deletion mutation performs soft delete by default
- ✅ Authorization checks prevent unauthorized access (users can only delete their own account)

**REST API Tests:**

- ✅ `GET /api/users/:id/export` returns user data as JSON
- ✅ `GET /api/users/:id/export` sets correct Content-Disposition header
- ✅ `GET /api/users/:id/export` only allows users to export their own data
- ✅ `DELETE /api/users/:id/account` requires userId in request body
- ✅ `DELETE /api/users/:id/account` marks all user's accounts for deletion
- ✅ `DELETE /api/users/:id/account` marks user for deletion
- ✅ `DELETE /api/users/:id/account` only allows users to delete their own account
- ✅ REST endpoints return proper error codes (401, 403, 404)
- ✅ REST endpoints validate request schemas

**Service Layer Tests:**

- ✅ Soft-deleted accounts can be queried with deletedAt filter
- ✅ Data retention cleanup removes expired accounts
- ✅ Data retention cleanup removes expired users (cascades to relationships)
- ✅ User ID validation works correctly (frontend and backend)

### Frontend Tests

- ✅ Export button triggers data download (via GraphQL query)
- ✅ Export data is valid JSON with proper structure
- ✅ Delete account dialog displays user ID with copy-to-clipboard
- ✅ Delete account dialog requires user ID confirmation
- ✅ Delete account fails with incorrect user ID
- ✅ Delete account shows success message
- ✅ User is logged out after account deletion
- ✅ Error handling displays appropriate messages
- ✅ REST endpoints available as alternative to GraphQL

## Configuration

### Environment Variables

```env
# Privacy & Data Retention
PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS=30
PRIVACY_BACKUP_RETENTION_DAYS=90
```

### Default Values

- Account deletion retention: **30 days**
- Backup retention: **90 days**

## API Changes

### New GraphQL Query

```graphql
query ExportUserData {
  exportUserData {
    user { ... }
    accounts { ... }
    # ... other data
    exportedAt
  }
}
```

### New REST Endpoint - Data Export

```http
GET /api/users/:id/export
Authorization: Bearer <token>
```

**Response:** JSON file download with user data

**OpenAPI:** Documented in `apps/api/src/rest/openapi/users.openapi.ts`

### GraphQL Mutation - User Account Deletion

```graphql
mutation DeleteAccount($input: DeleteAccountInput!) {
  deleteAccount(input: $input) {
    id
    name
    deletedAt
  }
}
```

**Input:**

```graphql
input DeleteAccountInput {
  userId: ID!
  hardDelete: Boolean
}
```

**Note:** The `deleteAccount` mutation deletes the user entity and ALL associated accounts. It's used for privacy settings and requires user ID confirmation.

### REST Endpoint - User Account Deletion

```http
DELETE /api/users/:id/account
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "hardDelete": false
}
```

**Response:** Deleted user object (with all accounts soft-deleted)

**OpenAPI:** Documented in `apps/api/src/rest/openapi/users.openapi.ts`

**Authorization:** Users can only delete their own account. The `userId` in the request body must match the authenticated user's ID.

## Notes

- ✅ Data export is GDPR-compliant (right to data portability)
- ✅ User account deletion uses soft delete to allow recovery within retention period
- ✅ User ID confirmation prevents accidental deletions (works for all auth methods including OAuth)
- ✅ No password verification required (OAuth users don't have passwords)
- ✅ Data retention periods are configurable via environment variables
- ✅ Job scheduling implemented - see `docs/advanced-topics/job-scheduling.md` for details
- ✅ Frontend UI fully integrated with user ID confirmation and copy-to-clipboard
- ✅ **Database foreign keys:** User relationships cascade on delete, but accounts don't - accounts are explicitly deleted
- ✅ **Architecture:** Handlers orchestrate services, services access repositories, repositories handle DB access

## API Reference

### GraphQL Query - Export User Data

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

### GraphQL Mutation - Delete Account

```graphql
mutation DeleteAccount($input: DeleteAccountInput!) {
  deleteAccount(input: $input) {
    id
    name
    deletedAt
  }
}
```

**Variables:**

```json
{
  "input": {
    "userId": "user-uuid",
    "hardDelete": false
  }
}
```

### REST Endpoints

**Export User Data:**

```http
GET /api/users/:id/export
Authorization: Bearer <token>
```

**Delete Account:**

```http
DELETE /api/users/:id/account
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "hardDelete": false
}
```
