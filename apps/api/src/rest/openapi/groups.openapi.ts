import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  createGroupRequestSchema,
  createGroupResponseSchema,
  deleteGroupQuerySchema,
  deleteGroupResponseSchema,
  errorResponseSchema,
  getGroupsQuerySchema,
  getGroupsResponseSchema,
  groupParamsSchema,
  groupSchema,
  groupWithRelationsSchema,
  notFoundErrorResponseSchema,
  updateGroupRequestSchema,
  updateGroupResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export function registerGroupsOpenApi(registry: OpenAPIRegistry) {
  registry.register('Group', groupSchema);
  registry.register('GroupWithRelations', groupWithRelationsSchema);
  registry.register('GetGroupsQuery', getGroupsQuerySchema);
  registry.register('GetGroupsResponse', getGroupsResponseSchema);
  registry.register('GetGroupResponse', createSuccessResponseSchema(groupWithRelationsSchema));
  registry.register('GroupParams', groupParamsSchema);

  /**
   * GET /api/groups
   */
  registry.registerPath({
    method: 'get',
    path: '/api/groups',
    tags: ['Groups'],
    summary: 'List groups',
    description: `
List groups with optional filtering, pagination, and relation loading.

### Relations
You can load related data by specifying the \`relations\` query parameter:
- \`permissions\`: Load group's permissions
- \`tags\`: Load group's tags

Example: \`?relations=permissions,tags\`

### Scope
Groups are scoped to a tenant context. You must provide:
- \`scopeId\`: The UUID of the scope (account, organization, or project)
- \`tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Filtering
- \`search\`: Search by group name
- \`tagIds\`: Filter by tag IDs (comma-separated or array)
- \`sortField\`: Sort by field (\`name\`, \`createdAt\`, \`updatedAt\`)
- \`sortOrder\`: Sort order (\`ASC\` or \`DESC\`)

### Pagination
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)
    `.trim(),
    request: {
      query: getGroupsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved groups',
        content: {
          'application/json': {
            schema: getGroupsResponseSchema,
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
   * POST /api/groups
   */
  registry.registerPath({
    method: 'post',
    path: '/api/groups',
    tags: ['Groups'],
    summary: 'Create a new group',
    description: `
Create a new group within a scope.

### Scope
The group is created within the specified scope:
- \`scope.id\`: The UUID of the scope (account, organization, or project)
- \`scope.tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Permissions
You can optionally assign permissions to the group:
- \`permissionIds\`: Array of permission UUIDs

### Tags
You can optionally assign tags to the group:
- \`tagIds\`: Array of tag UUIDs
- \`primaryTagId\`: UUID of the primary tag (must be included in tagIds)
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createGroupRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Group created successfully',
        content: {
          'application/json': {
            schema: createGroupResponseSchema,
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
   * PATCH /api/groups/:id
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/groups/{id}',
    tags: ['Groups'],
    summary: 'Update a group',
    description: `
Update an existing group's details.

All fields are optional - only provide the fields you want to update.

### Permissions
- \`permissionIds\`: Replace all permissions with new array

### Tags
- \`tagIds\`: Replace all tags with new array
- \`primaryTagId\`: Set or update the primary tag (must be included in tagIds)
    `.trim(),
    request: {
      params: groupParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateGroupRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Group updated successfully',
        content: {
          'application/json': {
            schema: updateGroupResponseSchema,
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
        description: 'Group not found',
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
   * DELETE /api/groups/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/groups/{id}',
    tags: ['Groups'],
    summary: 'Delete a group',
    description: `
Delete a group (soft delete by default).

### Scope
You must provide the scope context:
- \`scopeId\`: The UUID of the scope where the group exists
- \`tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Deletion Type
- By default, groups are soft deleted (marked as deleted but retained in the database)
- Set \`hardDelete=true\` to permanently delete the group

**Warning**: Hard deletion is irreversible and will cascade to related records.
    `.trim(),
    request: {
      params: groupParamsSchema,
      query: deleteGroupQuerySchema,
    },
    responses: {
      200: {
        description: 'Group deleted successfully',
        content: {
          'application/json': {
            schema: deleteGroupResponseSchema,
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
        description: 'Group not found',
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
