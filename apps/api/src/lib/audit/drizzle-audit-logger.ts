import type { GrantAuth, IAuditLogger, IExportAuditLogger } from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import type { Scope } from '@grantjs/schema';

import { config } from '@/config';
import { createLogger } from '@/lib/logger';
import type { Transaction } from '@/lib/transaction-manager.lib';

import { serializeAuditPayload } from './serialize-audit-payload.lib';

const logger = createLogger('AuditLogger');

/**
 * Drizzle-based implementation of IAuditLogger.
 * One instance per entity type (e.g. users, roles) with its own audit table and FK field.
 */
export class DrizzleAuditLogger implements IAuditLogger, IExportAuditLogger {
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

  /**
   * Inserts one audit row and lets a failure propagate. `logAction` swallows it (an audit
   * failure must not break an ordinary write); `logExport` does not.
   */
  private async insertRow(
    params: {
      entityId: string | null;
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
    const insertData: any = {
      [this.entityIdField]: params.entityId,
      action: params.action,
      oldValues: serializeAuditPayload(params.oldValues),
      newValues: serializeAuditPayload(params.newValues),
      metadata: serializeAuditPayload(params.metadata),
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
    try {
      await this.insertRow(params, transaction);
    } catch (error) {
      logger.error({
        msg: 'Error creating audit log',
        err: error,
      });
    }
  }

  /**
   * One row for an export: `action = 'export'`, no entity id (the table's id column must be
   * nullable, as `project_user_credential_audit_logs.project_user_credential_id` is),
   * `performedBy` the caller. Unlike `logAction`, a failed insert throws so the export that
   * wrote it fails with it. `metadata` is the caller's: counts and kinds, never a secret.
   */
  async logExport(metadata: Record<string, unknown>, transaction?: unknown): Promise<void> {
    await this.insertRow(
      { entityId: null, action: 'export', oldValues: null, newValues: null, metadata },
      transaction as Transaction
    );
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
