import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  createProjectRequestSchema,
  createProjectResponseSchema,
  deleteProjectQuerySchema,
  deleteProjectResponseSchema,
  errorResponseSchema,
  getProjectsQuerySchema,
  getProjectsResponseSchema,
  notFoundErrorResponseSchema,
  projectParamsSchema,
  projectSchema,
  projectWithRelationsSchema,
  syncProjectPermissionsRequestSchema,
  syncProjectPermissionsResponseSchema,
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
  registry.register('SyncProjectPermissionsRequest', syncProjectPermissionsRequestSchema);
  registry.register('SyncProjectPermissionsResponse', syncProjectPermissionsResponseSchema);

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
   * POST /api/projects/:id/permissions/sync
   */
  registry.registerPath({
    method: 'post',
    path: '/api/projects/{id}/permissions/sync',
    tags: ['Projects'],
    summary: 'Sync project RBAC from canonical data model (CDM)',
    description: `
Replace-import roles, groups, and user role assignments tagged for this project from a versioned CDM payload.
Requires \`accountProject\` or \`organizationProject\` scope in the body.

This operation is intended for migrating external permission models into Grant's \`User → Role → Group → Permission\` graph.
    `.trim(),
    request: {
      params: projectParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: syncProjectPermissionsRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Sync completed',
        content: {
          'application/json': {
            schema: syncProjectPermissionsResponseSchema,
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
      404: {
        description: 'Project or permission not found',
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
