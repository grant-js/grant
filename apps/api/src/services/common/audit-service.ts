import { GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';

import { config } from '@/config';
import { createModuleLogger } from '@/lib/logger';
import { Transaction } from '@/lib/transaction-manager.lib';

export interface AuditLogParams {
  entityId: string;
  action: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export abstract class AuditService {
  protected readonly logger = createModuleLogger('AuditService');

  constructor(
    protected readonly auditLogsTable: any,
    protected readonly entityIdField: string,
    protected readonly user: GrantAuth | null = null,
    protected readonly db: DbSchema
  ) {}

  protected getPerformedBy(): string {
    return this.user !== null ? this.user.userId : config.system.systemUserId;
  }

  protected async logAction(params: AuditLogParams, transaction?: Transaction): Promise<void> {
    const dbInstance = transaction || this.db;
    try {
      const insertData: any = {
        [this.entityIdField]: params.entityId,
        action: params.action,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        performedBy: this.getPerformedBy(),
        createdAt: new Date(),
      };

      await dbInstance.insert(this.auditLogsTable).values(insertData);
    } catch (error) {
      this.logger.error({
        msg: 'Error creating audit log',
        err: error,
      });
    }
  }

  protected async logCreate(
    entityId: string,
    newValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<void> {
    await this.logAction(
      {
        entityId,
        action: 'CREATE',
        oldValues: null,
        newValues,
        metadata,
      },
      transaction
    );
  }

  protected async logUpdate(
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<void> {
    await this.logAction(
      {
        entityId,
        action: 'UPDATE',
        oldValues,
        newValues,
        metadata,
      },
      transaction
    );
  }

  protected async logSoftDelete(
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<void> {
    await this.logAction(
      {
        entityId,
        action: 'SOFT_DELETE',
        oldValues,
        newValues,
        metadata,
      },
      transaction
    );
  }

  protected async logHardDelete(
    entityId: string,
    oldValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<void> {
    await this.logAction(
      {
        entityId,
        action: 'HARD_DELETE',
        oldValues,
        newValues: null,
        metadata,
      },
      transaction
    );
  }
}
