/**
 * Port for audit logging. Core defines the contract; implementations (e.g. Drizzle-based)
 * live in the API or infrastructure layer.
 */
export interface AuditLogActionParams {
  entityId: string;
  action: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export interface IAuditLogger {
  /** Generic action – use for custom audit actions (e.g. ROTATE, REVOKE). */
  logAction(params: AuditLogActionParams, transaction?: unknown): Promise<void>;

  logCreate(
    entityId: string,
    newValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: unknown
  ): Promise<void>;

  logUpdate(
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: unknown
  ): Promise<void>;

  logSoftDelete(
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: unknown
  ): Promise<void>;

  logHardDelete(
    entityId: string,
    oldValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    transaction?: unknown
  ): Promise<void>;
}

/**
 * An audit row that is not about one entity: a credential export names no credential row,
 * it reads many. Separate from `IAuditLogger` so the ports every other service mocks stay
 * unchanged. Unlike `logAction`, a failed write **throws**: the export that triggered it
 * must fail with it rather than run unaudited.
 */
export interface IExportAuditLogger {
  /**
   * Record one export (`action = 'export'`, no entity id, `performedBy` the caller).
   * `metadata` is counts and kinds only: never a hash, a password or an id of either.
   */
  logExport(metadata: Record<string, unknown>, transaction?: unknown): Promise<void>;
}
