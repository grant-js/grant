import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { z } from '@/lib/zod-openapi.lib';
import {
  getSigningKeysQuerySchema,
  rotateSigningKeyRequestSchema,
} from '@/rest/schemas/signing-keys.schemas';

const signingKeySchema = z.object({
  id: z.string().uuid().openapi({ description: 'Signing key UUID' }),
  kid: z.string().openapi({ description: 'Key identifier used in JWT headers' }),
  scope: z
    .object({
      tenant: z.string().openapi({ description: 'Tenant type' }),
      id: z.string().openapi({ description: 'Scope ID (single or composite UUID)' }),
    })
    .openapi({ description: 'The scope this key belongs to' }),
  createdAt: z.string().datetime().openapi({ description: 'Key creation timestamp' }),
});

const signingKeyListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(signingKeySchema),
});

const rotateSigningKeyResponseSchema = z.object({
  success: z.literal(true),
  data: signingKeySchema,
});

export function registerSigningKeysOpenApi(registry: OpenAPIRegistry) {
  registry.register('SigningKey', signingKeySchema);

  /**
   * GET /api/signing-keys — List signing keys for a project scope
   */
  registry.registerPath({
    method: 'get',
    path: '/api/signing-keys',
    operationId: 'getApiSigningKeys',
    tags: ['Signing Keys'],
    summary: 'List signing keys',
    description:
      'Returns signing keys for the given project scope. ' +
      'Requires the `query` action on the `apiKey` resource.',
    security: [{ bearerAuth: [] }],
    request: {
      query: getSigningKeysQuerySchema,
    },
    responses: {
      200: {
        description: 'List of signing keys',
        content: {
          'application/json': {
            schema: signingKeyListResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
      },
      403: {
        description: 'Insufficient permissions',
      },
    },
  });

  /**
   * POST /api/signing-keys/rotate — Rotate a signing key for a project scope
   */
  registry.registerPath({
    method: 'post',
    path: '/api/signing-keys/rotate',
    operationId: 'postApiSigningKeysRotate',
    tags: ['Signing Keys'],
    summary: 'Rotate signing key',
    description:
      'Creates a new signing key for the given project scope and marks the previous one for retirement. ' +
      'The old key remains available for verification during the retention window ' +
      '(determined by refresh token expiration). ' +
      'Requires the `query` action on the `apiKey` resource.',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: rotateSigningKeyRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'New signing key created',
        content: {
          'application/json': {
            schema: rotateSigningKeyResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
      },
      403: {
        description: 'Insufficient permissions',
      },
    },
  });
}
