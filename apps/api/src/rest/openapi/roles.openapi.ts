import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  createRoleRequestSchema,
  createRoleResponseSchema,
  deleteRoleQuerySchema,
  deleteRoleResponseSchema,
  errorResponseSchema,
  getRolesQuerySchema,
  getRolesResponseSchema,
  notFoundErrorResponseSchema,
  roleParamsSchema,
  roleSchema,
  roleWithRelationsSchema,
  updateRoleRequestSchema,
  updateRoleResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export function registerRolesOpenApi(registry: OpenAPIRegistry) {
  registry.register('Role', roleSchema);
  registry.register('RoleWithRelations', roleWithRelationsSchema);
  registry.register('GetRolesQuery', getRolesQuerySchema);
  registry.register('GetRolesResponse', getRolesResponseSchema);
  registry.register('GetRoleResponse', createSuccessResponseSchema(roleWithRelationsSchema));
  registry.register('RoleParams', roleParamsSchema);

  /**
   * GET /api/roles
   */
  registry.registerPath({
    method: 'get',
    path: '/api/roles',
    tags: ['Roles'],
    summary: 'List roles',
    description: `
List roles with optional filtering, pagination, and relation loading.

### Relations
You can load related data by specifying the \`relations\` query parameter:
- \`groups\`: Load role's groups
- \`tags\`: Load role's tags

Example: \`?relations=groups,tags\`

### Scope
Roles are scoped to a tenant context. You must provide:
- \`scopeId\`: The UUID of the scope (account, organization, or project)
- \`tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Filtering
- \`search\`: Search by role name
- \`tagIds\`: Filter by tag IDs (comma-separated or array)
- \`sortField\`: Sort by field (\`name\`, \`createdAt\`, \`updatedAt\`)
- \`sortOrder\`: Sort order (\`ASC\` or \`DESC\`)

### Pagination
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)
    `.trim(),
    request: {
      query: getRolesQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved roles',
        content: {
          'application/json': {
            schema: getRolesResponseSchema,
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
   * POST /api/roles
   */
  registry.registerPath({
    method: 'post',
    path: '/api/roles',
    tags: ['Roles'],
    summary: 'Create a new role',
    description: `
Create a new role within a scope.

### Scope
The role is created within the specified scope:
- \`scope.id\`: The UUID of the scope (account, organization, or project)
- \`scope.tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Tags
You can optionally assign tags to the role:
- \`tagIds\`: Array of tag UUIDs
- \`primaryTagId\`: UUID of the primary tag (must be included in tagIds)
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createRoleRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Role created successfully',
        content: {
          'application/json': {
            schema: createRoleResponseSchema,
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
   * PATCH /api/roles/:id
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/roles/{id}',
    tags: ['Roles'],
    summary: 'Update a role',
    description: `
Update an existing role's details.

All fields are optional - only provide the fields you want to update.

### Tags
- \`tagIds\`: Replace all tags with new array
- \`primaryTagId\`: Set or update the primary tag (must be included in tagIds)
    `.trim(),
    request: {
      params: roleParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateRoleRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Role updated successfully',
        content: {
          'application/json': {
            schema: updateRoleResponseSchema,
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
        description: 'Role not found',
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
   * DELETE /api/roles/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/roles/{id}',
    tags: ['Roles'],
    summary: 'Delete a role',
    description: `
Delete a role (soft delete by default).

### Scope
You must provide the scope context:
- \`scopeId\`: The UUID of the scope where the role exists
- \`tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Deletion Type
- By default, roles are soft deleted (marked as deleted but retained in the database)
- Set \`hardDelete=true\` to permanently delete the role

**Warning**: Hard deletion is irreversible and will cascade to related records.
    `.trim(),
    request: {
      params: roleParamsSchema,
      query: deleteRoleQuerySchema,
    },
    responses: {
      200: {
        description: 'Role deleted successfully',
        content: {
          'application/json': {
            schema: deleteRoleResponseSchema,
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
        description: 'Role not found',
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
