---
title: Transaction Management
description: Transaction-aware architecture for atomic operations
---

# Transaction Management

This document outlines the new transaction-aware architecture that moves complex multi-step operations from the frontend to the backend, ensuring atomicity and proper connection reuse across the entire request lifecycle.

## Overview

This document outlines the new transaction-aware architecture that moves complex multi-step operations from the frontend to the backend, ensuring atomicity and proper connection reuse across the entire request lifecycle.

## Architecture Benefits

### 1. **Atomic Operations**

- Complex operations spanning multiple repositories are now atomic
- All-or-nothing behavior prevents partial state corruption
- Proper rollback on any failure

### 2. **Connection Reuse**

- Single database connection per request flows through entire chain
- Prevents connection pool exhaustion
- Maintains transaction scope across all operations

### 3. **Backend Orchestration**

- Business logic moved from frontend to backend
- Single API call instead of multiple mutations
- Better error handling and validation

### 4. **Service Coordination**

- Services now have access to all repositories via the repositories object
- Enables complex orchestration without tight coupling
- Clean separation of concerns

## Current Implementation Status

### ✅ **Completed Components**

#### **Transaction Infrastructure**

- `TransactionManager` class for wrapping Drizzle transactions
- `Transaction` type alias for type safety
- Proper connection reuse within transaction scope

#### **Repository Layer**

- All 25+ repositories updated with factory functions
- Base `EntityRepository` and `PivotRepository` support transactions
- Connection injection via constructor
- Transaction parameters in all CRUD methods

#### **Service Layer**

- Services updated to accept repositories object
- Transaction-aware service methods
- Proper error handling and rollback

#### **GraphQL Resolvers**

- Resolvers updated to use transaction-aware services
- Single transaction per GraphQL operation
- Automatic rollback on errors

### 🚧 **In Progress**

#### **Migration Scripts**

- Database migration scripts for transaction support
- Data migration for existing records
- Rollback procedures

#### **Testing**

- Unit tests for transaction scenarios
- Integration tests for complex operations
- Performance testing for transaction overhead

## Transaction Infrastructure

### TransactionManager Class

```typescript
export class TransactionManager {
  constructor(private db: DrizzleDatabase) {}

  async execute<T>(operation: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      try {
        return await operation(tx);
      } catch (error) {
        // Transaction will automatically rollback
        throw error;
      }
    });
  }

  async executeWithRetry<T>(
    operation: (tx: Transaction) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(operation);
      } catch (error) {
        lastError = error;

        // Only retry on specific errors
        if (this.isRetryableError(error) && attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 100); // Exponential backoff
          continue;
        }

        throw error;
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: Error): boolean {
    // Retry on deadlocks, timeouts, and connection issues
    return (
      error.message.includes('deadlock') ||
      error.message.includes('timeout') ||
      error.message.includes('connection')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Transaction Type Definition

```typescript
import type { DrizzleDatabase } from '@grantjs/database';

export type Transaction = Parameters<Parameters<DrizzleDatabase['transaction']>[0]>[0];
```

## Repository Pattern

### Base Repository with Transaction Support

```typescript
export abstract class EntityRepository<TEntity, TCreate, TUpdate> {
  constructor(
    protected db: DrizzleDatabase,
    protected table: Table,
    protected auditTable: Table
  ) {}

  async create(data: TCreate, performedBy: string, tx?: Transaction): Promise<TEntity> {
    const executor = tx || this.db;

    return executor.transaction(async (transaction) => {
      // Create entity
      const [entity] = await transaction.insert(this.table).values(data).returning();

      // Create audit log
      await transaction.insert(this.auditTable).values({
        entityId: entity.id,
        action: 'CREATE',
        newValues: JSON.stringify(entity),
        performedBy,
      });

      return entity;
    });
  }

  async update(id: string, data: TUpdate, performedBy: string, tx?: Transaction): Promise<TEntity> {
    const executor = tx || this.db;

    return executor.transaction(async (transaction) => {
      // Get old values
      const [oldEntity] = await transaction.select().from(this.table).where(eq(this.table.id, id));

      if (!oldEntity) {
        throw new Error(`Entity with id ${id} not found`);
      }

      // Update entity
      const [updatedEntity] = await transaction
        .update(this.table)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(this.table.id, id))
        .returning();

      // Create audit log
      await transaction.insert(this.auditTable).values({
        entityId: id,
        action: 'UPDATE',
        oldValues: JSON.stringify(oldEntity),
        newValues: JSON.stringify(updatedEntity),
        performedBy,
      });

      return updatedEntity;
    });
  }

  async delete(id: string, performedBy: string, tx?: Transaction): Promise<void> {
    const executor = tx || this.db;

    return executor.transaction(async (transaction) => {
      // Get old values
      const [oldEntity] = await transaction.select().from(this.table).where(eq(this.table.id, id));

      if (!oldEntity) {
        throw new Error(`Entity with id ${id} not found`);
      }

      // Soft delete
      await transaction
        .update(this.table)
        .set({ deletedAt: new Date() })
        .where(eq(this.table.id, id));

      // Create audit log
      await transaction.insert(this.auditTable).values({
        entityId: id,
        action: 'DELETE',
        oldValues: JSON.stringify(oldEntity),
        performedBy,
      });
    });
  }
}
```

### Repository Factory Pattern

```typescript
export function createUserRepository(db: DrizzleDatabase): UserRepository {
  return new UserRepository(db, users, userAuditLogs);
}

export function createRoleRepository(db: DrizzleDatabase): RoleRepository {
  return new RoleRepository(db, roles, roleAuditLogs);
}

// ... more repository factories
```

## Service Layer

### Service with Repository Injection

```typescript
export class UserService {
  constructor(
    private repositories: {
      users: UserRepository;
      roles: RoleRepository;
      permissions: PermissionRepository;
      auditLogs: AuditLogRepository;
    }
  ) {}

  async createUserWithRole(
    userData: CreateUserInput,
    roleId: string,
    performedBy: string
  ): Promise<User> {
    return this.repositories.users.db.transaction(async (tx) => {
      // Create user
      const user = await this.repositories.users.create(userData, performedBy, tx);

      // Assign role
      await this.repositories.roles.assignToUser(roleId, user.id, performedBy, tx);

      // Create audit log for the entire operation
      await this.repositories.auditLogs.create(
        {
          entityType: 'USER',
          entityId: user.id,
          action: 'CREATE_WITH_ROLE',
          metadata: JSON.stringify({ roleId }),
          performedBy,
        },
        tx
      );

      return user;
    });
  }

  async transferUserToOrganization(
    userId: string,
    fromOrgId: string,
    toOrgId: string,
    performedBy: string
  ): Promise<void> {
    return this.repositories.users.db.transaction(async (tx) => {
      // Remove from old organization
      await this.repositories.users.removeFromOrganization(userId, fromOrgId, performedBy, tx);

      // Add to new organization
      await this.repositories.users.addToOrganization(userId, toOrgId, performedBy, tx);

      // Update user's primary organization
      await this.repositories.users.update(
        userId,
        { primaryOrganizationId: toOrgId },
        performedBy,
        tx
      );

      // Create audit log
      await this.repositories.auditLogs.create(
        {
          entityType: 'USER',
          entityId: userId,
          action: 'ORGANIZATION_TRANSFER',
          oldValues: JSON.stringify({ organizationId: fromOrgId }),
          newValues: JSON.stringify({ organizationId: toOrgId }),
          performedBy,
        },
        tx
      );
    });
  }
}
```

## GraphQL Integration

### Transaction-Aware Resolvers

```typescript
export const createUserResolver: MutationResolvers['createUser'] = async (
  _parent,
  args,
  context
) => {
  const { repositories, currentUser } = context;

  try {
    return await repositories.users.db.transaction(async (tx) => {
      // Create user
      const user = await repositories.users.create(args.input, currentUser.id, tx);

      // Assign default role if specified
      if (args.input.defaultRoleId) {
        await repositories.roles.assignToUser(
          args.input.defaultRoleId,
          user.id,
          currentUser.id,
          tx
        );
      }

      return user;
    });
  } catch (error) {
    // Transaction automatically rolls back
    throw new GraphQLError('Failed to create user', {
      extensions: { code: 'USER_CREATION_FAILED' },
    });
  }
};
```

### Context with Repositories

```typescript
export interface GraphQLContext {
  db: DrizzleDatabase;
  repositories: {
    users: UserRepository;
    roles: RoleRepository;
    permissions: PermissionRepository;
    organizations: OrganizationRepository;
    projects: ProjectRepository;
    // ... more repositories
  };
  currentUser: User;
  transactionManager: TransactionManager;
}

export function createContext(req: Request): GraphQLContext {
  const db = getDatabase();

  return {
    db,
    repositories: {
      users: createUserRepository(db),
      roles: createRoleRepository(db),
      permissions: createPermissionRepository(db),
      organizations: createOrganizationRepository(db),
      projects: createProjectRepository(db),
      // ... more repositories
    },
    currentUser: getCurrentUser(req),
    transactionManager: new TransactionManager(db),
  };
}
```

## Error Handling

### Transaction Rollback

```typescript
export class TransactionError extends Error {
  constructor(
    message: string,
    public originalError: Error,
    public operation: string
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export async function executeWithErrorHandling<T>(
  operation: (tx: Transaction) => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation(tx);
  } catch (error) {
    // Log the error
    logger.error(`Transaction failed for ${operationName}:`, {
      error: error.message,
      stack: error.stack,
    });

    // Wrap in TransactionError
    throw new TransactionError(`Operation ${operationName} failed`, error, operationName);
  }
}
```

### Retry Logic

```typescript
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

## Performance Considerations

### Connection Pool Management

```typescript
export class DatabaseConnectionManager {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async getConnection(): Promise<Client> {
    return this.pool.connect();
  }

  async releaseConnection(client: Client): Promise<void> {
    client.release();
  }
}
```

### Transaction Monitoring

```typescript
export class TransactionMonitor {
  private activeTransactions = new Map<string, TransactionInfo>();

  startTransaction(transactionId: string, operation: string): void {
    this.activeTransactions.set(transactionId, {
      operation,
      startTime: Date.now(),
      status: 'active',
    });
  }

  endTransaction(transactionId: string, success: boolean): void {
    const info = this.activeTransactions.get(transactionId);
    if (info) {
      info.endTime = Date.now();
      info.status = success ? 'completed' : 'failed';
      info.duration = info.endTime - info.startTime;

      // Log transaction metrics
      this.logTransactionMetrics(info);

      this.activeTransactions.delete(transactionId);
    }
  }

  private logTransactionMetrics(info: TransactionInfo): void {
    logger.info('Transaction completed', {
      operation: info.operation,
      duration: info.duration,
      status: info.status,
    });
  }
}
```

## Testing

### Unit Tests

```typescript
describe('Transaction Management', () => {
  let db: DrizzleDatabase;
  let transactionManager: TransactionManager;

  beforeEach(() => {
    db = createTestDatabase();
    transactionManager = new TransactionManager(db);
  });

  it('should rollback on error', async () => {
    await expect(
      transactionManager.execute(async (tx) => {
        await tx.insert(users).values({ name: 'Test User' });
        throw new Error('Simulated error');
      })
    ).rejects.toThrow('Simulated error');

    // Verify rollback
    const users = await db.select().from(users);
    expect(users).toHaveLength(0);
  });

  it('should commit on success', async () => {
    await transactionManager.execute(async (tx) => {
      await tx.insert(users).values({ name: 'Test User' });
    });

    const users = await db.select().from(users);
    expect(users).toHaveLength(1);
  });
});
```

### Integration Tests

```typescript
describe('User Service Transactions', () => {
  it('should create user with role atomically', async () => {
    const userService = new UserService(repositories);

    const result = await userService.createUserWithRole(
      { name: 'Test User', email: 'test@example.com' },
      'admin-role-id',
      'current-user-id'
    );

    expect(result).toBeDefined();
    expect(result.name).toBe('Test User');

    // Verify role assignment
    const userRoles = await repositories.roles.getUserRoles(result.id);
    expect(userRoles).toHaveLength(1);
    expect(userRoles[0].roleId).toBe('admin-role-id');
  });
});
```

---

**Next:** Learn about [Custom Middleware](/advanced-topics/middleware) for extending functionality.
