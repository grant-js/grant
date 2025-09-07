import { DbSchema } from '@/graphql/lib/database/connection';

export type Transaction = DbSchema;

export class TransactionManager {
  static async withTransaction<T>(
    db: DbSchema,
    operation: (transaction: any) => Promise<T>
  ): Promise<T> {
    return await db.transaction(operation);
  }
}
