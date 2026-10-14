import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { z } from '@/lib/zod-openapi.lib';

const runtimeConfigResponseSchema = z.object({
  demoModeEnabled: z.boolean().openapi({ description: 'Whether demo mode is enabled' }),
  demoModeDbRefreshSchedule: z
    .string()
    .openapi({ description: 'Cron expression for demo DB refresh (e.g. 0 0 */2 * *)' }),
  accountDeletionRetentionDays: z
    .string()
    .openapi({ description: 'Days to retain data after account deletion request' }),
  appVersion: z.string().openapi({ description: 'Application version string' }),
  cdmUploadMaxBytes: z.number().int().openapi({
    description:
      'Largest CDM import document, in bytes, that can be uploaded by reference (`CDM_UPLOAD_MAX_BYTES`)',
  }),
});

export function registerRuntimeConfigOpenApi(registry: OpenAPIRegistry) {
  registry.register('RuntimeConfigResponse', runtimeConfigResponseSchema);

  /**
   * GET /api/config — Public runtime config for frontends (no auth).
   */
  registry.registerPath({
    method: 'get',
    path: '/api/config',
    operationId: 'getApiConfig',
    tags: ['Config'],
    summary: 'Get runtime config',
    description:
      'Returns non-URL runtime configuration for frontend apps (demo mode, privacy, app version, CDM upload limit). ' +
      'No authentication required. Frontends use relative paths for URLs; this endpoint does not return any URLs.',
    security: [],
    responses: {
      200: {
        description: 'Runtime config (non-URL values only)',
        content: {
          'application/json': {
            schema: runtimeConfigResponseSchema,
          },
        },
      },
    },
  });
}
