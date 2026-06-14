/** CDM entity sync port. Implemented in apps/api as `*CdmEntity` under `lib/cdm/entities/`. */
import type { CdmHandlerInputKey, GroupCdmInput, Scope, SyncProjectResult } from '@grantjs/schema';

export interface CdmPermissionRefSpec {
  resourceSlug?: string | null;
  action?: string | null;
  permissionKey?: string | null;
  permissionId?: string | null;
  condition?: Record<string, unknown> | null;
}

/**
 * Resolved Grant permission row, opaque to the port. The orchestrator keeps
 * implementation-specific shapes inside its `lookupResolvedRef` closure;
 * handlers cast as needed.
 */
export type CdmResolvedPermission = unknown;

/**
 * Cross-handler shared state. Earlier handlers may publish ids that later
 * handlers consume (e.g. `roleTemplate` external-key → role id, consumed by
 * `userAssignment` to link users to roles).
 *
 * Add a new namespaced field per handler that needs to publish state.
 */
export interface CdmProducedRefs {
  /**
   * Opaque CDM role key (template `externalKey` / `RoleCdmInput.key`) → created role id.
   * Populated by the role handler during `apply`, consumed by the user-assignment
   * handler to map `roleTemplateKeys` to role ids.
   */
  roleIdsByKey: Map<string, string>;
  /**
   * External-key → created tag id.
   * Populated by the tag handler during `apply`, consumed by:
   * - role-template handler to map `tagKeys` and `groupTagKeys` to `role_tags` / `group_tags`,
   * - user-assignment handler to map `tagKeys` to global `user_tags`.
   */
  tagIds: Map<string, string>;
  /**
   * External-key → created resource id.
   * Populated by the resource handler during `apply`, consumed by the
   * permission handler to resolve `PermissionCdmInput.resourceKey`.
   */
  resourceIds: Map<string, string>;
  /**
   * External-key → created permission id.
   * Populated by the permission handler during `apply`, consumed by the
   * orchestrator/permission-ref helper to resolve `permissionKey` references
   * from role templates and user assignments.
   */
  permissionIds: Map<string, string>;
  /**
   * External-key → created Grant user id (CDM user provisioning handler).
   * Consumed by user-assignment and project-user-api-key handlers for `userKey`.
   */
  userIds: Map<string, string>;
  /**
   * CDM document group key (`groups[].key`) → Grant group id.
   * Populated by role-template and user-assignment handlers; consumed when
   * linking direct `user_groups` from `userAssignments[].directGroupKeys`.
   */
  groupIdsByKey: Map<string, string>;
}

export interface CdmTeardownContext {
  projectId: string;
  scope: Scope;
  /** Opaque transaction handle; cast in the implementation. */
  tx: unknown;
}

export interface CdmApplyContext {
  projectId: string;
  scope: Scope;
  /** Opaque transaction handle; cast in the implementation. */
  tx: unknown;
  /** Lookup a previously-resolved permission by its CDM ref shape. */
  lookupResolvedRef: (ref: CdmPermissionRefSpec) => CdmResolvedPermission;
  /** Mutable result counters; handlers increment their relevant fields. */
  result: SyncProjectResult;
  /** Cross-handler shared state. */
  produced: CdmProducedRefs;
  /** CDM document `groups[]` rows keyed by `key`, for direct user group import. */
  documentGroupsByKey: ReadonlyMap<string, GroupCdmInput>;
  /**
   * Grant user ids allowed for this import (explicit `userId`s plus provisioned
   * users). Handlers may add ids when creating users. Used so API keys attach
   * only to users from this payload.
   */
  assignmentUserIds: Set<string>;
}

export interface CdmExportContext {
  projectId: string;
  scope: Scope;
  /** Optional transaction handle; export is read-only but may be invoked from inside the import transaction (snapshot capture). */
  tx?: unknown;
}

/**
 * Unit of CDM responsibility: validates and applies one section of
 * `SyncProjectInput`, tears it down for replace-import semantics,
 * and exports the project's current state back to the same input shape.
 *
 * Type parameters:
 *   - `TInput`  shape of one entry in the expanded handler slice at `inputKey`
 *   - `TExport` shape returned by `export(...)`, typically equal to `TInput`
 */
export interface ICdmEntityHandler<TInput = unknown, TExport = TInput> {
  /** Stable identifier for this handler (e.g. `'roleTemplate'`, `'userAssignment'`). */
  readonly handlerKind: string;
  /**
   * Key on the API-internal expanded CDM payload this handler owns
   * (see `CDM_HANDLER_INPUT_KEYS` in `@grantjs/schema`).
   */
  readonly inputKey: CdmHandlerInputKey;
  /** Order within the sync/export pipeline. Lower runs earlier. */
  readonly order: number;

  /** Throw `ValidationError` for shape/semantic violations specific to this entity. */
  validateInput(input: readonly TInput[]): void;

  /** Permission references this handler needs resolved before `apply`. */
  collectPermissionRefs(input: readonly TInput[]): readonly CdmPermissionRefSpec[];

  /** Replace-import: delete prior CDM-marked entities owned by this handler. */
  teardown(ctx: CdmTeardownContext): Promise<void>;

  /** Apply this handler's slice of the CDM input, mutating shared `result` and `produced`. */
  apply(ctx: CdmApplyContext, input: readonly TInput[]): Promise<void>;

  /** Export project's current state back into this handler's input shape. */
  export(ctx: CdmExportContext): Promise<readonly TExport[]>;
}
