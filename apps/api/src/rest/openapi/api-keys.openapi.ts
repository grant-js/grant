import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  authenticationErrorResponseSchema,
  errorResponseSchema,
  notFoundErrorResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import {
  apiKeyIdParamsSchema,
  createApiKeyRequestSchema,
  deleteApiKeyRequestSchema,
  exchangeApiKeyRequestSchema,
  getApiKeysQuerySchema,
  revokeApiKeyRequestSchema,
} from '@/rest/schemas/api-keys.schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

// Response schemas
const apiKeySchema = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  expiresAt: z.date().nullable(),
  lastUsedAt: z.date().nullable(),
  isRevoked: z.boolean(),
  revokedAt: z.date().nullable(),
  revokedBy: z.uuid().nullable(),
  createdBy: z.uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

const apiKeyPageSchema = z.object({
  apiKeys: z.array(apiKeySchema),
  totalCount: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
});

const createApiKeyResponseSchema = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  clientSecret: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});

const exchangeApiKeyResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
});

/**
 * Register API key endpoints in the OpenAPI registry
 */
export function registerApiKeysOpenApi(registry: OpenAPIRegistry) {
  registry.register('ApiKey', apiKeySchema);
  registry.register('ApiKeyPage', apiKeyPageSchema);
  registry.register('CreateApiKeyResponse', createApiKeyResponseSchema);
  registry.register('ExchangeApiKeyResponse', exchangeApiKeyResponseSchema);
  registry.register('ApiKeyIdParams', apiKeyIdParamsSchema);

  /**
   * GET /api/api-keys
   */
  registry.registerPath({
    method: 'get',
    path: '/api/api-keys',
    tags: ['API Keys'],
    summary: 'List API keys',
    description: `
List API keys with optional filtering, pagination, and scope-based filtering.

### Scope
- \`scopeId\`: The ID of the scope (e.g., project ID, organization ID, or "projectId:userId" for projectUser)
- \`tenant\`: The tenant type (\`account\`, \`organization\`, \`project\`, \`projectUser\`)

### Pagination
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)

### Filtering
- \`search\`: Search by API key name or client ID
- \`sortField\`: Sort field (\`name\`, \`createdAt\`, \`lastUsedAt\`, \`expiresAt\`)
- \`sortOrder\`: Sort order (\`ASC\` or \`DESC\`)
- \`ids\`: Filter by specific API key IDs (comma-separated or array)

### Use Cases
- View all API keys for a scope
- Monitor API key usage and expiration
- Audit API key access
    `.trim(),
    request: {
      query: getApiKeysQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved API keys',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(apiKeyPageSchema),
            example: {
              success: true,
              data: {
                apiKeys: [
                  {
                    id: '550e8400-e29b-41d4-a716-446655440000',
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
   * POST /api/api-keys
   */
  registry.registerPath({
    method: 'post',
    path: '/api/api-keys',
    tags: ['API Keys'],
    summary: 'Create a new API key',
    description: `
Create a new API key for a specific scope. The API key consists of:
- **Client ID**: Public identifier (UUID)
- **Client Secret**: Secret credential (shown only once)

### Important Security Notes
- The client secret is **only shown once** during creation
- Store the client secret securely - it cannot be retrieved later
- API keys can be revoked or deleted at any time
- Set an expiration date for additional security

### Scope
- \`scope.id\`: The ID of the scope (e.g., project ID, organization ID, or "projectId:userId" for projectUser)
- \`scope.tenant\`: The tenant type (\`account\`, \`organization\`, \`project\`, \`projectUser\`)

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
      body: {
        content: {
          'application/json': {
            schema: createApiKeyRequestSchema,
            example: {
              name: 'Production API Key',
              description: 'API key for production environment',
              expiresAt: '2025-12-31T23:59:59Z',
              scope: {
                id: '550e8400-e29b-41d4-a716-446655440001:550e8400-e29b-41d4-a716-446655440002',
                tenant: 'projectUser',
              },
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
            schema: createSuccessResponseSchema(createApiKeyResponseSchema),
            example: {
              success: true,
              data: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                clientId: '550e8400-e29b-41d4-a716-446655440003',
                clientSecret: '550e8400e29b41d4a716446655440003',
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
        description: 'Scope not found',
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
   * POST /api/auth/api-keys/token
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/api-keys/token',
    tags: ['API Keys', 'Authentication'],
    summary: 'Exchange API key for access token',
    description: `
Exchange an API key (client ID and secret) for an access token.

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
            schema: exchangeApiKeyRequestSchema,
            example: {
              clientId: '550e8400-e29b-41d4-a716-446655440003',
              clientSecret: '550e8400e29b41d4a716446655440003',
              scope: {
                id: '550e8400-e29b-41d4-a716-446655440001:550e8400-e29b-41d4-a716-446655440002',
                tenant: 'projectUser',
              },
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
            schema: createSuccessResponseSchema(exchangeApiKeyResponseSchema),
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
   * POST /api/api-keys/:id/revoke
   */
  registry.registerPath({
    method: 'post',
    path: '/api/api-keys/{id}/revoke',
    tags: ['API Keys'],
    summary: 'Revoke an API key',
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
            schema: revokeApiKeyRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'API key revoked successfully',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(apiKeySchema),
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
   * DELETE /api/api-keys/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/api-keys/{id}',
    tags: ['API Keys'],
    summary: 'Delete an API key',
    description: `
Delete an API key. Supports both soft delete and hard delete.

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
            schema: deleteApiKeyRequestSchema,
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
            schema: createSuccessResponseSchema(apiKeySchema),
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
