---
title: Audit Logging
description: Standardized audit trail for compliance and forensics
---

# Audit Logging

Every create, update, and delete operation in Grant produces an audit log entry — written in the same database transaction as the data change, guaranteeing consistency.

## Schema

All entity audit log tables follow a standardized structure:

```typescript
export const entityAuditLogs = pgTable('entity_audit_logs', {
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
});
```

**Scope fields** enable tenant-scoped queries:

- `scopeTenant` — Tenant type (e.g., `organization`, `organizationProject`). Always set from the authenticated request context, never from user input.
- `scopeId` — Tenant identifier (e.g., `orgId` or `orgId:projectId`).

Indexed on `entityId`, `action`, and `scopeTenant` for efficient lookups.

## Standard Actions

| Action        | When                         |
| ------------- | ---------------------------- |
| `CREATE`      | New entity created           |
| `UPDATE`      | Entity modified              |
| `DELETE`      | Entity soft-deleted          |
| `RESTORE`     | Soft-deleted entity restored |
| `BULK_CREATE` | Batch create                 |
| `BULK_UPDATE` | Batch update                 |
| `BULK_DELETE` | Batch delete                 |

Repositories can define custom actions for domain-specific operations (e.g., `PASSWORD_RESET`, `PERMISSION_GRANTED`).

## How It Works

Every repository operation writes the audit log inside the same transaction:

```typescript
return this.db.transaction(async (tx) => {
  const [entity] = await tx.insert(entities).values(data).returning();
  await tx.insert(entityAuditLogs).values({
    entityId: entity.id,
    action: 'CREATE',
    newValues: JSON.stringify(entity),
    performedBy,
    scopeTenant, // from auth context
    scopeId, // from auth context
  });
  return entity;
});
```

If the entity write fails, the audit log is rolled back too — and vice versa.

## Querying by Tenant

Filter audit logs for a specific organization or project:

```typescript
// All logs for an organization
const logs = await db
  .select()
  .from(projectAuditLogs)
  .where(
    and(
      eq(projectAuditLogs.scopeTenant, 'organization'),
      eq(projectAuditLogs.scopeId, organizationId)
    )
  )
  .orderBy(desc(projectAuditLogs.createdAt));

// Logs for a specific project scope
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

## Data Retention

Audit logs accumulate over time. Consider archiving or purging entries older than your compliance requirement (e.g., 365 days). The data retention cleanup job can be extended for this purpose — see [Job Scheduling](/advanced-topics/job-scheduling).

---

**Related:**

- [Transaction Management](/advanced-topics/transactions) — Audit logs within transactions
- [Events, Webhooks & Notifications](/core-concepts/events-webhooks-notifications) — Domain-event outbox for webhooks and in-app alerts (separate from audit)
- [Privacy Settings](/advanced-topics/privacy-settings) — GDPR compliance features
- [Multi-Tenancy](/architecture/multi-tenancy) — Tenant-scoped audit filtering
