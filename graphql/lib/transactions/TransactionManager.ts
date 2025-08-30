import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type Transaction = PostgresJsDatabase;

export class TransactionManager {
  static async withTransaction<T>(
    db: PostgresJsDatabase,
    operation: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    return await db.transaction(operation);
  }
}
