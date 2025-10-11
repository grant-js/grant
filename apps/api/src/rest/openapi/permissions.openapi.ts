import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  createPermissionRequestSchema,
  createPermissionResponseSchema,
  deletePermissionQuerySchema,
  deletePermissionResponseSchema,
  errorResponseSchema,
  getPermissionsQuerySchema,
  getPermissionsResponseSchema,
  notFoundErrorResponseSchema,
  permissionParamsSchema,
  permissionSchema,
  permissionWithRelationsSchema,
  updatePermissionRequestSchema,
  updatePermissionResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export function registerPermissionsOpenApi(registry: OpenAPIRegistry) {
  registry.register('Permission', permissionSchema);
  registry.register('PermissionWithRelations', permissionWithRelationsSchema);
  registry.register('GetPermissionsQuery', getPermissionsQuerySchema);
  registry.register('GetPermissionsResponse', getPermissionsResponseSchema);
  registry.register(
    'GetPermissionResponse',
    createSuccessResponseSchema(permissionWithRelationsSchema)
  );
  registry.register('PermissionParams', permissionParamsSchema);

  /**
   * GET /api/permissions
   */
  registry.registerPath({
    method: 'get',
    path: '/api/permissions',
    tags: ['Permissions'],
    summary: 'List permissions',
    description: `
List permissions with optional filtering, pagination, and relation loading.

### Relations
You can load related data by specifying the \`relations\` query parameter:
- \`tags\`: Load permission's tags

Example: \`?relations=tags\`

### Scope
Permissions are scoped to a tenant context. You must provide:
- \`scopeId\`: The UUID of the scope (account, organization, or project)
- \`tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Filtering
- \`search\`: Search by permission name or action
- \`tagIds\`: Filter by tag IDs (comma-separated or array)
- \`sortField\`: Sort by field (\`name\`, \`action\`, \`createdAt\`, \`updatedAt\`)
- \`sortOrder\`: Sort order (\`ASC\` or \`DESC\`)

### Pagination
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)
    `.trim(),
    request: {
      query: getPermissionsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved permissions',
        content: {
          'application/json': {
            schema: getPermissionsResponseSchema,
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
   * POST /api/permissions
   */
  registry.registerPath({
    method: 'post',
    path: '/api/permissions',
    tags: ['Permissions'],
    summary: 'Create a new permission',
    description: `
Create a new permission within a scope.

### Scope
The permission is created within the specified scope:
- \`scope.id\`: The UUID of the scope (account, organization, or project)
- \`scope.tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Action
The action field defines what operation this permission grants:
- \`action\`: A string describing the action (e.g., "read:users", "write:projects", "delete:groups")

### Tags
You can optionally assign tags to the permission:
- \`tagIds\`: Array of tag UUIDs
- \`primaryTagId\`: UUID of the primary tag (must be included in tagIds)
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createPermissionRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Permission created successfully',
        content: {
          'application/json': {
            schema: createPermissionResponseSchema,
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
   * PATCH /api/permissions/:id
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/permissions/{id}',
    tags: ['Permissions'],
    summary: 'Update a permission',
    description: `
Update an existing permission's details.

All fields are optional - only provide the fields you want to update.

### Action
- \`action\`: Update the action string (e.g., "read:users", "write:projects")

### Tags
- \`tagIds\`: Replace all tags with new array
- \`primaryTagId\`: Set or update the primary tag (must be included in tagIds)
    `.trim(),
    request: {
      params: permissionParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updatePermissionRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Permission updated successfully',
        content: {
          'application/json': {
            schema: updatePermissionResponseSchema,
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
        description: 'Permission not found',
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
   * DELETE /api/permissions/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/permissions/{id}',
    tags: ['Permissions'],
    summary: 'Delete a permission',
    description: `
Delete a permission (soft delete by default).

### Scope
You must provide the scope context:
- \`scopeId\`: The UUID of the scope where the permission exists
- \`tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Deletion Type
- By default, permissions are soft deleted (marked as deleted but retained in the database)
- Set \`hardDelete=true\` to permanently delete the permission

**Warning**: Hard deletion is irreversible and will cascade to related records.
    `.trim(),
    request: {
      params: permissionParamsSchema,
      query: deletePermissionQuerySchema,
    },
    responses: {
      200: {
        description: 'Permission deleted successfully',
        content: {
          'application/json': {
            schema: deletePermissionResponseSchema,
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
        description: 'Permission not found',
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
