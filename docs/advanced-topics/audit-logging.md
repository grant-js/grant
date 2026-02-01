---
title: Audit Logging
description: Comprehensive audit trail management and standardization
---

# Audit Logging

This document outlines the standardization of audit log schemas across all repositories in the Grant project. All repositories now follow a consistent pattern for audit logging, ensuring data consistency, performance, and maintainability.

## Overview

This document outlines the standardization of audit log schemas across all repositories in the grant project. All repositories now follow a consistent pattern for audit logging, ensuring data consistency, performance, and maintainability.

## Standardized Audit Log Schema

All repositories now use the following consistent audit log structure:

```typescript
export const entityAuditLogs = pgTable(
  'entity_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityId: uuid('entity_id')
      .references(() => entity.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }),
    scopeId: varchar('scope_id', { length: 255 }),
  },
  (t) => [
    index('entity_audit_logs_entity_id_idx').on(t.entityId),
    index('entity_audit_logs_action_idx').on(t.action),
    index('entity_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);
```

- **scopeTenant** – Tenant type (e.g. `account`, `organization`, `organizationProject`, `accountProject`). Populated from authenticated request scope only, never from user input.
- **scopeId** – Scope identifier (e.g. organization ID, or composite `organizationId:projectId`). Enables filtering audit logs by tenant for compliance and forensics.

## Key Standardization Changes

### 1. Data Type Consistency

- **Before**: Mixed usage of `text` (unlimited) and `varchar` (limited) fields
- **After**: All audit log fields now use `varchar` with appropriate length constraints
  - `action`: `varchar(50)` - sufficient for action names like "CREATE", "UPDATE", "DELETE"
  - `oldValues`, `newValues`, `metadata`: `varchar(1000)` - sufficient for JSON data storage

### 2. Field Naming Standardization

- **Before**: Inconsistent field names (`changes` vs `oldValues`/`newValues`, `performedAt` vs `createdAt`)
- **After**: Consistent field naming across all repositories:
  - `oldValues` - stores previous state as JSON string
  - `newValues` - stores new state as JSON string
  - `metadata` - stores additional context information
  - `performedBy` - tracks which user performed the action
  - `createdAt` - timestamp of when the audit log was created

### 3. Index Optimization

- **Before**: Missing or inconsistent indexing
- **After**: Standardized indexes for optimal query performance:
  - `entity_audit_logs_entity_id_idx` - for queries filtering by entity
  - `entity_audit_logs_action_idx` - for queries filtering by action type

## Implementation Pattern

### Repository Integration

Each repository now follows this consistent pattern:

```typescript
export class EntityRepository {
  async create(data: CreateEntityInput, performedBy: string): Promise<Entity> {
    return this.db.transaction(async (tx) => {
      // Create the entity
      const [entity] = await tx.insert(entities).values(data).returning();

      // Create audit log
      await tx.insert(entityAuditLogs).values({
        entityId: entity.id,
        action: 'CREATE',
        newValues: JSON.stringify(entity),
        performedBy,
      });

      return entity;
    });
  }

  async update(id: string, data: UpdateEntityInput, performedBy: string): Promise<Entity> {
    return this.db.transaction(async (tx) => {
      // Get old values
      const [oldEntity] = await tx.select().from(entities).where(eq(entities.id, id));

      // Update the entity
      const [updatedEntity] = await tx
        .update(entities)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(entities.id, id))
        .returning();

      // Create audit log
      await tx.insert(entityAuditLogs).values({
        entityId: id,
        action: 'UPDATE',
        oldValues: JSON.stringify(oldEntity),
        newValues: JSON.stringify(updatedEntity),
        performedBy,
      });

      return updatedEntity;
    });
  }

  async delete(id: string, performedBy: string): Promise<void> {
    return this.db.transaction(async (tx) => {
      // Get old values
      const [oldEntity] = await tx.select().from(entities).where(eq(entities.id, id));

      // Soft delete the entity
      await tx.update(entities).set({ deletedAt: new Date() }).where(eq(entities.id, id));

      // Create audit log
      await tx.insert(entityAuditLogs).values({
        entityId: id,
        action: 'DELETE',
        oldValues: JSON.stringify(oldEntity),
        performedBy,
      });
    });
  }
}
```

## Audit Log Actions

### Standard Actions

All repositories use these standardized action names:

- **CREATE** - When a new entity is created
- **UPDATE** - When an existing entity is updated
- **DELETE** - When an entity is soft deleted
- **RESTORE** - When a soft-deleted entity is restored
- **BULK_CREATE** - When multiple entities are created in a batch
- **BULK_UPDATE** - When multiple entities are updated in a batch
- **BULK_DELETE** - When multiple entities are deleted in a batch

### Custom Actions

Repositories can define custom actions for specific business operations:

```typescript
// User-specific actions
await tx.insert(userAuditLogs).values({
  userId: user.id,
  action: 'PASSWORD_RESET',
  metadata: JSON.stringify({ resetMethod: 'email' }),
  performedBy,
});

// Role-specific actions
await tx.insert(roleAuditLogs).values({
  roleId: role.id,
  action: 'PERMISSION_GRANTED',
  oldValues: JSON.stringify(oldPermissions),
  newValues: JSON.stringify(newPermissions),
  performedBy,
});
```

## Querying Audit Logs

### Querying by Tenant (Scope)

For multi-tenant deployments, every audit log table includes optional `scope_tenant` and `scope_id` columns. Use them to filter logs by organization or project for compliance and forensics. Scope is always taken from the authenticated context when writing; never from client input.

```typescript
// Get all audit logs for a given tenant (e.g. one organization)
const orgLogs = await db
  .select()
  .from(projectAuditLogs)
  .where(
    and(
      eq(projectAuditLogs.scopeTenant, 'organization'),
      eq(projectAuditLogs.scopeId, organizationId)
    )
  )
  .orderBy(desc(projectAuditLogs.createdAt));

// Get audit logs for a specific project scope (organizationProject)
const projectLogs = await db
  .select()
  .from(projectAuditLogs)
  .where(
    and(
      eq(projectAuditLogs.scopeTenant, 'organizationProject'),
      eq(projectAuditLogs.scopeId, `${organizationId}:${projectId}`)
    )
  )
  .orderBy(desc(projectAuditLogs.createdAt));
```

Indexes on `scope_tenant` (and optionally composite `scope_tenant`, `scope_id`) support efficient tenant-scoped queries. Older rows may have `scope_tenant` and `scope_id` as `null` before tenant-aware audit logging was enabled.

### Basic Queries

```typescript
// Get all audit logs for an entity
const auditLogs = await db
  .select()
  .from(entityAuditLogs)
  .where(eq(entityAuditLogs.entityId, entityId))
  .orderBy(desc(entityAuditLogs.createdAt));

// Get audit logs by action type
const createLogs = await db
  .select()
  .from(entityAuditLogs)
  .where(eq(entityAuditLogs.action, 'CREATE'));

// Get audit logs by user
const userLogs = await db
  .select()
  .from(entityAuditLogs)
  .where(eq(entityAuditLogs.performedBy, userId));
```

### Advanced Queries

```typescript
// Get audit logs with pagination
const auditLogs = await db
  .select()
  .from(entityAuditLogs)
  .where(eq(entityAuditLogs.entityId, entityId))
  .orderBy(desc(entityAuditLogs.createdAt))
  .limit(limit)
  .offset(offset);

// Get audit logs within date range
const auditLogs = await db
  .select()
  .from(entityAuditLogs)
  .where(
    and(
      eq(entityAuditLogs.entityId, entityId),
      gte(entityAuditLogs.createdAt, startDate),
      lte(entityAuditLogs.createdAt, endDate)
    )
  );
```

## Performance Considerations

### Indexing Strategy

The standardized indexes provide optimal performance for common query patterns:

```sql
-- Fast lookups by entity
CREATE INDEX entity_audit_logs_entity_id_idx ON entity_audit_logs(entity_id);

-- Fast lookups by action type
CREATE INDEX entity_audit_logs_action_idx ON entity_audit_logs(action);

-- Composite index for common queries
CREATE INDEX entity_audit_logs_entity_action_idx ON entity_audit_logs(entity_id, action);
```

### Data Retention

Consider implementing data retention policies for audit logs:

```typescript
// Archive old audit logs
async archiveOldAuditLogs(retentionDays: number = 365): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  await this.db.delete(entityAuditLogs)
    .where(lt(entityAuditLogs.createdAt, cutoffDate));
}
```

## Compliance and Security

### GDPR Compliance

Audit logs help with GDPR compliance by tracking data access and modifications:

```typescript
// Track data access
await tx.insert(userAuditLogs).values({
  userId: user.id,
  action: 'DATA_ACCESS',
  metadata: JSON.stringify({
    accessedBy: currentUser.id,
    purpose: 'user_profile_view',
  }),
  performedBy: currentUser.id,
});
```

### SOX Compliance

For SOX compliance, ensure all financial data changes are audited:

```typescript
// Track financial data changes
await tx.insert(transactionAuditLogs).values({
  transactionId: transaction.id,
  action: 'AMOUNT_CHANGED',
  oldValues: JSON.stringify({ amount: oldAmount }),
  newValues: JSON.stringify({ amount: newAmount }),
  performedBy: currentUser.id,
  metadata: JSON.stringify({ reason: 'correction', approvalId: approval.id }),
});
```

## Monitoring and Alerting

### Audit Log Monitoring

Set up monitoring for unusual audit log patterns:

```typescript
// Monitor for bulk operations
const bulkOperations = await db
  .select()
  .from(entityAuditLogs)
  .where(like(entityAuditLogs.action, 'BULK_%'))
  .orderBy(desc(entityAuditLogs.createdAt))
  .limit(10);

// Alert if too many bulk operations
if (bulkOperations.length > threshold) {
  await this.alerting.sendAlert({
    type: 'HIGH_BULK_OPERATIONS',
    count: bulkOperations.length,
    timestamp: new Date(),
  });
}
```

### Performance Monitoring

Monitor audit log performance:

```typescript
const startTime = Date.now();
await this.createAuditLog(auditData);
const duration = Date.now() - startTime;

if (duration > 1000) {
  // Alert if audit log takes > 1 second
  await this.monitoring.recordSlowAuditLog(duration, auditData);
}
```

## Best Practices

### 1. Always Use Transactions

Ensure audit logs are created within the same transaction as the data change:

```typescript
return this.db.transaction(async (tx) => {
  // Data change
  const result = await tx.update(entities).set(data).returning();

  // Audit log
  await tx.insert(entityAuditLogs).values(auditData);

  return result;
});
```

### 2. Include Context

Always include relevant context in the metadata:

```typescript
const metadata = {
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  sessionId: request.session.id,
  reason: 'user_requested_change',
};
```

### 3. Validate Audit Data

Ensure audit log data is valid before storing:

```typescript
const auditData = {
  entityId: entity.id,
  action: 'UPDATE',
  oldValues: JSON.stringify(oldEntity),
  newValues: JSON.stringify(newEntity),
  performedBy: currentUser.id,
  metadata: JSON.stringify(metadata),
};

// Validate required fields
if (!auditData.entityId || !auditData.action || !auditData.performedBy) {
  throw new Error('Invalid audit log data');
}
```

---

**Next:** Learn about [Transaction Management](/advanced-topics/transactions) for atomic operations.
