import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  authenticationErrorResponseSchema,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  createUserRequestSchema,
  createUserResponseSchema,
  deleteUserAccountRequestSchema,
  deleteUserQuerySchema,
  deleteUserResponseSchema,
  errorResponseSchema,
  exportUserDataResponseSchema,
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
  registry.register('ExportUserDataResponse', exportUserDataResponseSchema);
  registry.register('DeleteUserAccountRequest', deleteUserAccountRequestSchema);

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
        sessionId: z.uuid('Invalid session ID'),
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

  /**
   * GET /api/users/{id}/export
   */
  registry.registerPath({
    method: 'get',
    path: '/api/users/{id}/export',
    tags: ['Users'],
    summary: 'Export user data',
    description: `
Export all personal data for the authenticated user (GDPR compliance).

### Authorization
Users can only export their own data.

### Data Included
The export includes:
- User profile information (name, email, timestamps)
- All accounts owned by the user
- Authentication methods (excluding sensitive data like hashed passwords)
- Active and expired sessions
- Organization memberships with roles
- Project memberships with roles

### Response Format
The response is a JSON file download with:
- Content-Type: \`application/json\`
- Content-Disposition: \`attachment; filename="user-data-{userId}-{timestamp}.json"\`

### GDPR Compliance
This endpoint supports the GDPR "Right to Data Portability" requirement, allowing users to obtain a copy of their personal data in a structured, commonly used, and machine-readable format.
    `.trim(),
    request: {
      params: userParamsSchema,
    },
    responses: {
      200: {
        description: 'User data export file',
        content: {
          'application/json': {
            schema: exportUserDataResponseSchema,
            example: {
              user: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'John Doe',
                email: 'john.doe@example.com',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-15T10:30:00.000Z',
              },
              accounts: [
                {
                  id: 'acc_123',
                  name: 'Personal Account',
                  slug: 'personal-account',
                  type: 'personal',
                  createdAt: '2024-01-01T00:00:00.000Z',
                  updatedAt: '2024-01-01T00:00:00.000Z',
                },
              ],
              authenticationMethods: [
                {
                  provider: 'email',
                  providerId: 'john.doe@example.com',
                  isVerified: true,
                  isPrimary: true,
                  lastUsedAt: '2024-01-15T10:30:00.000Z',
                  createdAt: '2024-01-01T00:00:00.000Z',
                },
              ],
              sessions: [
                {
                  userAgent: 'Mozilla/5.0...',
                  ipAddress: '192.168.1.1',
                  lastUsedAt: '2024-01-15T10:30:00.000Z',
                  expiresAt: '2024-02-01T00:00:00.000Z',
                  createdAt: '2024-01-01T00:00:00.000Z',
                },
              ],
              organizationMemberships: [
                {
                  organizationId: 'org_123',
                  organizationName: 'Acme Corp',
                  role: 'Member',
                  joinedAt: '2024-01-05T00:00:00.000Z',
                },
              ],
              projectMemberships: [
                {
                  projectId: 'prj_123',
                  projectName: 'Project Alpha',
                  role: 'Developer',
                  joinedAt: '2024-01-10T00:00:00.000Z',
                },
              ],
              exportedAt: '2024-01-15T10:30:00.000Z',
            },
          },
        },
        headers: {
          'Content-Disposition': {
            description: 'Attachment header with filename',
            schema: {
              type: 'string',
              example:
                'attachment; filename="user-data-123e4567-e89b-12d3-a456-426614174000-1705312200000.json"',
            },
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
        description: 'Forbidden - You can only export your own data',
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
   * DELETE /api/users/{id}/account
   * Delete user account from privacy settings (marks all accounts and user for deletion)
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/users/{id}/account',
    tags: ['Users'],
    summary: 'Delete user account',
    description: `
Delete user account from privacy settings. This marks ALL user's accounts and the user itself for deletion.

### Authorization
Users can only delete their own account. The \`id\` parameter must match your authenticated user ID, and the \`userId\` in the request body must also match.

### Confirmation
The request body must include the user's \`userId\` to confirm the deletion. This prevents accidental or unauthorized account deletions.

### Deletion Type
- **Soft Delete** (default): The user and all their accounts are marked as deleted with a \`deletedAt\` timestamp but can be restored within the retention period (30 days by default).
- **Hard Delete**: Set \`hardDelete: true\` to permanently delete the user and all accounts immediately. This action cannot be undone.

### Data Retention
- Soft-deleted accounts and users are retained for 30 days (configurable via \`PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS\`)
- After the retention period, accounts and users are permanently deleted by the data retention cleanup job
- During the retention period, accounts can be restored

### Effects
- All accounts owned by the user are marked as deleted (\`deletedAt\` is set)
- The user is marked as deleted (\`deletedAt\` is set)
- All user relationships (roles, groups, permissions, memberships) are handled via database cascade rules
- The user will lose access to all accounts, organizations, and projects
- Accounts can be restored within the retention period

### Security
- User ID verification is required to prevent accidental deletions
- Only the account owner can delete their account
- All deletions are logged for audit purposes
    `.trim(),
    request: {
      params: userParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: deleteUserAccountRequestSchema,
            example: {
              userId: '123e4567-e89b-12d3-a456-426614174000',
              hardDelete: false,
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'User account deleted successfully',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(userSchema),
            example: {
              success: true,
              data: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'John Doe',
                email: 'john.doe@example.com',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-15T10:30:00.000Z',
                deletedAt: '2024-01-15T10:30:00.000Z',
              },
            },
          },
        },
      },
      400: {
        description: 'Validation error or userId mismatch',
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
        description: 'Forbidden - You can only delete your own account',
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
