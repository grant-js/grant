import { ApiKeySortableField, SortOrder, Tenant } from '@grantjs/schema';

import { isUtcCalendarDateAtLeastTomorrow } from '@/lib/expiration-date';
import { z } from '@/lib/zod-openapi.lib';
import { listQuerySchema, scopeSchema } from '@/rest/schemas/common.schemas';

export const apiKeyIdParamsSchema = z.object({
  id: z.uuid('errors.validation.invalidApiKeyId'),
});

export const getApiKeysQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.string().min(1, 'errors.validation.scopeIdRequired'),
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

export const createApiKeyRequestSchema = z
  .object({
    name: z.string().max(255).optional(),
    description: z.string().max(1000).optional(),
    expiresAt: z.date().optional(),
    scope: scopeSchema,
    roleId: z.uuid('errors.validation.invalidRoleId').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.expiresAt == null || data.expiresAt === undefined) {
      return;
    }
    if (!isUtcCalendarDateAtLeastTomorrow(data.expiresAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiresAt'],
        message: 'errors.validation.expirationMustBeFuture',
      });
    }
  });

export const exchangeApiKeyRequestSchema = z.object({
  clientId: z.uuid('errors.validation.invalidClientId'),
  clientSecret: z.string().min(32, 'errors.validation.clientSecretMin32'),
  scope: scopeSchema,
});

export const revokeApiKeyRequestSchema = z.object({
  id: z.uuid('errors.validation.invalidApiKeyId'),
  scope: scopeSchema,
});

export const deleteApiKeyRequestSchema = z.object({
  id: z.uuid('errors.validation.invalidApiKeyId'),
  scope: scopeSchema,
  hardDelete: z.boolean().optional(),
});
