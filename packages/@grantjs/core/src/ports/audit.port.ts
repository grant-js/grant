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
 * An audit row for an export: a credential export names no single credential row, it reads
 * many, so its summary row has no entity id; an exported API-key secret has one, the key.
 * Separate from `IAuditLogger` so the ports every other service mocks stay unchanged. Unlike
 * `logAction`, a failed write **throws**: the export that triggered it must fail with it
 * rather than run unaudited.
 */
export interface IExportAuditLogger {
  /**
   * Record one export (`action = 'export'`, `performedBy` the caller). Without `entityId` it
   * is the summary row, whose `metadata` is counts and kinds only. With `entityId` (an API
   * key's id, on the API-key audit log) it is the row of one exported secret. `metadata` is
   * never a hash, a password, a secret or a ciphertext.
   */
  logExport(
    metadata: Record<string, unknown>,
    transaction?: unknown,
    entityId?: string
  ): Promise<void>;
}
