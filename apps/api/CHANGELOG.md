# grant-api

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
