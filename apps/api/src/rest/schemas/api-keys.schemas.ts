import { ApiKeySortableField, SortOrder, Tenant } from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import { listQuerySchema, scopeSchema } from '@/rest/schemas/common.schemas';

export const apiKeyIdParamsSchema = z.object({
  id: z.uuid('Invalid API key ID'),
});

export const getApiKeysQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.string().min(1, 'Scope ID is required'),
  tenant: z.enum(Object.values(Tenant) as [Tenant, ...Tenant[]]),
  sortField: z
    .enum(Object.values(ApiKeySortableField) as [ApiKeySortableField, ...ApiKeySortableField[]])
    .optional(),
  sortOrder: z.enum(Object.values(SortOrder) as [SortOrder, ...SortOrder[]]).optional(),
  ids: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (typeof val === 'string') {
        return val.split(',').map((v) => v.trim());
      }
      return val;
    })
    .optional(),
});

export const createApiKeyRequestSchema = z.object({
  name: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  expiresAt: z.date().optional(),
  scope: scopeSchema,
});

export const exchangeApiKeyRequestSchema = z.object({
  clientId: z.uuid('Invalid client ID'),
  clientSecret: z.string().min(32, 'Client secret must be at least 32 characters'),
  scope: scopeSchema,
});

export const revokeApiKeyRequestSchema = z.object({
  id: z.uuid('Invalid API key ID'),
  scope: scopeSchema,
});

export const deleteApiKeyRequestSchema = z.object({
  id: z.uuid('Invalid API key ID'),
  scope: scopeSchema,
  hardDelete: z.boolean().optional(),
});
