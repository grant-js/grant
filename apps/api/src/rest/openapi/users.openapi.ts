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
  setProjectUserEmailRequestSchema,
  setProjectUserEmailResponseSchema,
  setProjectUserPasswordRequestSchema,
  setProjectUserPasswordResponseSchema,
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
    operationId: 'getApiUsers',
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

### Computed Fields
You can include computed fields by specifying the \`fields\` query parameter:
- \`primaryTag\`: Load the user's primary tag in the requested scope
- \`tagCount\`: Count user's tags in the requested scope
- \`roleCount\`: Count user's roles in the requested scope
- \`permissionCount\`: Count user's direct permissions in the requested scope
- \`projectUserApiKeyCount\`: Count user's project API keys in the requested scope

Example: \`?fields=primaryTag,roleCount,tagCount\`

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
    operationId: 'postApiUsers',
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

### Groups
You can optionally assign groups directly to the user:
- \`groupIds\`: Array of group UUIDs

### Tags
You can optionally assign tags to the user:
- \`tagIds\`: Array of tag UUIDs
- \`primaryTagId\`: UUID of the primary tag (must be included in tagIds)

### Email
Optional \`email\` creates an unverified Email authentication method. Project-scope only. Requires \`ProjectUser:SetEmail\` in addition to \`User:Create\`.
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
      403: {
        description: 'Forbidden - User:Create, and ProjectUser:SetEmail when email is set',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      409: {
        description: 'This authentication method is already connected to another account',
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
   * PUT /api/users/:id/email
   */
  registry.registerPath({
    method: 'put',
    path: '/api/users/{id}/email',
    operationId: 'putApiUsersByIdEmail',
    tags: ['Users'],
    summary: 'Set a project user email',
    description: `
Add or replace the user's Email authentication method in a project scope.

Requires \`ProjectUser:SetEmail\`. The address is stored unverified. Same normalized address is a no-op. The user must be a project member.
    `.trim(),
    request: {
      params: userParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: setProjectUserEmailRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Email set successfully',
        content: {
          'application/json': {
            schema: setProjectUserEmailResponseSchema,
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
        description: 'Forbidden - ProjectUser:SetEmail required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'User is not a member of the project',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      409: {
        description: 'This authentication method is already connected to another account',
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
   * PUT /api/users/:id/password
   */
  registry.registerPath({
    method: 'put',
    path: '/api/users/{id}/password',
    operationId: 'putApiUsersByIdPassword',
    tags: ['Users'],
    summary: 'Set a project user password',
    description: `
Set or replace the user's project password, as written by the operator. Project scope only.

Requires \`ProjectUser:SetPassword\` (default Owner and Admin; extensible through groups). The user must be a project member (no user is created). The password must meet the password policy, which is checked before anything is written. The request body is never logged and the password is never returned, echoed in an error, or placed in an audit row or event. The same password set twice writes a new hash each time.

Revokes the user's project-app OAuth grants and clears the project lockout. Platform sessions are untouched and the Email method is not marked verified. Publishes \`project.user_password_set\` (ids and source only).
    `.trim(),
    request: {
      params: userParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: setProjectUserPasswordRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description:
          'Password set successfully; the response is the user and carries no credential',
        content: {
          'application/json': {
            schema: setProjectUserPasswordResponseSchema,
          },
        },
      },
      400: {
        description:
          'Invalid request, a non-project scope, or a password that does not meet the policy (the response names the rules, never the value)',
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
        description: 'Forbidden - ProjectUser:SetPassword required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'User is not a member of the project',
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
   * PATCH /api/users/:id
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/users/{id}',
    operationId: 'patchApiUsersById',
    tags: ['Users'],
    summary: 'Update a user',
    description: `
Update an existing user's details.

All fields are optional - only provide the fields you want to update.

### Roles
- \`roleIds\`: Replace all roles with new array

### Groups
- \`groupIds\`: Replace all direct groups with new array

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
    operationId: 'deleteApiUsersById',
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
