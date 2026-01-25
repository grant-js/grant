import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  accountSchema,
  authenticationErrorResponseSchema,
  errorResponseSchema,
  exportUserDataResponseSchema,
  notFoundErrorResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import {
  changeMyPasswordRequestSchema,
  changeMyPasswordResponseSchema,
  createMySecondaryAccountResponseSchema,
  createMyUserAuthenticationMethodRequestSchema,
  createMyUserAuthenticationMethodResponseSchema,
  deleteMyAccountsBodySchema,
  deleteMyAccountsResponseSchema,
  getMyUserAuthenticationMethodsResponseSchema,
  getMyUserSessionsQuerySchema,
  getMyUserSessionsResponseSchema,
  logoutMyUserResponseSchema,
  myUserSessionSchema,
  revokeMyUserSessionParamsSchema,
  revokeMyUserSessionResponseSchema,
  uploadMyUserPictureRequestSchema,
  uploadMyUserPictureResponseSchema,
  userAuthenticationMethodSchema,
} from '@/rest/schemas/me.schemas';

export function registerMeEndpoints(registry: OpenAPIRegistry) {
  // Register schemas
  registry.register('UserAuthenticationMethod', userAuthenticationMethodSchema);
  registry.register('GetMyUserSessionsQuery', getMyUserSessionsQuerySchema);
  registry.register('GetMyUserSessionsResponse', getMyUserSessionsResponseSchema);
  registry.register('ChangeMyPasswordRequest', changeMyPasswordRequestSchema);
  registry.register('ChangeMyPasswordResponse', changeMyPasswordResponseSchema);
  registry.register('UserSession', myUserSessionSchema);
  registry.register('RevokeMyUserSessionParams', revokeMyUserSessionParamsSchema);
  registry.register('RevokeMyUserSessionResponse', revokeMyUserSessionResponseSchema);
  registry.register('LogoutMyUserResponse', logoutMyUserResponseSchema);
  registry.register('ExportUserDataResponse', exportUserDataResponseSchema);
  registry.register('UploadMyUserPictureRequest', uploadMyUserPictureRequestSchema);
  registry.register('UploadMyUserPictureResponse', uploadMyUserPictureResponseSchema);
  registry.register(
    'CreateMyUserAuthenticationMethodRequest',
    createMyUserAuthenticationMethodRequestSchema
  );
  registry.register(
    'CreateMyUserAuthenticationMethodResponse',
    createMyUserAuthenticationMethodResponseSchema
  );
  registry.register(
    'GetMyUserAuthenticationMethodsResponse',
    getMyUserAuthenticationMethodsResponseSchema
  );
  registry.register('DeleteMyAccountsBody', deleteMyAccountsBodySchema);
  registry.register('DeleteMyAccountsResponse', deleteMyAccountsResponseSchema);
  registry.register('CreateMySecondaryAccountResponse', createMySecondaryAccountResponseSchema);

  /**
   * GET /api/me
   */
  registry.registerPath({
    method: 'get',
    path: '/api/me',
    tags: ['Me'],
    summary: 'Get current user information',
    description: `
Get information about the currently authenticated user.

This endpoint requires authentication via Authorization header (Bearer token) or authentication cookie.

### Response
Returns user account information including:
- \`accounts\`: Array of user's accounts
- \`email\`: User's email address (from authentication methods)
- \`requiresEmailVerification\`: Whether email verification is required
- \`verificationExpiry\`: Date when email verification expires (if applicable)
    `.trim(),
    request: {},
    responses: {
      200: {
        description: 'Successfully retrieved user information',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.object({
                accounts: z.array(accountSchema),
                email: z.string().nullable(),
                requiresEmailVerification: z.boolean(),
                verificationExpiry: z.string().datetime().nullable(),
              }),
            }),
            example: {
              success: true,
              data: {
                accounts: [
                  {
                    id: 'acc_123',
                    type: 'personal',
                    ownerId: 'usr_456',
                    createdAt: '2025-10-11T00:00:00Z',
                    updatedAt: '2025-10-11T00:00:00Z',
                    deletedAt: null,
                  },
                ],
                email: 'user@example.com',
                requiresEmailVerification: false,
                verificationExpiry: null,
              },
            },
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
   * POST /api/me/accounts
   * Create a secondary account
   */
  registry.registerPath({
    method: 'post',
    path: '/api/me/accounts',
    tags: ['Me'],
    summary: 'Create a secondary account for the current user',
    description: `
Create a secondary account for the authenticated user.

If the user has a Personal account, this creates an Organization account.
If the user has an Organization account, this creates a Personal account.

Users can have a maximum of 2 accounts (one Personal and one Organization).
    `.trim(),
    request: {},
    responses: {
      201: {
        description: 'Successfully created complementary account',
        content: {
          'application/json': {
            schema: createMySecondaryAccountResponseSchema,
            example: {
              success: true,
              data: {
                account: {
                  id: 'acc_456',
                  type: 'organization',
                  ownerId: 'usr_456',
                  createdAt: '2025-10-11T00:00:00Z',
                  updatedAt: '2025-10-11T00:00:00Z',
                  deletedAt: null,
                },
                accounts: [
                  {
                    id: 'acc_123',
                    type: 'personal',
                    ownerId: 'usr_456',
                    createdAt: '2025-10-10T00:00:00Z',
                    updatedAt: '2025-10-10T00:00:00Z',
                    deletedAt: null,
                  },
                  {
                    id: 'acc_456',
                    type: 'organization',
                    ownerId: 'usr_456',
                    createdAt: '2025-10-11T00:00:00Z',
                    updatedAt: '2025-10-11T00:00:00Z',
                    deletedAt: null,
                  },
                ],
              },
            },
          },
        },
      },
      400: {
        description: 'Validation error or user already has 2 accounts',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
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
   * DELETE /api/me/accounts
   * Delete user accounts (marks all accounts and user for deletion)
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/me/accounts',
    tags: ['Me'],
    summary: 'Delete all current user accounts and user',
    description: `
Delete user accounts. This marks ALL user's accounts and the user itself for deletion.

### Authorization
Users can only delete their own accounts. 

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
- Only the account owner can delete their accounts
- All deletions are logged for audit purposes
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: deleteMyAccountsBodySchema,
            example: {
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
            schema: deleteMyAccountsResponseSchema,
            example: {
              success: true,
              data: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'John Doe',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-15T10:30:00.000Z',
                deletedAt: '2024-01-15T10:30:00.000Z',
              },
            },
          },
        },
      },
      400: {
        description: 'Validation error',
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

  /**
   * GET /api/me/export
   */
  registry.registerPath({
    method: 'get',
    path: '/api/me/export',
    tags: ['Me'],
    summary: 'Export current user data',
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
    request: {},
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
   * POST /api/me/picture
   */
  registry.registerPath({
    method: 'post',
    path: '/api/me/picture',
    tags: ['Me'],
    summary: 'Upload current user profile picture',
    description: `
Upload a profile picture for the authenticated user.

### Authentication
You can only upload pictures for your own account.

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
      body: {
        content: {
          'application/json': {
            schema: uploadMyUserPictureRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Picture uploaded successfully',
        content: {
          'application/json': {
            schema: uploadMyUserPictureResponseSchema,
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
   * GET /api/me/authentication-methods
   */
  registry.registerPath({
    method: 'get',
    path: '/api/me/authentication-methods',
    tags: ['Me'],
    summary: 'Get current user authentication methods',
    description: `
Get all authentication methods for the authenticated user.

### Authorization
Users can only query their own authentication methods.
    `.trim(),
    request: {},
    responses: {
      200: {
        description: 'Successfully retrieved authentication methods',
        content: {
          'application/json': {
            schema: getMyUserAuthenticationMethodsResponseSchema,
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
   * POST /api/me/authentication-methods
   */
  registry.registerPath({
    method: 'post',
    path: '/api/me/authentication-methods',
    tags: ['Me'],
    summary: 'Create a new authentication method for the current user',
    description: `
Create a new authentication method for the authenticated user.

### Authorization
Users can only create authentication methods for themselves.

### Supported Providers
- \`email\`: Email/password authentication
- \`google\`: Google OAuth authentication
- \`github\`: GitHub OAuth authentication

### Provider Data
The \`providerData\` field contains provider-specific information:
- For \`email\`: Contains password hash and verification token
- For OAuth providers: Contains OAuth tokens and user information
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createMyUserAuthenticationMethodRequestSchema,
            example: {
              provider: 'email',
              providerId: 'user@example.com',
              providerData: {
                password: 'hashed_password',
              },
              isVerified: false,
              isPrimary: false,
            },
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Successfully created authentication method',
        content: {
          'application/json': {
            schema: createMyUserAuthenticationMethodResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body or validation failed',
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
   * POST /api/me/change-password
   */
  registry.registerPath({
    method: 'post',
    path: '/api/me/change-password',
    tags: ['Me'],
    summary: 'Change current user password',
    description: `
Change the password for the authenticated user's email authentication method.

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
      body: {
        content: {
          'application/json': {
            schema: changeMyPasswordRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password changed successfully',
        content: {
          'application/json': {
            schema: changeMyPasswordResponseSchema,
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
   * GET /api/me/sessions
   */
  registry.registerPath({
    method: 'get',
    path: '/api/me/sessions',
    tags: ['Me'],
    summary: 'Get current user sessions',
    description: `
Get all active sessions for the authenticated user.

### Authorization
Users can only query their own sessions.

### Filtering
- \`audience\`: Filter by session audience (scope)
- \`page\`: Page number for pagination
- \`limit\`: Number of items per page
    `.trim(),
    request: {
      query: getMyUserSessionsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved user sessions',
        content: {
          'application/json': {
            schema: getMyUserSessionsResponseSchema,
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
   * DELETE /api/me/sessions/{sessionId}
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/me/sessions/{sessionId}',
    tags: ['Me'],
    summary: 'Revoke a specific session for the current user',
    description: `
Revoke (delete) a specific user session.

### Authorization
Users can only revoke their own sessions.

### Effects
- The session token will be invalidated immediately
- The user will need to log in again if this was their current session
    `.trim(),
    request: {
      params: revokeMyUserSessionParamsSchema,
    },
    responses: {
      200: {
        description: 'Session revoked successfully',
        content: {
          'application/json': {
            schema: revokeMyUserSessionResponseSchema,
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
   * POST /api/me/logout
   */
  registry.registerPath({
    method: 'post',
    path: '/api/me/logout',
    tags: ['Me'],
    summary: 'Logout current user and revoke session',
    description: `
Logout the authenticated user and revoke their current session.

### Authorization
Users can only logout their own session. This endpoint requires authentication via Authorization header (Bearer token) or authentication cookie.

### Effects
- The current session token will be invalidated immediately
- The session will be marked as deleted (soft delete)
- The user will need to log in again to access protected resources
- All cookies and tokens associated with this session become invalid

### Session Revocation
This endpoint automatically identifies and revokes the session associated with the current authentication token. Unlike \`DELETE /api/me/sessions/{sessionId}\`, this endpoint does not require specifying a session ID - it uses the session from the current authentication context.
    `.trim(),
    request: {},
    responses: {
      200: {
        description: 'Successfully logged out',
        content: {
          'application/json': {
            schema: logoutMyUserResponseSchema,
            example: {
              success: true,
              data: {
                message: 'Logged out successfully',
              },
            },
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
}
