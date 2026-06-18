# grant-api

## 1.4.1

### Patch Changes

- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.
- Updated dependencies [4fcca1d]
  - @grantjs/schema@1.4.1
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.4.0

### Minor Changes

- fd61e91: Add CDM email identity imports for project sync jobs.

  CDM users with `findBy: email` now resolve through the global email authentication catalog, creating an unverified passwordless email authentication method when needed. Project OAuth email magic-link proof verifies imported email methods, and the docs/schema now describe the global identity semantics.

### Patch Changes

- Updated dependencies [fd61e91]
  - @grantjs/schema@1.4.0
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.3.3

### Patch Changes

- 661935f: Fix project import failures caused by globally unique soft-delete timestamp indexes on pivot tables.
  - @grantjs/schema@1.3.3
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.3.2

### Patch Changes

- ed06fc0: Improve detail page loading states with skeleton placeholders, hide native search clear
  controls, and fix project app update validation for existing sign-up and primary tag values.
  - @grantjs/schema@1.3.2
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.3.1

### Patch Changes

- @grantjs/schema@1.3.1
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0

## 1.3.0

### Minor Changes

- b911b9a: CDM searchable metadata and denormalized `search_document` for list search, plus tag picker infinite scroll fix.

  **API & CDM**

  - Add `search_document` on `project_users`, `roles`, and `groups` with pg_trgm indexes
  - CDM `searchable` on user, role, and group inputs; import, export, and runtime recomputation
  - Project-scoped user list search filters via pivot `search_document`

  **Web**

  - Fix toolbar tag filter infinite loading (nested dropdown scroll, stable tag query variables, IntersectionObserver reconnect)

### Patch Changes

- @grantjs/schema@1.3.0
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0

## 1.2.0

### Minor Changes

- 3355be1: RBAC detail UX, direct permission assignments, and CDM replace pivot teardown.

  **Web**
  - Settings-style feature module cards and dedicated `/new` + detail routes for roles, groups, permissions, resources, project apps, and users
  - Slim list edit dialogs (scalar fields only); relationship editing on detail pages
  - Paginated tag pickers, detail table column visibility, and sync job detail pages

  **API & database**
  - Direct assignment pivots: `user_groups`, `user_permissions`, `role_permissions`, and project-scoped mirrors
  - CDM import/export for explicit user→group and user→role permission paths (no synthetic roles)
  - Replace-mode CDM teardown sweeps orphan pivots (including `project_app_tags`) with monotonic microsecond stagger soft-delete
  - Scoped entity tag resolvers; slim GraphQL list queries (`getRolesList`, `getGroupsList`, etc.)

  **Testing & tooling**
  - E2E coverage for rich replace import teardown and direct `users[].groups` authorization
  - RBAC list-query benchmark script; gitignore ephemeral benchmark outputs under `docs/benchmarks/`

### Patch Changes

- @grantjs/schema@1.2.0
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0

## 1.1.7

### Patch Changes

- 3597d0a: Compact audit log payloads before insert so large CDM entities (for example resources with long action lists) no longer exceed `varchar(1000)` on audit tables and abort import transactions.
  - @grantjs/schema@1.1.7
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.6

### Patch Changes

- 50b8271: Allow project-level API keys to enqueue CDM sync and export jobs by mapping `enqueuedById` to the system user when the JWT `sub` is the API key id sentinel (`sub === jti`), fixing FK violations on `project_sync_jobs.enqueued_by_id`.
  - @grantjs/schema@1.1.6
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.5

### Patch Changes

- 1d6f27d: Make the Express JSON request body limit configurable via `API_JSON_BODY_LIMIT_BYTES` (default 10 MiB) so large CDM sync imports can be tuned without code changes.
  - @grantjs/schema@1.1.5
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.4

### Patch Changes

- Updated dependencies [6abd436]
  - @grantjs/schema@1.1.4
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.3

### Patch Changes

- Updated dependencies [8c9af41]
  - @grantjs/schema@1.1.3
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.2

### Patch Changes

- Updated dependencies [01e0ed1]
  - @grantjs/schema@1.1.2
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.1

### Patch Changes

- 005ec00: Resolve platform version from `apps/api/package.json` at runtime for `/api/config` and OpenAPI. Remove deprecated `APP_VERSION` and `NEXT_PUBLIC_APP_VERSION` environment variables.
  - @grantjs/schema@1.1.1
  - @grantjs/core@1.0.0
  - @grantjs/jobs@1.0.0
  - @grantjs/analytics@1.0.0
  - @grantjs/cache@1.0.0
  - @grantjs/constants@1.0.0
  - @grantjs/database@1.0.0
  - @grantjs/email@1.0.0
  - @grantjs/errors@1.0.0
  - @grantjs/logger@1.0.0
  - @grantjs/storage@1.0.0
  - @grantjs/telemetry@1.0.0

## 1.1.0

### Minor Changes

- 650a605: **Breaking — replace synchronous CDM project sync with async jobs.**

  The synchronous `syncProject` GraphQL mutation (formerly `syncProjectPermissions`) and `POST /api/projects/{id}/permissions/sync` REST route have been **removed**. Both APIs now expose an enqueue-and-poll job flow:
  - REST:
    - `POST /api/projects/{id}/sync/jobs` — enqueue a job, returns `202` with the persisted job row (`{ id, status, ... }`).
    - `GET /api/projects/{id}/sync/jobs/{jobId}` — poll status. Terminal statuses: `COMPLETED`, `FAILED`, `CANCELLED`.
    - `DELETE /api/projects/{id}/sync/jobs/{jobId}` — request cancellation (best-effort once the job is `RUNNING`).
  - GraphQL:
    - `mutation startProjectSync` — enqueue import.
    - `mutation cancelProjectSync` — request cancellation.
    - `query projectSyncJob` — poll status.

  **Migration**
  - Callers must enqueue the job and then poll the status endpoint until the job reaches a terminal status.
  - The body of the new POST is the same `SyncProjectInput` (CDM 1) shape the old endpoint accepted; the response is now a `ProjectSyncJob` (id + status), not the eager `SyncProjectResult`. The result is surfaced inside the job row once it completes.
  - `importId` enables idempotency: enqueuing twice with the same `importId` returns the existing in-flight or completed job rather than starting a duplicate replace-import.
  - A jobs adapter must be configured (`JOBS_ENABLED=true`, BullMQ in production / node-cron in dev). Starting a sync without one returns a `ConfigurationError`.

  **Why**

  External imports can be large enough to exceed reasonable HTTP timeouts and produce ambiguous client retries. The job-based design persists the request payload for replay, runs the existing transactional `ProjectImportService` in the background, transitions an explicit state machine (`pending → running → completed|failed|cancelled`), and surfaces post-commit cache invalidation through a new dedicated service method so the worker remains independent of the transport-layer handler.

  ***

  **Additive — CDM export and pre-sync rollback snapshots.**

  The same package now exposes the inverse operation of CDM project sync, plus an automatic rollback snapshot captured by the worker before each import. The internals were refactored behind a single `ICdmEntityHandler` registry so the sync service, the new export service, and future entity types (API keys, project apps, …) all share one extensibility seam.
  - REST:
    - `GET /api/projects/{id}/sync/export` — snapshot the project's current state and download it as a CDM JSON artifact (`SyncProjectInput` shape, replay-ready). Gated by `Project:Query`.
    - `GET /api/projects/{id}/sync/jobs/{jobId}/snapshot` — download the rollback snapshot captured before the selected job ran. `404` when the job has no snapshot. Gated by `Project:Query`.
  - GraphQL: `ProjectSyncJob` gains `hasSnapshot: Boolean!`, `snapshotTakenAt: DateTime`, and `snapshotSizeBytes: Int` (the JSON itself stays REST-only, mirroring the existing payload-download endpoint).
  - Database: three new nullable columns on `project_sync_jobs` — `snapshot` (jsonb), `snapshot_taken_at` (timestamp), `snapshot_size_bytes` (int). Existing rows are unaffected; `hasSnapshot` is `false` for them.
  - Worker: the snapshot is captured **inside the import transaction**, immediately before `importProjectCdm` runs. If the import throws, the snapshot rolls back along with it — a `failed` job has no snapshot, which is correct because the project state did not change.
  - Web: new `Export current` button next to `Start sync` in the toolbar and empty states, plus a `Rollback snapshot` tab in the sync-job view dialog (reload + download, matches the existing payload tab).
  - Internals: per-entity sync logic lives in `ICdmEntityHandler` implementations (`*CdmEntity` classes under `apps/api/src/lib/cdm/entities/`). See `apps/api/src/lib/cdm/README.md` for the extension contract.

### Patch Changes

- @grantjs/schema@1.1.0
- @grantjs/core@1.0.0
- @grantjs/jobs@1.0.0
- @grantjs/analytics@1.0.0
- @grantjs/cache@1.0.0
- @grantjs/constants@1.0.0
- @grantjs/database@1.0.0
- @grantjs/email@1.0.0
- @grantjs/errors@1.0.0
- @grantjs/logger@1.0.0
- @grantjs/storage@1.0.0
- @grantjs/telemetry@1.0.0
