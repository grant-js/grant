---
title: CDM Import & Export
description: Import and export a project’s permission model as CDM JSON, async jobs, rollback snapshots, and APIs
---

# CDM Import & Export

**CDM** (Canonical Data Model) is a versioned JSON document that captures a project’s permission graph—roles, groups, permissions, resources, tags, and optional users. Use it to **clone**, **back up**, or **port** a model between Grant instances or from an external system.

Operators typically work from **Project → Import/Export** in the dashboard. Each import or export runs as an **async job**; large payloads are never applied inline.

## How it works

You start work from **Import/Export**. Grant runs the job in the background while the **jobs list** keeps updating; when it finishes, open the job to review tabs or download a file.

### Import

```bmermaid diagram-cdm-flow
sequenceDiagram
  actor You as You
  participant Screen as Import / Export
  participant Jobs as Jobs list
  participant Grant as Grant

  rect Upload
  Note over You, Screen: 1 · Upload
  You->>Screen: CDM file (.json)
  Screen->>Grant: Start import
  end

  rect Background
  Note over Grant, Jobs: 2 · Background
  Grant-->>Jobs: Pending → running
  Jobs-->>You: List updates
  Grant->>+Grant: Snapshot, then apply
  Note right of Grant: merge or replace
  Grant->>-Grant: Done
  end

  rect Review
  Note over Jobs, You: 3 · Review
  alt Success
    Grant-->>Jobs: Completed
    You->>Jobs: Details · Result · Payload
    You->>Grant: Rollback snapshot (optional)
  else Failed or cancelled
    Grant-->>Jobs: Failed / cancelled
    You->>Jobs: Details — error, warnings
  end
  end
```

- **`mode`** in the file sets **merge** (default) or **replace**; replace requires **`confirmDestructive`**.
- Only **CDM-managed** rows are updated; other project data is untouched.

### Export

```bmermaid diagram-cdm-flow
sequenceDiagram
  actor You as You
  participant Dialog as Export dialog
  participant Jobs as Jobs list
  participant Grant as Grant

  rect Configure
  Note over You, Dialog: 1 · Configure
  You->>Dialog: Contents — sections to include
  You->>Dialog: Options — strategy, version, …
  Note right of Dialog: Hints for a later import
  Dialog->>Grant: Start export
  end

  rect Background
  Note over Grant, Jobs: 2 · Background
  Grant-->>Jobs: Pending → running
  Jobs-->>You: Strategy on list
  Grant->>+Grant: Build CDM from project
  Grant->>-Grant: Done
  end

  rect Download
  Note over Jobs, You: 3 · Download
  Grant-->>Jobs: Completed
  You->>Jobs: Details — status, mode, version
  You->>Grant: Exported CDM
  end
```

- **Contents** chooses what goes in the file (e.g. permissions requires resources).
- **Options** are embedded in the download as `mode`; they do not change live data now. Job **Details** shows the same strategy and version—there is no separate options tab.

## Payload shape

Imports and exports use **`SyncProjectInput`** (GraphQL / codegen). Top-level fields:

| Field         | Purpose                                                       |
| ------------- | ------------------------------------------------------------- |
| `version`     | Schema version (currently `1`)                                |
| `id`          | Optional correlation id for audit / idempotency               |
| `mode`        | Import policy: `strategy`, `onConflict`, `confirmDestructive` |
| `resources`   | Project-scoped custom resources + membership                  |
| `permissions` | Project-scoped custom permissions + membership                |
| `groups`      | Group definitions and permission grouping                     |
| `roles`       | Roles with `groups`, `permissions`, tags                      |
| `users`       | User definitions / assignments + optional `userKey`           |
| `tags`        | Tag definitions + `project_tags` membership                   |

**Section rules**

- Every section is optional; omit a section to leave it unchanged (export) or skip it (import).
- If `permissions` is present, **`resources` must be present** in the same document.
- Grant does **not** auto-generate synthetic roles. Use the explicit CDM fields below for each grant path.
- **`user_tags` are global**—re-importing them affects every project the user belongs to. See [Tags & Relationships → CDM lifecycle](/core-concepts/tags-relationships#cdm-lifecycle-for-tags).

### Permission assignment paths (v1)

Each path in the document maps to native Grant edges on import:

| CDM fields                                                    | Runtime path                     |
| ------------------------------------------------------------- | -------------------------------- |
| `groups[].permissions` + `roles[].groups` + `users[].roles`   | User → Role → Group → Permission |
| `groups[].permissions` + `users[].groups`                     | User → Group → Permission        |
| `roles[].permissions` (no `roles[].groups`) + `users[].roles` | User → Role → Permission         |
| `users[].permissions`                                         | User → Permission                |

Export emits the same fields. Users may have **roles only**, **direct permissions only**, **direct groups only**, or any combination.

**Legacy documents:** if `users[].roles` contains `synthetic:role:user:…:direct`, import strips those keys and adds a job warning. Use `users.permissions` instead.

Replace-import removes existing **CDM-managed** rows for the project, then applies the payload. See [RBAC](/architecture/rbac) for how roles, groups, and permissions connect.

## Global catalog vs CDM-owned

|                    | Global catalog                                                                                    | CDM-owned rows                                       |
| ------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **What**           | Seeded `resources` / `permissions` shared by all projects                                         | Rows with `metadata.cdmImport` for this project      |
| **In export JSON** | Referenced as `resourceSlug:action` strings; `resources` / `permissions` sections often **empty** | Listed in CDM sections when custom definitions exist |
| **On edit**        | Changes affect **every** project using that catalog row                                           | Scoped to the project’s CDM import envelope          |
| **Isolation**      | Not isolated per project today                                                                    | —                                                    |

Imports resolve standard grants via **`permissionRefs`** (`resourceSlug` + `action` [+ `condition`]). CDM `resources` / `permissions` arrays list only **project-created** definitions (`metadata.cdmImport`), not the full system catalog.

::: info
**Strict per-project catalog isolation** (forking global permissions so edits never leak across projects) is not shipped. Treat catalog rows as **instance-wide** until a portable-catalog mode exists. See [Future: portable catalog](#future-portable-catalog) below.
:::

### Permission strings in roles and users

Each `roles[].permissions` or `users[].permissions` entry is either:

| Form         | Example                                      | When                                     |
| ------------ | -------------------------------------------- | ---------------------------------------- |
| Document key | Matches `permissions[].key` in the same file | Custom permission defined in CDM         |
| Catalog ref  | `project:update`                             | Slug + action; slug must not contain `:` |

Slugs are normalized (lowercase, hyphenated). Export emits `slug:action` for catalog-backed grants even when `resources` / `permissions` sections are empty.

## External keys {#identity-contract-opaque-external-keys}

Every CDM-portable entity has an opaque **`externalKey`**:

| Source           | Rule                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| **Importer**     | You supply the key; must be unique within its section                                                      |
| **Exporter**     | Grant generates stable keys like `cdm-tag-3f2a9b1c…` via `buildExternalKey(kind, …)`                       |
| **Traceability** | Original Grant ids live in `metadata.cdmSource` (`grantRoleId`, `grantTagId`, …)—never as cross-references |

**Users:** reference an existing account with `userAssignments[].userId`, or define `users[]` and link via `userAssignments[].userKey` → `users[].externalKey`.

**Resolving permission refs** (in `roleTemplates` / `userAssignments`), in order:

1. `permissionKey` → permission in the same document
2. `permissionId` → existing Grant UUID (legacy; new exports omit this)
3. `(resourceSlug, action [, condition])` → global catalog

## Provisioned users

The optional **`users`** section creates **new** Grant accounts for inbound porting. Assignments may reference them with **`userKey`**. Existing users still use **`userId`**.

Schema reference: [`SyncProjectInput`](https://github.com/logusgraphics/grant-platform/blob/main/packages/@grantjs/schema/src/schema/projects/inputs/sync-project-cdm.graphql).

## Dashboard permissions

| Action       | Permission       | Notes                          |
| ------------ | ---------------- | ------------------------------ |
| Start import | `Project:Update` | Enqueues async job             |
| Start export | `Project:Update` | Enqueues async job             |
| View jobs    | `Project:Query`  | List and detail                |
| Cancel job   | `Project:Update` | Best-effort if already running |

Scope must match the project (organization or personal), same as other project screens.

## Web UI

1. Open **Project → Import/Export** (`…/projects/{projectId}/import-export`).
2. **Import** — pick a `.json` file; validated, then enqueued. Original payload stored on the job.
3. **Export** — dialog with **Contents** and **Options** tabs ([below](#export-dialog-web)). Download CDM from the job row when complete.
4. The list **polls** while any job is `PENDING` or `RUNNING`.
5. **Job details** — status on **Details**; import adds **Result**, **Payload**, **Rollback snapshot**; export adds **Exported CDM**.

## Export dialog {#export-dialog-web}

The export dialog **enqueues a job**. It does not change live data—the worker snapshots the database when the job runs.

| Tab          | Purpose                                                     |
| ------------ | ----------------------------------------------------------- |
| **Contents** | Which CDM sections to include                               |
| **Options**  | Re-import defaults embedded in exported `mode` (hints only) |

### Contents {#export-dialog-contents}

| Checkbox                                    | Notes                                                            |
| ------------------------------------------- | ---------------------------------------------------------------- |
| Users                                       | Optional; nested **User API keys** (identities only, no secrets) |
| Roles, Groups, Resources, Permissions, Tags | Omit to exclude from JSON                                        |
| Permissions                                 | Requires **Resources** checked                                   |

- Selecting every section = full export (same as omitting `sections` filter).
- Exporting **users** without **roles** is valid when users have direct `permissions` or `groups` assignments.

### Re-import options {#export-reimport-defaults}

Values are stored in the job payload and copied into the artifact’s **`mode`** block. They describe how a **future import** of this file should behave—they do **not** run merge/replace during export.

The jobs table **Strategy** column shows the chosen mode for quick scanning.

#### Job name {#export-job-name}

Optional label for the jobs table and **idempotency** (`StartProjectExportInput.jobName`). Empty → defaults to project display name.

| Rule                     | Behavior                             |
| ------------------------ | ------------------------------------ |
| Same name, job in flight | Returns existing pending/running job |
| After completion         | May enqueue again with the same name |
| Failed / cancelled       | Retry with the same name allowed     |

#### Version {#export-cdm-version}

Schema version written into the export (`version`, currently **`1`**). Must match importer support.

#### Strategy {#export-reimport-mode}

| Value     | On import                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------ |
| `merge`   | Apply alongside existing CDM-managed rows (default)                                              |
| `replace` | Remove CDM-managed rows, then apply; requires [confirm destructive](#export-confirm-destructive) |

#### On conflict {#export-on-conflict}

Maps to `mode.onConflict` when set: `fail`, `skip`, or `update`. **Importer default** omits the field (typically `fail` for merge).

#### Confirm destructive {#export-confirm-destructive}

Required when strategy is **`replace`** (`mode.confirmDestructive: true` in JSON). Acknowledges that a future replace import may delete CDM-managed data. **Does not delete anything during export.**

## Sync jobs

Each operation is a row in **`project_sync_jobs`** (`operation` = `import` | `export`), run by the [job adapter](/advanced-topics/job-scheduling).

| State       | Meaning                      |
| ----------- | ---------------------------- |
| `pending`   | Queued                       |
| `running`   | Worker active                |
| `completed` | Success                      |
| `failed`    | Error on job row             |
| `cancelled` | Operator or system cancelled |

**Idempotency** — optional `jobName` (export) or CDM `id` (import):

|                     | Import                                                | Export                               |
| ------------------- | ----------------------------------------------------- | ------------------------------------ |
| Key                 | `SyncProjectInput.id` (often omitted)                 | `jobName` (defaults to project name) |
| In-flight duplicate | Returns same job per `(project, operation, job_name)` | Same                                 |
| After complete      | New upload = new row if no `id`                       | Same name allowed again              |

- **Poll** — GraphQL `projectSyncJobs` / `projectSyncJob`, or REST equivalents.
- **Payload** — `GET …/sync/jobs/{jobId}/payload` (submitted import JSON or export options).

## Rollback snapshot

Before an **import**, the worker exports the full project CDM **inside the same transaction**, then applies the import. If the import fails, the snapshot rolls back with the transaction.

| Surface            | Content                                               |
| ------------------ | ----------------------------------------------------- |
| GraphQL job fields | `hasSnapshot`, `snapshotTakenAt`, `snapshotSizeBytes` |
| `GET …/snapshot`   | Full JSON bytes (not inlined in GraphQL)              |

::: tip
There is no one-click “rollback” in the UI yet. Download the snapshot and start a new import to replay. Future secret-bearing CDM fields (e.g. BYOK) would need secrets re-supplied on replay.
:::

## REST API

Routes under **`/api/projects/{id}/…`** with `scopeId` and `tenant` (see [REST API](/api-reference/rest-api)).

| Method   | Path                           | Role                                                            |
| -------- | ------------------------------ | --------------------------------------------------------------- |
| `GET`    | `…/sync/jobs`                  | List jobs                                                       |
| `POST`   | `…/sync/jobs`                  | Enqueue import (body = CDM JSON)                                |
| `POST`   | `…/sync/jobs/export`           | Enqueue export                                                  |
| `GET`    | `…/sync/jobs/{jobId}`          | Job status                                                      |
| `GET`    | `…/sync/jobs/{jobId}/payload`  | Request JSON (import CDM or export options)                     |
| `GET`    | `…/sync/jobs/{jobId}/snapshot` | Import: pre-sync snapshot; export: generated CDM when completed |
| `DELETE` | `…/sync/jobs/{jobId}`          | Cancel                                                          |

## GraphQL

| Operation            | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `startProjectSync`   | Enqueue import                                    |
| `startProjectExport` | Enqueue export (`sections`, `mode`, `jobName`, …) |
| `cancelProjectSync`  | Cancel job                                        |
| `projectSyncJobs`    | Paginated list                                    |
| `projectSyncJob`     | Single job                                        |

Operation documents live in `packages/@grantjs/schema` for codegen.

## Row metadata

CDM-managed rows carry:

| Field                | Role                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| `metadata.cdmImport` | `projectId`, `kind`, `externalKey` — teardown, export filter, correlation |
| `metadata.cdmSource` | Trace ids (`grantRoleId`, `grantUserId`, …) and importer-owned JSON       |

Contributor details: [CDM README](https://github.com/logusgraphics/grant-platform/blob/main/apps/api/src/lib/cdm/README.md) in the API tree.

## Future: portable catalog {#future-portable-catalog}

Copying global catalog permissions per project (so edits never cross projects) would need coordinated changes to resolution, export, and slug rules. **Not shipped**—plan against global catalog semantics until such a mode exists.

## Extending CDM (contributors)

New entity types register via **`ICdmEntityHandler`** (shared by sync and export). Handler order, `cdmVersion` bumps, and tests are documented in:

- [`apps/api/src/lib/cdm/README.md`](https://github.com/logusgraphics/grant-platform/blob/main/apps/api/src/lib/cdm/README.md)

---

**Related**

- [RBAC System](/architecture/rbac) — roles, groups, permissions
- [Job scheduling](/advanced-topics/job-scheduling) — background workers
- [REST API](/api-reference/rest-api) — OpenAPI and conventions
- [Transport layers](/api-reference/transport-layers) — GraphQL vs REST
