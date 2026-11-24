import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { z } from '@/lib/zod-openapi.lib';

const brandingColor = z
  .string()
  .regex(/^#[0-9a-f]{6}$/)
  .openapi({ description: 'Lowercase #rrggbb colour', example: '#1e3a5f' });

const headerTokenOverridesSchema = z
  .object({
    header: brandingColor.optional(),
    'header-foreground': brandingColor.optional(),
  })
  .openapi({
    description:
      'Design-token overrides for one theme mode, keyed by token name without the leading `--`. ' +
      'A missing key keeps the default. When `header` is present, `header-foreground` is too, ' +
      'chosen to meet WCAG AA (4.5:1) against it.',
  });

const brandingSchema = z
  .object({
    logo: z
      .object({
        lightUrl: z
          .string()
          .url()
          .openapi({ description: 'https URL (`BRANDING_LOGO_URL_LIGHT`)' }),
        darkUrl: z.string().url().nullable().openapi({
          description: 'https URL for dark mode (`BRANDING_LOGO_URL_DARK`); null uses lightUrl',
        }),
        alt: z.string().nullable().openapi({
          description: 'Logo alt text (`BRANDING_LOGO_ALT`); null lets the frontend localise one',
        }),
      })
      .nullable(),
    theme: z.object({
      light: headerTokenOverridesSchema,
      dark: headerTokenOverridesSchema,
    }),
  })
  .openapi({
    description:
      'Deployment branding from `BRANDING_*`, validated at startup (invalid values are dropped). ' +
      'Empty overrides and a null logo mean the default look.',
  });

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
  docsUrl: z.string().nullable().openapi({
    description:
      'Base URL of the public docs site (`DOCS_URL`); null when unset, in which case frontends link to same-origin `/docs`',
  }),
  apiReferenceEnabled: z.boolean().openapi({
    description:
      'Whether the API serves the Swagger UI API reference at /api-docs (`SWAGGER_ENABLED`)',
  }),
  graphqlPlaygroundEnabled: z.boolean().openapi({
    description: 'Whether the API serves the Apollo Sandbox at /graphql (`APOLLO_PLAYGROUND`)',
  }),
  branding: brandingSchema,
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
      'Returns runtime configuration for frontend apps (demo mode, privacy, app version, CDM upload limit, docs site URL, ' +
      'whether the API reference and GraphQL sandbox are enabled, and the deployment branding). ' +
      'No authentication required. Frontends reach the API by relative path; the URLs returned are ' +
      'the docs site base URL and the branding logos.',
    security: [],
    responses: {
      200: {
        description: 'Runtime config',
        content: {
          'application/json': {
            schema: runtimeConfigResponseSchema,
          },
        },
      },
    },
  });
}
