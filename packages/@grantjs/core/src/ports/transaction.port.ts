/**
 * Port for transactional operations.
 * Core defines the contract; implementations (e.g. Drizzle-based) live in the API layer.
 *
 * @typeParam TTransaction - The opaque transaction token type. Defaults to `unknown` for
 *   consumers that don't need to know the concrete type. API-layer handlers may narrow it
 *   to the concrete `Transaction` type for convenience.
 */
export interface ITransactionalConnection<TTransaction = unknown> {
  /**
   * Execute `operation` inside a database transaction.
   * The `transaction` token passed to the callback can be forwarded to repositories/services
   * so they participate in the same DB transaction.
   */
  withTransaction<T>(operation: (transaction: TTransaction) => Promise<T>): Promise<T>;
}
