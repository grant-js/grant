---
title: Transaction Management
description: Atomic operations with Drizzle transactions across the service layer
---

# Transaction Management

Grant wraps multi-step operations in database transactions to guarantee atomicity — if any step fails, everything rolls back.

## How It Works

Transaction support follows the project's **ports and adapters** pattern:

- **Port** — `ITransactionalConnection<TTransaction>` in `@grantjs/core` defines the contract.
- **Adapter** — `DrizzleTransactionalConnection` in `apps/api` implements it using Drizzle ORM.

```typescript
// @grantjs/core — port
export interface ITransactionalConnection<TTransaction = unknown> {
  withTransaction<T>(operation: (transaction: TTransaction) => Promise<T>): Promise<T>;
}

// apps/api — Drizzle adapter
export class DrizzleTransactionalConnection implements ITransactionalConnection<Transaction> {
  constructor(private readonly db: DbSchema) {}

  async withTransaction<T>(operation: (transaction: Transaction) => Promise<T>): Promise<T> {
    return await this.db.transaction(operation);
  }
}
```

The `Transaction` type is derived from Drizzle's transaction parameter, ensuring full type safety across the stack. Handlers and services receive `ITransactionalConnection` — they never depend on Drizzle directly.

## Why Transactions Matter

- **Atomicity** — Creating a user with a role assignment either completes fully or not at all. No orphaned entities.
- **Connection reuse** — A single database connection flows through the entire request chain, preventing connection pool exhaustion.
- **Consistent audit trail** — Entity changes and their audit logs are written in the same transaction.

## Service Layer Pattern

Handlers coordinate multi-repository operations using `withTransaction`:

```typescript
async createUserWithRole(userData: CreateUserInput, roleId: string, performedBy: string): Promise<User> {
  return this.txConnection.withTransaction(async (tx) => {
    // Create user
    const user = await this.repositories.users.create(userData, performedBy, tx);

    // Assign role (same transaction)
    await this.repositories.roles.assignToUser(roleId, user.id, performedBy, tx);

    // Audit log (same transaction)
    await this.repositories.auditLogs.create({
      entityType: 'USER',
      entityId: user.id,
      action: 'CREATE_WITH_ROLE',
      metadata: JSON.stringify({ roleId }),
      performedBy,
    }, tx);

    return user;
  });
}
```

Every repository method accepts an optional `tx` parameter. When provided, the operation joins the existing transaction instead of creating a new one.

## Repository Integration

All 25+ repositories extend base classes (`EntityRepository`, `PivotRepository`) that support transaction injection:

```typescript
async create(data: TCreate, performedBy: string, tx?: Transaction): Promise<TEntity> {
  const executor = tx || this.db;
  return executor.transaction(async (transaction) => {
    const [entity] = await transaction.insert(this.table).values(data).returning();
    await transaction.insert(this.auditTable).values({
      entityId: entity.id, action: 'CREATE',
      newValues: JSON.stringify(entity), performedBy,
    });
    return entity;
  });
}
```

## Request-scoped RLS transaction

IP `auth:` / `global:` rate limits run **before** `contextMiddleware`, so a 429 does not authenticate, construct the handler toolbox, or open this transaction. The optional per-tenant bucket (`SECURITY_RATE_LIMIT_PER_TENANT_*`) stays **after** authenticate — it keys on `context.user.scope`. Origin verification stays first; `jsonBodyParser` stays before GraphQL auth-sensitive detection.

Scoped requests (authenticated, non-system, `SECURITY_ENABLE_RLS` default `true`) open one Drizzle transaction in `contextMiddleware`. `SET LOCAL ROLE` and tenant GUCs apply for every query on that transaction. Unscoped, system, and RLS-off requests do not open this transaction.

The request client stays checked out until the handler ends the response (`releaseTransaction` from `holdResponseEndUntil`, with `finish` / `close` as fallback). Drizzle then COMMITs and returns the client to the pool. After-commit callbacks (`scheduleAfterCommit` — job and webhook enqueue) run on the pool (`db` / `durableDb`), not on the request client, and only after COMMIT so workers see the row. The HTTP body is flushed after those callbacks settle (or after `jobs.afterCommitTimeoutMs`), so a Lambda freeze cannot drop an in-flight enqueue, and a failed COMMIT is not answered as success.

Do not raise `DB_POOL_MAX` or set `SECURITY_ENABLE_RLS=false` to shorten this hold. Handler-level `withTransaction` savepoints still roll back partial mutations inside the request transaction.

## Error Handling

Transactions automatically roll back on any thrown error. GraphQL resolvers and REST handlers catch transaction failures and convert them to appropriate error responses:

```typescript
try {
  return await this.txConnection.withTransaction(async (tx) => {
    // ... multi-step operation
  });
} catch (error) {
  // Transaction already rolled back
  throw new GraphQLError('Failed to create user', {
    extensions: { code: 'USER_CREATION_FAILED' },
  });
}
```

---

**Related:**

- [Audit Logging](/advanced-topics/audit-logging) — Audit logs written within transactions
- [Contributing Guide](/contributing/guide) — Layer boundaries and service patterns
