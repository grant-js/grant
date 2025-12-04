import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  accountParamsSchema,
  accountSchema,
  accountWithRelationsSchema,
  authenticationErrorResponseSchema,
  createComplementaryAccountRequestSchema,
  createComplementaryAccountResponseSchema,
  errorResponseSchema,
  getAccountsQuerySchema,
  getAccountsResponseSchema,
  notFoundErrorResponseSchema,
  validationErrorResponseSchema,
} from '../schemas';
import { createSuccessResponseSchema } from '../schemas/common.schemas';

export function registerAccountsOpenApi(registry: OpenAPIRegistry) {
  registry.register('Account', accountSchema);
  registry.register('AccountWithRelations', accountWithRelationsSchema);
  registry.register('GetAccountsQuery', getAccountsQuerySchema);
  registry.register('GetAccountsResponse', getAccountsResponseSchema);
  registry.register('GetAccountResponse', createSuccessResponseSchema(accountWithRelationsSchema));
  registry.register('AccountParams', accountParamsSchema);

  /**
   * GET /api/accounts
   * List accounts with optional filtering, pagination, and relations
   */
  registry.registerPath({
    method: 'get',
    path: '/api/accounts',
    tags: ['Accounts'],
    summary: 'List accounts',
    description: `
List all accounts with optional filtering, pagination, sorting, and relation loading.

### Relations
You can load related data by specifying the \`relations\` query parameter:
- \`projects\`: Load account's projects
- \`owner\`: Load account owner (user)

Example: \`?relations=projects,owner\`
    `.trim(),
    request: {
      query: getAccountsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved accounts',
        content: {
          'application/json': {
            schema: getAccountsResponseSchema,
            example: {
              success: true,
              data: {
                items: [
                  {
                    id: 'acc_123',
                    type: 'organization',
                    ownerId: 'usr_456',
                    createdAt: '2025-10-11T00:00:00Z',
                    updatedAt: '2025-10-11T00:00:00Z',
                    deletedAt: null,
                    projects: [
                      {
                        id: 'prj_789',
                        name: 'Project Alpha',
                      },
                    ],
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
        description: 'Validation error',
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
   * GET /api/accounts/:id
   * Get a single account by ID
   */
  registry.registerPath({
    method: 'get',
    path: '/api/accounts/{id}',
    tags: ['Accounts'],
    summary: 'Get account by ID',
    description: `
Get a single account by ID with optional relation loading.

### Relations
You can load related data by specifying the \`relations\` query parameter:
- \`projects\`: Load account's projects
- \`owner\`: Load account owner (user)

Example: \`?relations=projects,owner\`

**Note**: Account creation is handled through the authentication registration flow (POST /api/auth/register). Account updates are not supported.
    `.trim(),
    request: {
      params: accountParamsSchema,
      query: getAccountsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved account',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(accountWithRelationsSchema),
            example: {
              success: true,
              data: {
                id: 'acc_123',
                type: 'organization',
                ownerId: 'usr_456',
                createdAt: '2025-10-11T00:00:00Z',
                updatedAt: '2025-10-11T00:00:00Z',
                deletedAt: null,
                projects: [
                  {
                    id: 'prj_789',
                    name: 'Project Alpha',
                  },
                ],
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
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Account not found',
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
   * POST /api/accounts/complementary
   * Create a complementary account
   */
  registry.registerPath({
    method: 'post',
    path: '/api/accounts/complementary',
    tags: ['Accounts'],
    summary: 'Create complementary account',
    description: `
Create a complementary account for the authenticated user.

If the user has a Personal account, this creates an Organization account.
If the user has an Organization account, this creates a Personal account.

Users can have a maximum of 2 accounts (one Personal and one Organization).
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createComplementaryAccountRequestSchema,
            example: {},
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Successfully created complementary account',
        content: {
          'application/json': {
            schema: createComplementaryAccountResponseSchema,
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
}
