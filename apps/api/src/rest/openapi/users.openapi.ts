import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  createUserRequestSchema,
  createUserResponseSchema,
  deleteUserQuerySchema,
  deleteUserResponseSchema,
  errorResponseSchema,
  getUsersQuerySchema,
  getUsersResponseSchema,
  notFoundErrorResponseSchema,
  updateUserRequestSchema,
  updateUserResponseSchema,
  userParamsSchema,
  userSchema,
  userWithRelationsSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export function registerUserEndpoints(registry: OpenAPIRegistry) {
  registry.register('User', userSchema);
  registry.register('UserWithRelations', userWithRelationsSchema);
  registry.register('GetUsersQuery', getUsersQuerySchema);
  registry.register('GetUsersResponse', getUsersResponseSchema);
  registry.register('GetUserResponse', createSuccessResponseSchema(userWithRelationsSchema));
  registry.register('UserParams', userParamsSchema);

  /**
   * GET /api/users
   */
  registry.registerPath({
    method: 'get',
    path: '/api/users',
    tags: ['Users'],
    summary: 'List users',
    description: `
List users with optional filtering, pagination, and relation loading.

### Relations
You can load related data by specifying the \`relations\` query parameter:
- \`roles\`: Load user's roles
- \`tags\`: Load user's tags
- \`accounts\`: Load user's accounts
- \`authenticationMethods\`: Load user's authentication methods

Example: \`?relations=roles,tags\`

### Scope
Users are scoped to a tenant context. You must provide:
- \`scopeId\`: The UUID of the scope (account, organization, or project)
- \`tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Filtering
- \`search\`: Search by user name
- \`tagIds\`: Filter by tag IDs (comma-separated or array)
- \`sortField\`: Sort by field (\`name\`, \`createdAt\`, \`updatedAt\`)
- \`sortOrder\`: Sort order (\`ASC\` or \`DESC\`)

### Pagination
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)
    `.trim(),
    request: {
      query: getUsersQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved users',
        content: {
          'application/json': {
            schema: getUsersResponseSchema,
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
   * POST /api/users
   */
  registry.registerPath({
    method: 'post',
    path: '/api/users',
    tags: ['Users'],
    summary: 'Create a new user',
    description: `
Create a new user within a scope.

### Scope
The user is created within the specified scope:
- \`scope.id\`: The UUID of the scope (account, organization, or project)
- \`scope.tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Roles
You can optionally assign roles to the user:
- \`roleIds\`: Array of role UUIDs

### Tags
You can optionally assign tags to the user:
- \`tagIds\`: Array of tag UUIDs
- \`primaryTagId\`: UUID of the primary tag (must be included in tagIds)
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createUserRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'User created successfully',
        content: {
          'application/json': {
            schema: createUserResponseSchema,
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
   * PATCH /api/users/:id
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/users/{id}',
    tags: ['Users'],
    summary: 'Update a user',
    description: `
Update an existing user's details.

All fields are optional - only provide the fields you want to update.

### Roles
- \`roleIds\`: Replace all roles with new array

### Tags
- \`tagIds\`: Replace all tags with new array
- \`primaryTagId\`: Set or update the primary tag (must be included in tagIds)
    `.trim(),
    request: {
      params: userParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateUserRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'User updated successfully',
        content: {
          'application/json': {
            schema: updateUserResponseSchema,
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
        description: 'User not found',
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
   * DELETE /api/users/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/users/{id}',
    tags: ['Users'],
    summary: 'Delete a user',
    description: `
Delete a user (soft delete by default).

### Scope
You must provide the scope context:
- \`scopeId\`: The UUID of the scope where the user exists
- \`tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Deletion Type
- By default, users are soft deleted (marked as deleted but retained in the database)
- Set \`hardDelete=true\` to permanently delete the user

**Warning**: Hard deletion is irreversible and will cascade to related records.
    `.trim(),
    request: {
      params: userParamsSchema,
      query: deleteUserQuerySchema,
    },
    responses: {
      200: {
        description: 'User deleted successfully',
        content: {
          'application/json': {
            schema: deleteUserResponseSchema,
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
        description: 'User not found',
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
