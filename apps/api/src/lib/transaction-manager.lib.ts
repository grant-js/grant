import { DbSchema } from '@grantjs/database';

import type { ITransactionalConnection } from '@grantjs/core';

export type Transaction = Parameters<Parameters<DbSchema['transaction']>[0]>[0];

/**
 * Drizzle-based implementation of ITransactionalConnection.
 * Wraps a DbSchema instance so consumers only see the port interface.
 */
export class DrizzleTransactionalConnection implements ITransactionalConnection<Transaction> {
  constructor(private readonly db: DbSchema) {}

  async withTransaction<T>(operation: (transaction: Transaction) => Promise<T>): Promise<T> {
    return await this.db.transaction(operation);
  }
}
