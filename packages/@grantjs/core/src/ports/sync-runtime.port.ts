/**
 * Starting a `project-sync` execution somewhere that is not this process.
 *
 * ADR 0002 routes CDM sync off Lambda because the import runs in a single transaction
 * that cannot be split — a partially-applied permission model is a security outcome, not
 * an inconvenience — and a 28,880-entity import measures 62.3 minutes against a hard
 * 15-minute ceiling.
 *
 * The port exists so the job knows *that* it can hand work to another runtime without
 * knowing which one. The AWS adapter runs an ECS task; a Kubernetes target would create a
 * Job; a developer machine has no implementation at all and the job runs in-process, which
 * is the default and every existing deployment.
 */
export interface SyncRuntimeDispatch {
  /** The `project_sync_jobs` row the started execution should load and apply. */
  jobRecordId: string;
  /** Tenant scope, forwarded verbatim so the execution re-derives the same RLS context. */
  scope: unknown;
}

export interface SyncRuntimeStarted {
  /** Opaque runtime handle — an ECS task ARN, a Kubernetes job name. For logs only. */
  reference: string;
}

export interface ISyncRuntime {
  /**
   * Start an execution and return once it is *accepted*, not once it finishes.
   *
   * The distinction is the whole point: the caller is a queue consumer with its own
   * timeout, and a dispatcher that waited would inherit exactly the ceiling this exists
   * to escape.
   */
  start(dispatch: SyncRuntimeDispatch): Promise<SyncRuntimeStarted>;
}
