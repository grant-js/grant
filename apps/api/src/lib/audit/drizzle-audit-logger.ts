import { config } from '@/config';
import { createLogger } from '@/lib/logger';
import type { Transaction } from '@/lib/transaction-manager.lib';

import type { GrantAuth, IAuditLogger } from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import type { Scope } from '@grantjs/schema';

const logger = createLogger('AuditLogger');

/**
 * Drizzle-based implementation of IAuditLogger.
 * One instance per entity type (e.g. users, roles) with its own audit table and FK field.
 */
export class DrizzleAuditLogger implements IAuditLogger {
  constructor(
    private readonly auditLogsTable: any,
    private readonly entityIdField: string,
    private readonly user: GrantAuth | null,
    private readonly db: DbSchema
  ) {}

  private getPerformedBy(): string {
    return this.user !== null ? this.user.userId : config.system.systemUserId;
  }

  private getScope(): Scope | null {
    return this.user?.scope ?? null;
  }

  async logAction(
    params: {
      entityId: string;
      action: string;
      oldValues?: Record<string, unknown> | null;
      newValues?: Record<string, unknown> | null;
      metadata?: Record<string, unknown>;
    },
    transaction?: Transaction
  ): Promise<void> {
    const dbInstance = transaction || this.db;
    const scope = this.getScope();
    logger.debug(
      {
        scope,
        entityId: params.entityId,
        action: params.action,
      },
      'AuditLogger.logAction: resolved scope for audit log'
    );
    try {
      const insertData: any = {
        [this.entityIdField]: params.entityId,
        action: params.action,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        performedBy: this.getPerformedBy(),
        createdAt: new Date(),
        ...(scope && {
          scopeTenant: String(scope.tenant),
          scopeId: scope.id,
        }),
      };

      logger.debug(
        { scopeTenant: insertData.scopeTenant ?? null, scopeId: insertData.scopeId ?? null },
        'AuditLogger.logAction: insert payload scope fields'
      );

      await (dbInstance as any).insert(this.auditLogsTable).values(insertData);
    } catch (error) {
      logger.error({
        msg: 'Error creating audit log',
        err: error,
      });
    }
  }

  async logCreate(
    entityId: string,
    newValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: unknown
  ): Promise<void> {
    await this.logAction(
      {
        entityId,
        action: 'CREATE',
        oldValues: null,
        newValues,
        metadata,
      },
      transaction as Transaction
    );
  }

  async logUpdate(
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: unknown
  ): Promise<void> {
    await this.logAction(
      {
        entityId,
        action: 'UPDATE',
        oldValues,
        newValues,
        metadata,
      },
      transaction as Transaction
    );
  }

  async logSoftDelete(
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: unknown
  ): Promise<void> {
    await this.logAction(
      {
        entityId,
        action: 'SOFT_DELETE',
        oldValues,
        newValues,
        metadata,
      },
      transaction as Transaction
    );
  }

  async logHardDelete(
    entityId: string,
    oldValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: unknown
  ): Promise<void> {
    await this.logAction(
      {
        entityId,
        action: 'HARD_DELETE',
        oldValues,
        newValues: null,
        metadata,
      },
      transaction as Transaction
    );
  }
}
