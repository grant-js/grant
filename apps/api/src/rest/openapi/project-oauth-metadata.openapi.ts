import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { z } from '@/lib/zod-openapi.lib';

const projectOAuthMetadataSchema = z.object({
  issuer: z.string().url(),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  jwks_uri: z.string().url(),
  response_types_supported: z.tuple([z.literal('code')]),
  response_modes_supported: z.tuple([z.literal('query')]),
  grant_types_supported: z.tuple([z.literal('authorization_code'), z.literal('refresh_token')]),
  code_challenge_methods_supported: z.tuple([z.literal('S256')]),
  token_endpoint_auth_methods_supported: z.tuple([
    z.literal('client_secret_post'),
    z.literal('none'),
  ]),
});

const orgProjectParams = z.object({
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
});

const accProjectParams = z.object({
  accId: z.string().uuid(),
  projectId: z.string().uuid(),
});

const metadataDescription =
  'RFC 8414 authorization-server metadata for a project issuer. ' +
  'authorization_endpoint and token_endpoint are shared (`/api/auth/project/*`). ' +
  'issuer and jwks_uri are per-project. The twin OpenID configuration URL returns ' +
  'the same JSON — Grant is not an OpenID Provider (no userinfo or id_token).';

export function registerProjectOAuthMetadataOpenApi(registry: OpenAPIRegistry) {
  registry.register('ProjectOAuthAuthorizationServerMetadata', projectOAuthMetadataSchema);

  const success = {
    200: {
      description: 'Authorization-server metadata (same document on both URLs)',
      content: {
        'application/json': {
          schema: projectOAuthMetadataSchema,
        },
      },
    },
    404: {
      description: 'Invalid UUIDs',
    },
  };

  registry.registerPath({
    method: 'get',
    path: '/.well-known/oauth-authorization-server/org/{orgId}/prj/{projectId}',
    operationId: 'getWellKnownOauthAuthorizationServerOrgProject',
    tags: ['JWKS'],
    summary: 'RFC 8414 metadata (organization project)',
    description: metadataDescription,
    security: [],
    request: { params: orgProjectParams },
    responses: success,
  });

  registry.registerPath({
    method: 'get',
    path: '/.well-known/oauth-authorization-server/acc/{accId}/prj/{projectId}',
    operationId: 'getWellKnownOauthAuthorizationServerAccProject',
    tags: ['JWKS'],
    summary: 'RFC 8414 metadata (account project)',
    description: metadataDescription,
    security: [],
    request: { params: accProjectParams },
    responses: success,
  });

  registry.registerPath({
    method: 'get',
    path: '/org/{orgId}/prj/{projectId}/.well-known/openid-configuration',
    operationId: 'getOrgProjectOpenidConfiguration',
    tags: ['JWKS'],
    summary: 'OpenID configuration twin (organization project)',
    description: metadataDescription,
    security: [],
    request: { params: orgProjectParams },
    responses: success,
  });

  registry.registerPath({
    method: 'get',
    path: '/acc/{accId}/prj/{projectId}/.well-known/openid-configuration',
    operationId: 'getAccProjectOpenidConfiguration',
    tags: ['JWKS'],
    summary: 'OpenID configuration twin (account project)',
    description: metadataDescription,
    security: [],
    request: { params: accProjectParams },
    responses: success,
  });
}
