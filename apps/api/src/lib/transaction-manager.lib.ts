import { DbSchema } from '@grantjs/database';

export type Transaction = Parameters<Parameters<DbSchema['transaction']>[0]>[0];

export class TransactionManager {
  static async withTransaction<T>(
    db: DbSchema,
    operation: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    return await db.transaction(operation);
  }
}
