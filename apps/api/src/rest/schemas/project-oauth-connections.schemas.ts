import { ProjectOAuthConnectionProvider, Tenant } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import { createSuccessResponseSchema, scopeSchema } from '@/rest/schemas/common.schemas';

const tenantSchema = z.enum(Object.values(Tenant) as [Tenant, ...Tenant[]]);
const providerSchema = z.enum([
  ProjectOAuthConnectionProvider.Github,
  ProjectOAuthConnectionProvider.Google,
]);

export const listProjectOAuthConnectionsQuerySchema = z.object({
  scopeId: z.string().min(1, 'errors.validation.scopeIdRequired'),
  tenant: tenantSchema,
});

export const upsertProjectOAuthConnectionRequestSchema = z.object({
  scope: scopeSchema,
  provider: providerSchema,
  clientId: z.string().trim().min(1).max(255),
  clientSecret: z.string().min(1).max(4096),
});

export const clearProjectOAuthConnectionRequestSchema = z.object({
  scope: scopeSchema,
  provider: providerSchema,
});

export const projectOAuthConnectionSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    provider: providerSchema,
    clientId: z.string(),
    isConfigured: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    deletedAt: z.coerce.date().nullable().optional(),
  })
  .strict();

export const projectOAuthConnectionListResponseSchema = createSuccessResponseSchema(
  z.array(projectOAuthConnectionSchema),
  'Project OAuth connections'
);

export const projectOAuthConnectionResponseSchema = createSuccessResponseSchema(
  projectOAuthConnectionSchema,
  'Project OAuth connection'
);

export const clearProjectOAuthConnectionResponseSchema = createSuccessResponseSchema(
  z.object({ cleared: z.boolean() }),
  'Clear result'
);
