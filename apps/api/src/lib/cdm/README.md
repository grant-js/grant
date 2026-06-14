# CDM (canonical data model) extension contract

Registry and entity implementations for project CDM import/export. Orchestrators
(`ProjectImportService`, `ProjectExportService`) iterate `ICdmEntityHandler[]`
from `createDefaultCdmEntities` in [`registry.ts`](registry.ts).

**Naming:** In Grant, **Handler** means `apps/api/src/handlers` (transport). CDM
implementations are **`*CdmEntity`** classes under [`entities/`](entities/) — not
transport handlers.

## Layout

| Concern                | Location                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| Port                   | `packages/@grantjs/core/src/ports/services/cdm-entity-handler.port.ts` |
| Registry               | `apps/api/src/lib/cdm/registry.ts` (`createDefaultCdmEntities`)        |
| Entity implementations | `apps/api/src/lib/cdm/entities/*.cdm-entity.ts`                        |
| Helpers                | `apps/api/src/lib/cdm/*.lib.ts`                                        |
| Zod (shared)           | `apps/api/src/services/cdm.schemas.ts`                                 |
| Import orchestrator    | `apps/api/src/services/project-import.service.ts`                      |
| Export orchestrator    | `apps/api/src/services/project-export.service.ts`                      |
| Worker                 | `apps/api/src/jobs/project-sync.job.ts`                                |

## Add a new CDM entity

1. Extend `SyncProjectInput` in `@grantjs/schema`; run `pnpm --filter @grantjs/schema generate`.
2. Add `entities/<entity>.cdm-entity.ts` implementing `ICdmEntityHandler` (`handlerKind`, `inputKey`, `order`, `validateInput`, `collectPermissionRefs`, `teardown`, `apply`, `export`).
3. Register in `createDefaultCdmEntities` sorted by `order`.
4. Add zod rules to `services/cdm.schemas.ts` when validation is shared.
5. Tests: `tests/unit/lib/cdm/<entity>.cdm-entity.test.ts`, extend `cdm-handler-registry.test.ts` and `cdm-round-trip.integration.test.ts`.

See `docs/core-concepts/cdm-import-export.md` for operator flows and metadata (`cdmImport` / `cdmSource`).

## Identity contract

CDM is for porting a project's auth graph between Grant instances. `externalKey` is
opaque and unique within the document. Grant ids live in metadata for traceability.

```
metadata.cdmImport = { projectId, kind, externalKey }
metadata.cdmSource = { ...importer JSON, grantTagId / grantRoleId / ... }
```

`handlerKind` on the port matches `metadata.cdmImport.kind` for teardown lookup.

## Replace-import pivot sweep

Replace mode tombstones CDM-managed **entities** (`metadata.cdmImport` for the
project). When an entity row is soft-deleted, **every live pivot pointing at that
id must be soft-deleted too** — including pivots on non-CDM entities (for example
`project_app_tags` on manually created apps still referencing a removed CDM tag).

Bulk helpers live on `ProjectImportRepository`:

| Teardown trigger              | Pivot tables swept                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CDM tags                      | `project_tags`, `role_tags`, `group_tags`, `user_tags`, `project_app_tags`, `permission_tags`, `resource_tags`                                                |
| CDM permissions               | `project_permissions`, `group_permissions`, `permission_tags`, `role_permissions`, `user_permissions`, `project_user_permissions`, `project_role_permissions` |
| CDM roles (`deleteCdmRole`)   | `role_permissions`, `project_role_permissions`                                                                                                                |
| CDM groups (`deleteCdmGroup`) | `user_groups`, `project_user_groups`                                                                                                                          |

Pivot soft-deletes use microsecond-staggered timestamps where the table has a
unique index on `deleted_at`. Non-CDM entities themselves are never removed;
only their attachments to tombstoned CDM rows are cleared.

## Permission refs

The orchestrator deduplicates refs from all entities, then resolves in one pass before
`apply`. Resolution order: `permissionKey` → `permissionId` → `(resourceSlug, action)`.

## Expand → apply mapping (v1)

`expandCdmSyncInput` projects the public document into handler slices:

| Document            | Internal slice                           | Persisted as                                   |
| ------------------- | ---------------------------------------- | ---------------------------------------------- |
| `users.permissions` | `userAssignments[].directPermissionRefs` | `user_permissions`, `project_user_permissions` |
| `users.groups`      | `userAssignments[].directGroupKeys`      | `user_groups`, `project_user_groups`           |
| `users.roles`       | `userAssignments[].roleTemplateKeys`     | `user_roles`                                   |
| `roles.permissions` | `roleTemplates[].permissionRefs`         | `role_permissions` or group path               |
| `roles.groups`      | paired role + group template             | `role_groups`, `group_permissions`             |

Synthetic per-user roles are **not** generated. Legacy `synthetic:role:user:*` keys in
`users.roles` are stripped during expand with a warning on the import result.

## Export sections

REST `sections=` uses `CDM_EXPORT_SECTIONS` from `@grantjs/schema`. Partial export
assembly is in `cdm-export-assemble.lib.ts`.
