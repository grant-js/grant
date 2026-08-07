import {
  CDM_EXPORT_SECTIONS,
  CdmFindBy,
  CdmIfMissing,
  CdmModeStrategy,
  CdmOnConflict,
  ProjectSortableField,
  ProjectSyncJobSortableField,
  SortOrder,
} from '@grantjs/schema';

import { assertValidCdmExportSections } from '@/constants/cdm-export.constants';
import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  jsonSchema,
  listQuerySchema,
  scopeSchema,
  tenantSchema,
} from '@/rest/schemas/common.schemas';

/** OpenAPI-friendly wrapper for downloadable CDM JSON (payload, snapshot, export). */
export const cdmJsonArtifactSchema = jsonSchema.openapi({
  description:
    'CDM JSON document with the same logical shape as SyncProjectInput (version, mode, roles, users, optional resources, permissions, groups, tags).',
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const projectWithRelationsSchema = projectSchema.extend({
  roles: z.array(z.unknown()).optional(),
  groups: z.array(z.unknown()).optional(),
  permissions: z.array(z.unknown()).optional(),
  users: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
});

const projectRelationsEnum = z.enum(['roles', 'groups', 'permissions', 'users', 'tags']);

export const getProjectsQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.uuid('errors.validation.invalidScopeId'),
  tenant: tenantSchema,
  sortField: z
    .enum(Object.values(ProjectSortableField) as [ProjectSortableField, ...ProjectSortableField[]])
    .optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  tagIds: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (typeof val === 'string') {
        return val.split(',').map((v) => v.trim());
      }
      return val;
    })
    .optional(),
  relations: z
    .array(projectRelationsEnum)
    .optional()
    .openapi({
      description: 'Related entities to include in the response',
      example: ['roles', 'users', 'tags'],
    }),
});

export const getProjectsResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(projectWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);

export const createProjectRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .openapi({
      description: 'Name of the project',
      example: 'Mobile App',
    }),
  description: z.string().optional().openapi({
    description: 'Description of the project',
    example: 'iOS and Android mobile application',
  }),
  scope: scopeSchema,
  tagIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of tag IDs to assign to the project',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
  primaryTagId: z.string().optional().openapi({
    description: 'Primary tag ID for the project',
    example: '123e4567-e89b-12d3-a456-426614174001',
  }),
});

export const createProjectResponseSchema = createSuccessResponseSchema(projectSchema);

export const updateProjectRequestSchema = z.object({
  scope: scopeSchema,
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .optional()
    .openapi({
      description: 'Updated name of the project',
      example: 'Mobile App v2',
    }),
  description: z.string().optional().openapi({
    description: 'Updated description of the project',
    example: 'Next generation mobile application',
  }),
  tagIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of tag IDs to assign to the project',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
  primaryTagId: z.string().optional().openapi({
    description: 'Primary tag ID for the project',
    example: '123e4567-e89b-12d3-a456-426614174001',
  }),
});

export const projectParamsSchema = z.object({
  id: z.uuid('errors.validation.invalidProjectId').openapi({
    description: 'UUID of the project',
    example: '123e4567-e89b-12d3-a456-426614174005',
    param: { in: 'path', name: 'id' },
  }),
});

export const updateProjectResponseSchema = createSuccessResponseSchema(projectSchema);

export const deleteProjectQuerySchema = z.object({
  scopeId: z.uuid('errors.validation.invalidScopeId'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteProjectResponseSchema = createSuccessResponseSchema(projectSchema);

const cdmKeyResolverSchema = z.object({
  value: z.string().min(1),
  findBy: z.nativeEnum(CdmFindBy).optional(),
  ifMissing: z.nativeEnum(CdmIfMissing).optional(),
});

const resourceCdmSchema = z.object({
  key: z.string().min(1),
  slug: z.string().min(1).optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  actions: z.array(z.string().min(1)).min(1),
  tags: z.array(z.string().min(1)).optional(),
  primaryTag: z.string().min(1).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const permissionCdmSchema = z.object({
  key: z.string().min(1),
  resource: z.string().min(1),
  action: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  condition: z.record(z.string(), z.unknown()).optional().nullable(),
  groups: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  primaryTag: z.string().min(1).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const tagCdmSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1).max(255),
  color: z.string().min(1).max(50),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const groupCdmSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  primaryTag: z.string().min(1).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const roleCdmSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  groups: z.array(z.string().min(1)).optional(),
  permissions: z.array(z.string().min(1)).optional().openapi({
    description:
      'Opaque keys matching `permissions[].key` in this document, or catalog grants as `resourceSlug:action` (normalized; slug must not contain `:`).',
  }),
  tags: z.array(z.string().min(1)).optional(),
  primaryTag: z.string().min(1).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const userApiKeyCdmSchema = z.object({
  key: z.string().min(1).optional().nullable(),
  clientId: z.string().optional().nullable(),
  clientSecret: z.string().min(32, 'errors.validation.clientSecretMin32').optional(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const userCdmSchema = z.object({
  key: cdmKeyResolverSchema,
  name: z.string().min(1),
  roles: z.array(z.string().min(1)).optional(),
  groups: z.array(z.string().min(1)).optional(),
  permissions: z.array(z.string().min(1)).optional().openapi({
    description:
      'Direct permission keys or catalog `resourceSlug:action` strings not already implied by the user roles (see role `permissions`).',
  }),
  tags: z.array(z.string().min(1)).optional(),
  primaryTag: z.string().min(1).optional().nullable(),
  apiKeys: z.array(userApiKeyCdmSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const cdmModeSchema = z.object({
  strategy: z.nativeEnum(CdmModeStrategy),
  onConflict: z.nativeEnum(CdmOnConflict).optional().nullable(),
  confirmDestructive: z.boolean().optional(),
});

/**
 * Body for POST /api/projects/:id/sync/jobs.
 *
 * Enqueues an asynchronous CDM import job. The request
 * returns immediately with a job descriptor; clients poll the job resource
 * for status. Pass `id` to make the request idempotent — if an active
 * job already exists for the same `(project, id)` it is returned instead
 * of creating a new one.
 */
export const startProjectSyncRequestSchema = z
  .object({
    scope: scopeSchema,
    version: z.number().int().openapi({ example: 1 }),
    id: z.string().optional(),
    mode: cdmModeSchema,
    roles: z.array(roleCdmSchema),
    users: z.array(userCdmSchema),
    resources: z.array(resourceCdmSchema).optional().openapi({
      description:
        'Optional custom resources. Permissions in this document reference them by opaque `resource` keys.',
    }),
    permissions: z.array(permissionCdmSchema).optional().openapi({
      description:
        'Optional custom permissions for this project, each referencing a `resource` key from the same document.',
    }),
    groups: z.array(groupCdmSchema).optional(),
    tags: z.array(tagCdmSchema).optional().openapi({
      description:
        'Optional CDM tags; role and user `tags` reference these keys. `user_tags` are global rows.',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.mode.strategy === CdmModeStrategy.Replace && data.mode.confirmDestructive !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'mode.confirmDestructive must be true when mode.strategy is replace',
      });
    }
  });

export const projectSyncJobParamsSchema = z.object({
  id: z.uuid('errors.validation.invalidProjectId').openapi({
    description: 'UUID of the project',
    example: '123e4567-e89b-12d3-a456-426614174005',
    param: { in: 'path', name: 'id' },
  }),
  jobId: z.uuid('errors.validation.invalidJobId').openapi({
    description: 'UUID of the project sync job',
    example: '123e4567-e89b-12d3-a456-426614174099',
    param: { in: 'path', name: 'jobId' },
  }),
});

export const projectSyncJobScopeQuerySchema = z.object({
  /**
   * Project sync jobs only operate against `accountProject` or `organizationProject`
   * scopes whose id is a composite `${parentId}:${projectId}` — so we accept any
   * non-empty string here and let the handler enforce the precise format.
   */
  scopeId: z.string().min(1, 'errors.validation.invalidScopeId'),
  tenant: tenantSchema,
});

const CDM_EXPORT_SECTION_IDS = new Set<string>(CDM_EXPORT_SECTIONS);

/**
 * When a client mistakenly iterates a section name string for `append('sections', …)`,
 * the query becomes repeated single-character values. Collapse those back into one
 * token when they spell a known CDM section id.
 */
function normalizeCdmExportSectionsQueryInput(val: unknown): unknown {
  if (val === undefined || val === '') return val;
  if (!Array.isArray(val)) return val;
  const strings = val.filter((x): x is string => typeof x === 'string');
  if (strings.length < 2) return val;
  if (!strings.every((s) => s.length === 1)) return val;
  const merged = strings.join('');
  return CDM_EXPORT_SECTION_IDS.has(merged) ? merged : val;
}

/**
 * Body for POST /api/projects/:id/sync/jobs/export — enqueue async CDM export.
 */
export const startProjectExportJobRequestSchema = z
  .object({
    scope: scopeSchema,
    version: z.number().int().openapi({ example: 1 }),
    jobName: z.string().min(1).optional().nullable().openapi({
      description: 'Optional idempotency key; same as GraphQL `StartProjectExportInput.jobName`.',
    }),
    sections: z
      .preprocess(
        normalizeCdmExportSectionsQueryInput,
        z.union([z.string(), z.array(z.string())]).optional()
      )
      .transform((val) => {
        if (val === undefined || val === '') return undefined;
        if (typeof val === 'string') {
          return val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
        return val.map((s) => s.trim()).filter(Boolean);
      })
      .optional()
      .openapi({
        description:
          'CDM slices to include. Omit or empty for full export. Keep `permissions` paired with `resources`.',
        example: ['roles', 'users'],
      }),
    includeUserApiKeys: z.boolean().optional().openapi({
      description:
        'When users are exported, include `users[].apiKeys` rows (identity only). Default true when omitted.',
    }),
    mode: cdmModeSchema.optional().openapi({
      description:
        'Re-import defaults embedded in the exported CDM `mode` block; does not affect export execution.',
    }),
  })
  .superRefine((data, ctx) => {
    const sections = data.sections;
    if (sections == null || sections.length === 0) return;
    try {
      assertValidCdmExportSections(sections);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
      });
    }
  });

/**
 * Query for legacy tests of export `sections` query parsing (standalone GET export removed).
 * sync-job endpoints; `version` defaults to 1 — the only supported version
 * — so existing callers can omit it.
 */
export const exportProjectPermissionsQuerySchema = z.object({
  scopeId: z.string().min(1, 'errors.validation.invalidScopeId'),
  tenant: tenantSchema,
  version: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      return typeof val === 'string' ? parseInt(val, 10) : val;
    })
    .pipe(z.number().int().min(1).optional()),
  /**
   * CDM slices to include. Repeat `sections=` or use a comma-separated value.
   * Omit or leave empty for a full export (same as sync rollback snapshot).
   * Keep `permissions` paired with `resources` for complete references.
   */
  sections: z
    .preprocess(
      normalizeCdmExportSectionsQueryInput,
      z.union([z.string(), z.array(z.string())]).optional()
    )
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      if (typeof val === 'string') {
        return val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return val.map((s) => s.trim()).filter(Boolean);
    })
    .openapi({
      description:
        'CDM slices to include (repeat `sections` query param or comma-separated). Omit or empty = full export.',
      example: 'roles,users',
    }),
  /**
   * When `users` is included, whether to emit CDM-managed project user API key
   * rows (identity only; never secrets). Omit or `true` = include; `false` =
   * omit keys while still exporting user assignments. Ignored when `users` is not exported.
   */
  includeUserApiKeys: z
    .preprocess((val: unknown) => {
      if (val === undefined || val === null || val === '') return undefined;
      const v = Array.isArray(val) ? val[0] : val;
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v !== 0;
      const s = String(v).trim().toLowerCase();
      if (s === 'true' || s === '1' || s === 'yes') return true;
      if (s === 'false' || s === '0' || s === 'no') return false;
      return val;
    }, z.boolean().optional())
    .openapi({
      description:
        'Include project user API keys in `users[].apiKeys` when the `users` section is exported. Default true.',
      example: true,
    }),
});

const syncProjectResultSchema = z.object({
  projectId: z.string(),
  importId: z.string().nullable(),
  rolesCreated: z.number(),
  groupsCreated: z.number(),
  roleGroupsLinked: z.number(),
  groupPermissionsLinked: z.number(),
  projectRolesLinked: z.number(),
  projectGroupsLinked: z.number(),
  projectPermissionsLinked: z.number(),
  projectResourcesLinked: z.number(),
  projectUsersEnsured: z.number(),
  usersCreated: z.number(),
  userRolesAssigned: z.number(),
  projectUserApiKeysCreated: z.number(),
  tagsCreated: z.number(),
  projectTagsLinked: z.number(),
  roleTagsLinked: z.number(),
  groupTagsLinked: z.number(),
  userTagsLinked: z.number(),
  resourcesCreated: z.number(),
  permissionsCreated: z.number(),
  warnings: z.array(z.string()),
});

const projectSyncJobStatusEnum = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']);

const projectSyncJobOperationEnum = z.enum(['IMPORT', 'EXPORT']);

export const projectSyncJobSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  status: projectSyncJobStatusEnum,
  cdmVersion: z.number().int(),
  jobName: z.string().nullable(),
  operation: projectSyncJobOperationEnum,
  modeStrategy: z.enum(['merge', 'replace']).nullable(),
  result: syncProjectResultSchema.nullable(),
  warnings: z.array(z.string()),
  errorMessage: z.string().nullable(),
  enqueuedAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  hasSnapshot: z.boolean().openapi({
    description:
      'Whether a CDM JSON snapshot exists on this job (pre-import rollback for IMPORT; generated export artifact for EXPORT when completed).',
  }),
  snapshotTakenAt: z.string().nullable().openapi({
    description:
      'ISO timestamp when the snapshot was captured (imports) or when the export artifact was written (exports).',
  }),
  snapshotSizeBytes: z.number().int().nullable().openapi({
    description: 'Serialized snapshot JSON size in bytes, if a snapshot exists.',
  }),
});

export const projectSyncJobResponseSchema = createSuccessResponseSchema(projectSyncJobSchema);

/**
 * Query for listing project sync jobs.
 * Reuses the standard pagination/search shape and adds a status filter and the
 * scope query params shared with the single-job endpoint.
 */
export const listProjectSyncJobsQuerySchema = listQuerySchema
  .omit({ relations: true, ids: true })
  .extend({
    scopeId: z.string().min(1, 'errors.validation.invalidScopeId'),
    tenant: tenantSchema,
    sortField: z
      .enum(
        Object.values(ProjectSyncJobSortableField) as [
          ProjectSyncJobSortableField,
          ...ProjectSyncJobSortableField[],
        ]
      )
      .optional(),
    sortOrder: z.nativeEnum(SortOrder).optional(),
    status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional().openapi({
      description: 'Filter by lifecycle status',
      example: 'PENDING',
    }),
  });

export const listProjectSyncJobsResponseSchema = createSuccessResponseSchema(
  z.object({
    jobs: z.array(projectSyncJobSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);
