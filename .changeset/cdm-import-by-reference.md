---
'grant-api': minor
'@grantjs/schema': minor
---

CDM imports can travel by reference, so their size is no longer bounded by the API's request body (ADR 0009). `POST /api/projects/{id}/sync/upload-url` (GraphQL `requestProjectSyncUploadUrl`) mints a presigned PUT and an `uploadId`; `PUT` the JSON file there, then start the import with `source: { uploadId }` on `POST /api/projects/{id}/sync/jobs` (GraphQL `startProjectSync`), keeping `mode` and omitting the entity arrays. The inline path is unchanged and stays the default.

By reference, the document is read and validated by the worker, with the same schema and rules as an inline body, so a schema error, a `mode` or `version` that differs from the request's, or more entities than `CDM_IMPORT_MAX_ENTITIES` (default 5,000; `0` is unlimited) is an asynchronous `FAILED` job whose `errorMessage` starts with a code such as `CDM_IMPORT_TOO_MANY_ENTITIES`, not a synchronous 4xx. The uploaded object is deleted when the job ends, `GET .../sync/jobs/{jobId}/payload` answers `{ byReference: true, sizeBytes }` for such a job, and the local `/storage` mount never serves `imports/`. New settings: `CDM_UPLOAD_MAX_BYTES` (default 64 MiB) and `CDM_IMPORT_MAX_ENTITIES`. Migration 0085 makes `project_sync_jobs.payload` nullable and adds `payload_path`, `payload_size_bytes` and `entity_count_hint`.

`SyncProjectInput` (GraphQL) gains `source`, and its `version`, `roles` and `users` become optional, to be required again unless `source` is set. The REST import body now keeps `searchable` on groups, roles and users, which it used to drop silently while the GraphQL input kept it.
