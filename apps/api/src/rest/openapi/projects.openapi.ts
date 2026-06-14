import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  cdmJsonArtifactSchema,
  createProjectRequestSchema,
  createProjectResponseSchema,
  deleteProjectQuerySchema,
  deleteProjectResponseSchema,
  errorResponseSchema,
  getProjectsQuerySchema,
  getProjectsResponseSchema,
  listProjectSyncJobsQuerySchema,
  listProjectSyncJobsResponseSchema,
  notFoundErrorResponseSchema,
  projectParamsSchema,
  projectSchema,
  projectSyncJobParamsSchema,
  projectSyncJobResponseSchema,
  projectSyncJobSchema,
  projectSyncJobScopeQuerySchema,
  projectWithRelationsSchema,
  startProjectExportJobRequestSchema,
  startProjectSyncRequestSchema,
  updateProjectRequestSchema,
  updateProjectResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export function registerProjectsOpenApi(registry: OpenAPIRegistry) {
  registry.register('Project', projectSchema);
  registry.register('ProjectWithRelations', projectWithRelationsSchema);
  registry.register('GetProjectsQuery', getProjectsQuerySchema);
  registry.register('GetProjectsResponse', getProjectsResponseSchema);
  registry.register('GetProjectResponse', createSuccessResponseSchema(projectWithRelationsSchema));
  registry.register('ProjectParams', projectParamsSchema);
  registry.register('StartProjectSyncRequest', startProjectSyncRequestSchema);
  registry.register('ProjectSyncJob', projectSyncJobSchema);
  registry.register('ProjectSyncJobResponse', projectSyncJobResponseSchema);
  registry.register('ListProjectSyncJobsQuery', listProjectSyncJobsQuerySchema);
  registry.register('ListProjectSyncJobsResponse', listProjectSyncJobsResponseSchema);
  registry.register('StartProjectExportJobRequest', startProjectExportJobRequestSchema);
  registry.register('ProjectSyncJobParams', projectSyncJobParamsSchema);
  registry.register('ProjectSyncJobScopeQuery', projectSyncJobScopeQuerySchema);
  registry.register('CdmJsonArtifact', cdmJsonArtifactSchema);

  /**
   * GET /api/projects
   */
  registry.registerPath({
    method: 'get',
    path: '/api/projects',
    tags: ['Projects'],
    summary: 'List projects',
    description: `
List projects with optional filtering, pagination, and relation loading.

### Relations
You can load related data by specifying the \`relations\` query parameter:
- \`roles\`: Load project's roles
- \`groups\`: Load project's groups
- \`permissions\`: Load project's permissions
- \`users\`: Load project's users
- \`tags\`: Load project's tags

Example: \`?relations=roles,users,tags\`

### Scope
Projects are scoped to a parent tenant context. You must provide:
- \`scopeId\`: The UUID of the parent scope (account or organization)
- \`tenant\`: The parent tenant type (\`account\` or \`organization\`)

**Note**: Projects can contain nested resources but cannot be nested within other projects.

### Filtering
- \`search\`: Search by project name or slug
- \`tagIds\`: Filter by tag IDs (comma-separated or array)
- \`sortField\`: Sort by field (\`name\`, \`slug\`, \`createdAt\`, \`updatedAt\`)
- \`sortOrder\`: Sort order (\`ASC\` or \`DESC\`)

### Pagination
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)
    `.trim(),
    request: {
      query: getProjectsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved projects',
        content: {
          'application/json': {
            schema: getProjectsResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * POST /api/projects
   */
  registry.registerPath({
    method: 'post',
    path: '/api/projects',
    tags: ['Projects'],
    summary: 'Create a new project',
    description: `
Create a new project within a parent scope.

### Scope
The project is created within the specified parent scope:
- \`scope.id\`: The UUID of the parent scope (account or organization)
- \`scope.tenant\`: The parent tenant type (\`account\` or \`organization\`)

**Important**: Projects can only be created under accounts or organizations, not under other projects.

### Project Slug
A URL-friendly slug is automatically generated from the project name and can be used for:
- Human-readable URLs
- API queries by slug (where supported)
- Public-facing identifiers

### Tags
You can optionally assign tags to the project:
- \`tagIds\`: Array of tag UUIDs
- \`primaryTagId\`: UUID of the primary tag (must be included in tagIds)

### Use Cases
Projects are ideal for:
- Multi-tenant SaaS applications (one project per customer)
- Team workspaces
- Isolated environments (dev/staging/prod)
- Client projects in an agency
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createProjectRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Project created successfully',
        content: {
          'application/json': {
            schema: createProjectResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * POST /api/projects/:id/sync/jobs
   */
  registry.registerPath({
    method: 'post',
    path: '/api/projects/{id}/sync/jobs',
    tags: ['Projects'],
    summary: 'Start an asynchronous CDM import job',
    description: `
Enqueue an asynchronous CDM import job for the project. The endpoint returns
immediately with the created job descriptor in \`PENDING\` status; the actual import runs
in the background. Poll \`GET /api/projects/{id}/sync/jobs/{jobId}\` for status.

Requires a verified email and the same MFA policy as other mutating project routes, when
enforced. The body must include an \`accountProject\` or \`organizationProject\` scope.

This operation migrates external permission models into Grant using explicit CDM v1
assignment fields. Supported paths:

- \`users.roles\` + \`roles.groups\` + \`groups.permissions\` → User → Role → Group → Permission
- \`users.groups\` + \`groups.permissions\` → User → Group → Permission
- \`users.roles\` + \`roles.permissions\` → User → Role → Permission
- \`users.permissions\` → User → Permission

Synthetic per-user roles are **not** generated. Legacy \`synthetic:role:user:*:direct\` keys
in \`users.roles\` are stripped with an import warning — use \`users.permissions\` instead.

### Idempotency

Pass optional \`id\` on the CDM body as a stable **job name** for idempotent retries: if an active job (\`PENDING\`,
\`RUNNING\`, or \`COMPLETED\`) already exists for the same \`(project, operation=IMPORT, jobName)\`, the
existing job is returned instead of creating a new one.

### Metadata

Optional \`metadata\` on role templates and user assignments is stored under the
\`cdmSource\` key on created roles, groups, and \`project_users\` rows (do not send a
top-level \`cdmImport\` key in importer metadata).

### Project user API keys (\`projectUserApiKeys\`)

Optional array of per-member API keys. **Import:** each object must include a plaintext
\`clientSecret\` (BYOK, minimum length 32); the worker never logs it. **Export and
rollback snapshots** never include secrets — re-supply secrets when re-importing.

### Tags (\`tags\`)

Optional array of project tag definitions. When present, the worker recreates a
CDM-marked \`tags\` row + \`project_tags\` membership for each entry, then exposes
them to other CDM entities via \`externalKey\`. \`roleTemplates[].tagKeys\` and
\`groupTagKeys\` attach \`role_tags\`/\`group_tags\`; \`userAssignments[].tagKeys\`
attaches \`user_tags\`. **Note:** \`user_tags\` are global rows (cross-project effect).

### Resources and permissions (\`resources\`, \`permissions\`)

Optional arrays of project-scoped custom resources and permissions. When present,
the worker recreates CDM-marked \`resources\` / \`permissions\` rows plus their
\`project_resources\` / \`project_permissions\` membership for the importing project.
Permissions reference resources from the same document via \`resourceKey\`. Role
templates and user assignments may reference these permissions via
\`permissionRefs[i].permissionKey\`. Grant's global / system catalog is **not**
emitted as CDM — system permissions are referenced by \`resourceSlug\`+\`action\`.

### External keys (identity contract)

\`externalKey\` is opaque to Grant. Importer-supplied keys are accepted as-is and
must be unique within their section. Grant's exporter emits derived,
non-UUID-looking keys (e.g. \`cdm-tag-3f2a9b1c\`) so round-tripped exports never
leak Grant UUIDs as identity. Original Grant ids are preserved under
\`metadata.cdmSource\` (e.g. \`grantTagId\`, \`grantRoleId\`) for traceability.

### Permission ref resolution order

Inside \`permissionRefs[]\`: (1) \`permissionKey\` against permissions declared in
the same CDM document; (2) \`permissionId\` against an existing Grant permission
UUID (kept for back-compat); (3) \`(resourceSlug, action [, condition])\` against
the global catalog.
    `.trim(),
    request: {
      params: projectParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: startProjectSyncRequestSchema,
          },
        },
      },
    },
    responses: {
      202: {
        description: 'Sync job enqueued',
        content: {
          'application/json': {
            schema: projectSyncJobResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description:
          'Internal server error (may include misconfiguration such as jobs adapter disabled)',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * POST /api/projects/:id/sync/jobs/export
   */
  registry.registerPath({
    method: 'post',
    path: '/api/projects/{id}/sync/jobs/export',
    tags: ['Projects'],
    summary: 'Enqueue an asynchronous CDM export job',
    description: `
Enqueue an asynchronous CDM **export** job. Returns \`202\` with a \`ProjectSyncJob\`
descriptor (\`operation: EXPORT\`). Poll \`GET .../sync/jobs/{jobId}\` until \`COMPLETED\`,
then download the generated CDM JSON from \`GET .../sync/jobs/{jobId}/snapshot\`.

Same MFA and \`Project:update\` authorization as \`POST .../sync/jobs\` (import).

Optional \`jobName\` provides idempotency: an active job with the same
\`(project, operation=EXPORT, jobName)\` is returned instead of creating a duplicate.
    `.trim(),
    request: {
      params: projectParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: startProjectExportJobRequestSchema,
          },
        },
      },
    },
    responses: {
      202: {
        description: 'Export job enqueued',
        content: {
          'application/json': {
            schema: projectSyncJobResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description:
          'Internal server error (may include misconfiguration such as jobs adapter disabled)',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * GET /api/projects/:id/sync/jobs
   */
  registry.registerPath({
    method: 'get',
    path: '/api/projects/{id}/sync/jobs',
    tags: ['Projects'],
    summary: 'List project sync jobs',
    description: `
List asynchronous CDM import/export jobs for a project. Supports pagination, status filtering,
search by \`jobName\`, and sorting by \`enqueuedAt\`, \`startedAt\`, \`completedAt\`, \`status\`,
or \`jobName\`.

Each job row includes snapshot metadata (\`hasSnapshot\`, \`snapshotTakenAt\`, \`snapshotSizeBytes\`).

Use this endpoint to render a job history view; use \`GET .../sync/jobs/{jobId}\` to poll a single
job's lifecycle.
    `.trim(),
    request: {
      params: projectParamsSchema,
      query: listProjectSyncJobsQuerySchema,
    },
    responses: {
      200: {
        description: 'Paginated list of sync jobs',
        content: {
          'application/json': {
            schema: listProjectSyncJobsResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * GET /api/projects/:id/sync/jobs/:jobId/payload
   */
  registry.registerPath({
    method: 'get',
    path: '/api/projects/{id}/sync/jobs/{jobId}/payload',
    tags: ['Projects'],
    summary: 'Download the original CDM JSON payload for a sync job',
    description: `
Download the original \`SyncProjectInput\` JSON body that was submitted when the
sync job was enqueued. The response uses \`Content-Type: application/json\` and a
\`Content-Disposition: attachment\` header so browsers prompt for a save.
    `.trim(),
    request: {
      params: projectSyncJobParamsSchema,
      query: projectSyncJobScopeQuerySchema,
    },
    responses: {
      200: {
        description: 'Original CDM payload as a downloadable JSON file',
        content: {
          'application/json': {
            schema: cdmJsonArtifactSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project or sync job not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * GET /api/projects/:id/sync/jobs/:jobId/snapshot
   */
  registry.registerPath({
    method: 'get',
    path: '/api/projects/{id}/sync/jobs/{jobId}/snapshot',
    tags: ['Projects'],
    summary: 'Download the CDM JSON snapshot attached to a sync job',
    description: `
For **import** jobs: download the pre-sync rollback snapshot captured by the worker
inside the import transaction, just before the project's permissions were modified.

For **export** jobs (\`operation: EXPORT\`): download the generated CDM artifact after
the job reaches \`COMPLETED\` (returns 404 while the job is still running or if it failed).

The body has the same \`SyncProjectInput\` shape in both cases.

The response uses \`Content-Type: application/json\` and a \`Content-Disposition:
attachment\` header so browsers prompt for a save.
    `.trim(),
    request: {
      params: projectSyncJobParamsSchema,
      query: projectSyncJobScopeQuerySchema,
    },
    responses: {
      200: {
        description: 'Pre-sync snapshot as a downloadable JSON file',
        content: {
          'application/json': {
            schema: cdmJsonArtifactSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project, sync job, or snapshot not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * GET /api/projects/:id/sync/jobs/:jobId
   */
  registry.registerPath({
    method: 'get',
    path: '/api/projects/{id}/sync/jobs/{jobId}',
    tags: ['Projects'],
    summary: 'Get the status of a project sync job',
    description: `
Read the current state of an asynchronous CDM import or export job. Use this endpoint
to poll the lifecycle of a job started via \`POST .../sync/jobs\` (import) or
\`POST .../sync/jobs/export\` (export).

Snapshot metadata (\`hasSnapshot\`, \`snapshotTakenAt\`, \`snapshotSizeBytes\`) indicates whether
\`GET .../sync/jobs/{jobId}/snapshot\` will return a CDM JSON artifact (rollback snapshot for imports;
generated export for export jobs once \`COMPLETED\`).

Statuses:
- \`PENDING\`  — enqueued, not started yet
- \`RUNNING\`  — worker has picked up the job
- \`COMPLETED\` — successful run (\`result\` populated for imports; null for exports)
- \`FAILED\`    — worker errored (\`errorMessage\` populated)
- \`CANCELLED\` — cancelled before or during execution
    `.trim(),
    request: {
      params: projectSyncJobParamsSchema,
      query: projectSyncJobScopeQuerySchema,
    },
    responses: {
      200: {
        description: 'Sync job status retrieved',
        content: {
          'application/json': {
            schema: projectSyncJobResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project or sync job not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * DELETE /api/projects/:id/sync/jobs/:jobId
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/projects/{id}/sync/jobs/{jobId}',
    tags: ['Projects'],
    summary: 'Cancel a project sync job',
    description: `
Cancel a pending or running project sync job. Requires the same verified-email /
MFA gate as \`POST .../sync/jobs\`.

- If the job is \`PENDING\`, cancellation is immediate — the worker will not run.
- If the job is \`RUNNING\`, cancellation is recorded and the worker stops at the next
  checkpoint between phases (best-effort).
- Terminal statuses (\`COMPLETED\`, \`FAILED\`, \`CANCELLED\`) cannot be cancelled.
    `.trim(),
    request: {
      params: projectSyncJobParamsSchema,
      query: projectSyncJobScopeQuerySchema,
    },
    responses: {
      200: {
        description: 'Sync job cancelled (or cancellation requested)',
        content: {
          'application/json': {
            schema: projectSyncJobResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project or sync job not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      409: {
        description: 'Job is in a terminal state and cannot be cancelled',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * PATCH /api/projects/:id
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/projects/{id}',
    tags: ['Projects'],
    summary: 'Update a project',
    description: `
Update an existing project's details.

All fields are optional - only provide the fields you want to update.

### Name and Description
- \`name\`: Update the project name (slug will be regenerated if name changes)
- \`description\`: Update or clear the project description

### Tags
- \`tagIds\`: Replace all tags with new array
- \`primaryTagId\`: Set or update the primary tag (must be included in tagIds)

**Note**: Updating a project's name will regenerate its slug, which may affect URLs and integrations.
    `.trim(),
    request: {
      params: projectParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateProjectRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Project updated successfully',
        content: {
          'application/json': {
            schema: updateProjectResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters or body',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * DELETE /api/projects/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/projects/{id}',
    tags: ['Projects'],
    summary: 'Delete a project',
    description: `
Delete a project (soft delete by default).

### Scope
You must provide the parent scope context:
- \`scopeId\`: The UUID of the parent scope where the project exists
- \`tenant\`: The parent tenant type (\`account\` or \`organization\`)

### Deletion Type
- By default, projects are soft deleted (marked as deleted but retained in the database)
- Set \`hardDelete=true\` to permanently delete the project

**Warning**: 
- Deleting a project affects all nested resources (users, roles, groups, permissions)
- Hard deletion is irreversible and will cascade to all child resources
- Consider archiving or soft-deleting projects for audit and compliance purposes
- Soft-deleted projects can be restored if needed
    `.trim(),
    request: {
      params: projectParamsSchema,
      query: deleteProjectQuerySchema,
    },
    responses: {
      200: {
        description: 'Project deleted successfully',
        content: {
          'application/json': {
            schema: deleteProjectResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden - insufficient permissions for this resource or scope',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
}
