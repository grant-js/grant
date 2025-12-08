import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  authenticationErrorResponseSchema,
  errorResponseSchema,
  notFoundErrorResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';
import {
  apiKeyIdParamsSchema,
  createProjectUserApiKeyRequestSchema,
  deleteProjectUserApiKeyRequestSchema,
  exchangeProjectUserApiKeyRequestSchema,
  getProjectUserApiKeysQuerySchema,
  projectUserApiKeyParamsSchema,
  revokeProjectUserApiKeyRequestSchema,
} from '@/rest/schemas/project-user-api-keys.schemas';

// Response schemas
const projectUserApiKeySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  lastUsedAt: z.string().datetime().nullable(),
  isRevoked: z.boolean(),
  revokedAt: z.string().datetime().nullable(),
  revokedBy: z.string().uuid().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

const projectUserApiKeyPageSchema = z.object({
  projectUserApiKeys: z.array(projectUserApiKeySchema),
  totalCount: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
});

const createProjectUserApiKeyResponseSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  clientSecret: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

const exchangeProjectUserApiKeyResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
});

/**
 * Register project user API key endpoints in the OpenAPI registry
 */
export function registerProjectUserApiKeysOpenApi(registry: OpenAPIRegistry) {
  registry.register('ProjectUserApiKey', projectUserApiKeySchema);
  registry.register('ProjectUserApiKeyPage', projectUserApiKeyPageSchema);
  registry.register('CreateProjectUserApiKeyResponse', createProjectUserApiKeyResponseSchema);
  registry.register('ExchangeProjectUserApiKeyResponse', exchangeProjectUserApiKeyResponseSchema);
  registry.register('ProjectUserApiKeyParams', projectUserApiKeyParamsSchema);
  registry.register('ApiKeyIdParams', apiKeyIdParamsSchema);

  /**
   * GET /api/projects/:projectId/users/:userId/api-keys
   */
  registry.registerPath({
    method: 'get',
    path: '/api/projects/{projectId}/users/{userId}/api-keys',
    tags: ['Project User API Keys'],
    summary: 'List project user API keys',
    description: `
List API keys for a specific project and user with optional pagination and filtering.

### Pagination
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)

### Filtering
- \`search\`: Search by API key name or client ID
- \`sort\`: Sort configuration
  - \`field\`: Sort field (\`name\`, \`createdAt\`, \`lastUsedAt\`, \`expiresAt\`)
  - \`order\`: Sort order (\`ASC\` or \`DESC\`)

### Use Cases
- View all API keys for a project user
- Monitor API key usage and expiration
- Audit API key access
    `.trim(),
    request: {
      params: projectUserApiKeyParamsSchema,
      query: z.object({
        page: z.coerce.number().int().positive().default(1).optional(),
        limit: z.coerce.number().int().min(-1).default(50).optional(),
        search: z.string().optional(),
        sort: z
          .object({
            field: z.enum(['name', 'createdAt', 'lastUsedAt', 'expiresAt']),
            order: z.enum(['ASC', 'DESC']),
          })
          .optional(),
      }),
    },
    responses: {
      200: {
        description: 'Successfully retrieved API keys',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(projectUserApiKeyPageSchema),
            example: {
              success: true,
              data: {
                projectUserApiKeys: [
                  {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    projectId: '550e8400-e29b-41d4-a716-446655440001',
                    userId: '550e8400-e29b-41d4-a716-446655440002',
                    clientId: '550e8400-e29b-41d4-a716-446655440003',
                    name: 'Production API Key',
                    description: 'API key for production environment',
                    expiresAt: '2025-12-31T23:59:59Z',
                    lastUsedAt: '2025-01-15T10:30:00Z',
                    isRevoked: false,
                    revokedAt: null,
                    revokedBy: null,
                    createdBy: '550e8400-e29b-41d4-a716-446655440004',
                    createdAt: '2025-01-01T00:00:00Z',
                    updatedAt: '2025-01-15T10:30:00Z',
                    deletedAt: null,
                  },
                ],
                totalCount: 1,
                hasNextPage: false,
              },
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
      404: {
        description: 'Project or user not found',
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
   * POST /api/projects/:projectId/users/:userId/api-keys
   */
  registry.registerPath({
    method: 'post',
    path: '/api/projects/{projectId}/users/{userId}/api-keys',
    tags: ['Project User API Keys'],
    summary: 'Create a new project user API key',
    description: `
Create a new API key for a project user. The API key consists of:
- **Client ID**: Public identifier (UUID)
- **Client Secret**: Secret credential (shown only once)

### Important Security Notes
- The client secret is **only shown once** during creation
- Store the client secret securely - it cannot be retrieved later
- API keys can be revoked or deleted at any time
- Set an expiration date for additional security

### Expiration
- \`expiresAt\`: Optional expiration date (ISO 8601 format)
- If not set, the key does not expire
- Expired keys cannot be used to exchange for tokens

### Use Cases
- Generate credentials for external systems
- Enable service-to-service authentication
- Allow external systems to proxy authentication requests
    `.trim(),
    request: {
      params: projectUserApiKeyParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: createProjectUserApiKeyRequestSchema.omit({
              projectId: true,
              userId: true,
            }),
            example: {
              name: 'Production API Key',
              description: 'API key for production environment',
              expiresAt: '2025-12-31T23:59:59Z',
            },
          },
        },
      },
    },
    responses: {
      201: {
        description: 'API key created successfully',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(createProjectUserApiKeyResponseSchema),
            example: {
              success: true,
              data: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                clientId: '550e8400-e29b-41d4-a716-446655440003',
                clientSecret: 'sk_550e8400e29b41d4a716446655440003',
                name: 'Production API Key',
                description: 'API key for production environment',
                expiresAt: '2025-12-31T23:59:59Z',
                createdAt: '2025-01-01T00:00:00Z',
              },
            },
          },
        },
      },
      400: {
        description: 'Invalid request parameters or active key already exists',
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
        description: 'Project or user not found',
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
   * POST /api/auth/project-user/token
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/project-user/token',
    tags: ['Project User API Keys', 'Authentication'],
    summary: 'Exchange API key for access token',
    description: `
Exchange a project user API key (client ID and secret) for an access token.

This endpoint is used by external systems to authenticate and obtain a JWT access token
that can be used to make authenticated requests to the platform.

### Authentication Flow
1. External system sends client ID and client secret
2. Platform validates credentials
3. Platform returns JWT access token with expiration

### Token Usage
- Include the token in the \`Authorization\` header: \`Bearer <token>\`
- Token expires after the configured time (default: 15 minutes)
- Use the token to make authenticated API requests

### Security
- Client secret is validated using secure hashing
- Expired or revoked keys are rejected
- Failed attempts are logged for security monitoring
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: exchangeProjectUserApiKeyRequestSchema,
            example: {
              clientId: '550e8400-e29b-41d4-a716-446655440003',
              clientSecret: 'sk_550e8400e29b41d4a716446655440003',
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Successfully exchanged API key for token',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(exchangeProjectUserApiKeyResponseSchema),
            example: {
              success: true,
              data: {
                accessToken:
                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJzY29wZSI6InByb2plY3Q6NTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAxIiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjE3MDQwNjgxMDAsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NDAwMCIsImF1ZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6NDAwMCJ9',
                expiresIn: 900,
              },
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
        description: 'Invalid credentials or expired/revoked API key',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'API key not found',
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
   * POST /api/project-user-api-keys/:id/revoke
   */
  registry.registerPath({
    method: 'post',
    path: '/api/project-user-api-keys/{id}/revoke',
    tags: ['Project User API Keys'],
    summary: 'Revoke a project user API key',
    description: `
Revoke an API key, preventing it from being used to exchange for tokens.

### Revocation
- Revoked keys cannot be used to obtain new tokens
- Existing tokens remain valid until expiration
- Revocation is permanent and cannot be undone
- Revoked keys can be deleted separately

### Use Cases
- Security incident response
- Key rotation
- Access revocation
    `.trim(),
    request: {
      params: apiKeyIdParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: revokeProjectUserApiKeyRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'API key revoked successfully',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(projectUserApiKeySchema),
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
        description: 'API key not found',
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
   * DELETE /api/project-user-api-keys/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/project-user-api-keys/{id}',
    tags: ['Project User API Keys'],
    summary: 'Delete a project user API key',
    description: `
Delete a project user API key. Supports both soft delete and hard delete.

### Delete Types
- **Soft Delete** (default): Marks the key as deleted but retains data
  - Key cannot be used
  - Data is preserved for audit purposes
  - Can be restored if needed
- **Hard Delete**: Permanently removes the key from the database
  - Complete data removal
  - Cannot be restored
  - Use with caution

### Use Cases
- Clean up unused keys
- GDPR compliance (hard delete)
- Security cleanup
    `.trim(),
    request: {
      params: apiKeyIdParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: deleteProjectUserApiKeyRequestSchema,
            example: {
              hardDelete: false,
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'API key deleted successfully',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(projectUserApiKeySchema),
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
        description: 'API key not found',
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
