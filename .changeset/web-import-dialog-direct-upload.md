---
'grant-web': minor
'grant-api': minor
---

The web import dialog uploads the CDM file by reference (ADR 0009): it asks for an upload URL, PUTs the file's bytes straight to storage, and starts the job from the returned `uploadId`, so a file is no longer limited by the API's request body. The dropzone limit is no longer a hard-coded 25 MiB: `GET /api/config` now reports `cdmUploadMaxBytes` (`CDM_UPLOAD_MAX_BYTES`, default 64 MiB) and the dialog uses it; a refusal for size is shown as its own message with the limit. Files up to 8 MiB are still parsed in the browser for the preview, job name and entity-count hint; larger files go up unread, and the dialog asks for the import mode (merge or replace, with the replace confirmation) because it cannot read it from the file.

The job detail shows the async import failure codes (`CDM_IMPORT_TOO_MANY_ENTITIES`, `_DOCUMENT_INVALID`, `_DOCUMENT_NOT_JSON`, `_REQUEST_MISMATCH`, `_UPLOAD_MISSING`, `_DOCUMENT_TOO_LARGE`, `_STORAGE_FAILURE`) as translated text (English and German), and shows a by-reference payload as "stored by reference, N MiB" instead of a JSON dump. `proxyClientMaxBodySize` is raised to 64 MB so an upload to local storage through the Next dev/standalone server is not cut at the 10 MB default.
