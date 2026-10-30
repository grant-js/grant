import type { GrantAuth, IAuditLogger, IExportAuditLogger } from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import type { Scope } from '@grantjs/schema';

import { config } from '@/config';
import { createLogger } from '@/lib/logger';
import {
  isApiKeyIdActor,
  resolveSyncJobEnqueuedById,
} from '@/lib/resolve-sync-job-enqueued-by.lib';
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

  /**
   * The one place the audit actor is resolved (every write goes through `insertRow`). A
   * project-level API key carries its key id as `userId`, which is not a `users` row and would
   * violate the `performed_by` foreign key: it is attributed to the system user, and
   * `getActorTokenMetadata` keeps the key identifiable.
   */
  private getPerformedBy(): string {
    return resolveSyncJobEnqueuedById(this.user) ?? config.system.systemUserId;
  }

  /** Which token acted, when the user id alone cannot say (the key-id actor). No secrets. */
  private getActorTokenMetadata(): Record<string, unknown> {
    return this.user !== null && isApiKeyIdActor(this.user)
      ? { actorTokenId: this.user.tokenId, actorTokenType: this.user.type }
      : {};
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
    const actorToken = this.getActorTokenMetadata();
    const metadata =
      Object.keys(actorToken).length > 0 ? { ...params.metadata, ...actorToken } : params.metadata;
    const insertData: any = {
      [this.entityIdField]: params.entityId,
      action: params.action,
      oldValues: serializeAuditPayload(params.oldValues),
      newValues: serializeAuditPayload(params.newValues),
      metadata: serializeAuditPayload(metadata),
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
   * One row for an export: `action = 'export'`, `performedBy` the caller. Without `entityId`
   * the row names no entity (the table's id column must be nullable, as
   * `project_user_credential_audit_logs.project_user_credential_id` is); with it, the row is
   * about that entity (`api_key_audit_logs.api_key_id`, not nullable, for an exported API-key
   * secret). Unlike `logAction`, a failed insert throws so the export that wrote it fails with
   * it. `metadata` is the caller's: counts, kinds and ids, never a secret.
   */
  async logExport(
    metadata: Record<string, unknown>,
    transaction?: unknown,
    entityId?: string
  ): Promise<void> {
    await this.insertRow(
      {
        entityId: entityId ?? null,
        action: 'export',
        oldValues: null,
        newValues: null,
        metadata,
      },
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
