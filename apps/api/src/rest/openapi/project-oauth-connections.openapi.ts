import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  clearProjectOAuthConnectionRequestSchema,
  clearProjectOAuthConnectionResponseSchema,
  listProjectOAuthConnectionsQuerySchema,
  projectOAuthConnectionListResponseSchema,
  projectOAuthConnectionResponseSchema,
  upsertProjectOAuthConnectionRequestSchema,
} from '@/rest/schemas/project-oauth-connections.schemas';

export function registerProjectOAuthConnectionsOpenApi(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'get',
    path: '/api/project-oauth-connections',
    tags: ['Project OAuth Connections'],
    summary: 'List project OAuth connections',
    description:
      'Returns GitHub/Google OAuth connections for the scoped project. Secrets and ciphertext are never returned. Requires Project Query.',
    security: [{ bearerAuth: [] }],
    request: {
      query: listProjectOAuthConnectionsQuerySchema,
    },
    responses: {
      200: {
        description: 'Connections for the project',
        content: {
          'application/json': { schema: projectOAuthConnectionListResponseSchema },
        },
      },
      401: { description: 'Authentication required' },
      403: { description: 'Insufficient permissions' },
    },
  });

  registry.registerPath({
    method: 'put',
    path: '/api/project-oauth-connections',
    tags: ['Project OAuth Connections'],
    summary: 'Upsert a project OAuth connection',
    description:
      'Create or replace the project GitHub or Google OAuth connection. The client secret is write-only and is never returned. Requires Project Update.',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': { schema: upsertProjectOAuthConnectionRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: 'Stored connection (no secret)',
        content: {
          'application/json': { schema: projectOAuthConnectionResponseSchema },
        },
      },
      401: { description: 'Authentication required' },
      403: { description: 'Insufficient permissions' },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/project-oauth-connections',
    tags: ['Project OAuth Connections'],
    summary: 'Clear a project OAuth connection',
    description:
      'Hard-deletes the stored ciphertext for the given provider. Requires Project Update.',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': { schema: clearProjectOAuthConnectionRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: 'Connection cleared',
        content: {
          'application/json': { schema: clearProjectOAuthConnectionResponseSchema },
        },
      },
      401: { description: 'Authentication required' },
      403: { description: 'Insufficient permissions' },
      404: { description: 'Connection not found' },
    },
  });
}
