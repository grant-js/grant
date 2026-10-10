import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { z } from '@/lib/zod-openapi.lib';

const jwkSchema = z.object({
  kty: z.literal('RSA').openapi({ description: 'Key type' }),
  kid: z.string().openapi({ description: 'Key identifier (UUID)' }),
  use: z.literal('sig').openapi({ description: 'Key usage — always "sig" for signing' }),
  alg: z.literal('RS256').openapi({ description: 'Algorithm — always RS256' }),
  n: z.string().openapi({ description: 'RSA modulus (Base64url-encoded)' }),
  e: z.string().openapi({ description: 'RSA exponent (Base64url-encoded)' }),
});

const jwksResponseSchema = z.object({
  keys: z.array(jwkSchema).openapi({ description: 'Array of public signing keys in JWK format' }),
});

export function registerJwksOpenApi(registry: OpenAPIRegistry) {
  registry.register('Jwk', jwkSchema);
  registry.register('JwksResponse', jwksResponseSchema);

  /**
   * GET /.well-known/jwks.json — System (session) signing keys
   */
  registry.registerPath({
    method: 'get',
    path: '/.well-known/jwks.json',
    operationId: 'get.wellKnownJwks.json',
    tags: ['JWKS'],
    summary: 'Get system JWKS',
    description:
      'Returns the JSON Web Key Set for session (system-level) signing keys. ' +
      'Used by external services to verify JWTs issued at the system scope. ' +
      'Includes recently-rotated keys for graceful rollover.',
    security: [],
    responses: {
      200: {
        description: 'JWKS document with public signing keys',
        content: {
          'application/json': {
            schema: jwksResponseSchema,
          },
        },
      },
    },
  });

  /**
   * GET /org/:orgId/prj/:projectId/.well-known/jwks.json — Organization project keys
   */
  registry.registerPath({
    method: 'get',
    path: '/org/{orgId}/prj/{projectId}/.well-known/jwks.json',
    operationId: 'getOrgByOrgIdPrjByProjectId.wellKnownJwks.json',
    tags: ['JWKS'],
    summary: 'Get organization project JWKS',
    description:
      'Returns the JSON Web Key Set for an organization project scope. ' +
      'Used by external services to verify JWTs issued for a specific organization project.',
    security: [],
    request: {
      params: z.object({
        orgId: z.string().uuid().openapi({ description: 'Organization UUID' }),
        projectId: z.string().uuid().openapi({ description: 'Project UUID' }),
      }),
    },
    responses: {
      200: {
        description: 'JWKS document with public signing keys',
        content: {
          'application/json': {
            schema: jwksResponseSchema,
          },
        },
      },
      404: {
        description: 'No keys found for the given scope or invalid UUIDs',
      },
    },
  });

  /**
   * GET /acc/:accId/prj/:projectId/.well-known/jwks.json — Account project keys
   */
  registry.registerPath({
    method: 'get',
    path: '/acc/{accId}/prj/{projectId}/.well-known/jwks.json',
    operationId: 'getAccByAccIdPrjByProjectId.wellKnownJwks.json',
    tags: ['JWKS'],
    summary: 'Get account project JWKS',
    description:
      'Returns the JSON Web Key Set for an account project scope. ' +
      'Used by external services to verify JWTs issued for a specific account project.',
    security: [],
    request: {
      params: z.object({
        accId: z.string().uuid().openapi({ description: 'Account UUID' }),
        projectId: z.string().uuid().openapi({ description: 'Project UUID' }),
      }),
    },
    responses: {
      200: {
        description: 'JWKS document with public signing keys',
        content: {
          'application/json': {
            schema: jwksResponseSchema,
          },
        },
      },
      404: {
        description: 'No keys found for the given scope or invalid UUIDs',
      },
    },
  });
}
