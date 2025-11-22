import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  authenticationErrorResponseSchema,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  createUserRequestSchema,
  createUserResponseSchema,
  deleteUserQuerySchema,
  deleteUserResponseSchema,
  errorResponseSchema,
  getUserAuthenticationMethodsQuerySchema,
  getUserAuthenticationMethodsResponseSchema,
  getUserSessionsQuerySchema,
  getUserSessionsResponseSchema,
  getUsersQuerySchema,
  getUsersResponseSchema,
  notFoundErrorResponseSchema,
  revokeUserSessionResponseSchema,
  updateUserRequestSchema,
  updateUserResponseSchema,
  uploadUserPictureRequestSchema,
  uploadUserPictureResponseSchema,
  userAuthenticationMethodSchema,
  userParamsSchema,
  userSchema,
  userSessionSchema,
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
  registry.register('UploadUserPictureRequest', uploadUserPictureRequestSchema);
  registry.register('UploadUserPictureResponse', uploadUserPictureResponseSchema);
  registry.register('UserAuthenticationMethod', userAuthenticationMethodSchema);
  registry.register('GetUserAuthenticationMethodsQuery', getUserAuthenticationMethodsQuerySchema);
  registry.register(
    'GetUserAuthenticationMethodsResponse',
    getUserAuthenticationMethodsResponseSchema
  );
  registry.register('ChangePasswordRequest', changePasswordRequestSchema);
  registry.register('ChangePasswordResponse', changePasswordResponseSchema);
  registry.register('UserSession', userSessionSchema);
  registry.register('GetUserSessionsQuery', getUserSessionsQuerySchema);
  registry.register('GetUserSessionsResponse', getUserSessionsResponseSchema);
  registry.register('RevokeUserSessionResponse', revokeUserSessionResponseSchema);

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

  /**
   * POST /api/users/:id/picture
   */
  registry.registerPath({
    method: 'post',
    path: '/api/users/{id}/picture',
    tags: ['Users'],
    summary: 'Upload user profile picture',
    description: `
Upload a profile picture for a user.

### Authentication
You can only upload pictures for your own account. The \`id\` parameter must match your authenticated user ID.

### File Format
- **Content Types**: \`image/jpeg\`, \`image/png\`, \`image/gif\`, \`image/webp\`
- **File Extensions**: \`.jpg\`, \`.jpeg\`, \`.png\`, \`.gif\`, \`.webp\`
- **Max Size**: 5MB (configurable via \`STORAGE_UPLOAD_MAX_FILE_SIZE\`)

### File Encoding
The file must be provided as a base64-encoded string. You can include the data URI prefix:
\`\`\`
data:image/jpeg;base64,/9j/4AAQSkZJRg...
\`\`\`

Or just the base64 data:
\`\`\`
/9j/4AAQSkZJRg...
\`\`\`

### Response
Returns the public URL and storage path of the uploaded file. The user's \`pictureUrl\` field is automatically updated.
    `.trim(),
    request: {
      params: userParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: uploadUserPictureRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Picture uploaded successfully',
        content: {
          'application/json': {
            schema: uploadUserPictureResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body or file validation failed',
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
        description: 'Forbidden - You can only upload pictures for your own account',
        content: {
          'application/json': {
            schema: errorResponseSchema,
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
   * GET /api/users/{id}/authentication-methods
   */
  registry.registerPath({
    method: 'get',
    path: '/api/users/{id}/authentication-methods',
    tags: ['Users'],
    summary: 'Get user authentication methods',
    description: `
Get all authentication methods for a user.

### Authorization
Users can only query their own authentication methods.

### Filtering
- \`provider\`: Filter by provider type (\`email\`, \`google\`, \`github\`)
    `.trim(),
    request: {
      params: userParamsSchema,
      query: getUserAuthenticationMethodsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved authentication methods',
        content: {
          'application/json': {
            schema: getUserAuthenticationMethodsResponseSchema,
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
        description: 'User not found or unauthorized',
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
   * POST /api/users/{id}/change-password
   */
  registry.registerPath({
    method: 'post',
    path: '/api/users/{id}/change-password',
    tags: ['Users'],
    summary: 'Change user password',
    description: `
Change the password for a user's email authentication method.

### Authorization
Users can only change their own password.

### Password Requirements
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Must be different from current password
    `.trim(),
    request: {
      params: userParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: changePasswordRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password changed successfully',
        content: {
          'application/json': {
            schema: changePasswordResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request or password does not meet requirements',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required or incorrect current password',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'User not found or unauthorized',
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
   * GET /api/users/{id}/sessions
   */
  registry.registerPath({
    method: 'get',
    path: '/api/users/{id}/sessions',
    tags: ['Users'],
    summary: 'Get user sessions',
    description: `
Get all active sessions for a user.

### Authorization
Users can only query their own sessions.

### Filtering
- \`audience\`: Filter by session audience (scope)
- \`page\`: Page number for pagination
- \`limit\`: Number of items per page
    `.trim(),
    request: {
      params: userParamsSchema,
      query: getUserSessionsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved user sessions',
        content: {
          'application/json': {
            schema: getUserSessionsResponseSchema,
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
        description: 'User not found or unauthorized',
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
   * DELETE /api/users/{id}/sessions/{sessionId}
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/users/{id}/sessions/{sessionId}',
    tags: ['Users'],
    summary: 'Revoke a user session',
    description: `
Revoke (delete) a specific user session.

### Authorization
Users can only revoke their own sessions.

### Effects
- The session token will be invalidated immediately
- The user will need to log in again if this was their current session
    `.trim(),
    request: {
      params: userParamsSchema.extend({
        sessionId: z.string().uuid('Invalid session ID'),
      }),
    },
    responses: {
      200: {
        description: 'Session revoked successfully',
        content: {
          'application/json': {
            schema: revokeUserSessionResponseSchema,
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
        description: 'User or session not found, or unauthorized',
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
