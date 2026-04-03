import { ApiKeySortableField } from '@grantjs/schema';
import { z } from 'zod';

import { isUtcCalendarDateAtLeastTomorrow } from '@/lib/expiration-date';

import {
  baseEntitySchema,
  deleteSchema,
  descriptionSchema,
  idSchema,
  nameSchema,
  queryParamsSchema,
  scopeSchema,
  sortOrderSchema,
} from './common/schemas';

export const clientIdSchema = z.uuid('errors.validation.invalidClientId');

export const clientSecretSchema = z.string().min(32, 'errors.validation.clientSecretMin32');

export const apiKeySortableFieldSchema = z.enum(
  Object.values(ApiKeySortableField) as [ApiKeySortableField, ...ApiKeySortableField[]]
);

export const apiKeySortInputSchema = z.object({
  field: apiKeySortableFieldSchema,
  order: sortOrderSchema,
});

export const queryApiKeysArgsSchema = queryParamsSchema.extend({
  sort: apiKeySortInputSchema.nullable().optional(),
});

export const apiKeySchema = baseEntitySchema.extend({
  clientId: z.string().min(1),
  name: nameSchema.nullable().optional(),
  description: descriptionSchema,
  expiresAt: z.date().nullable().optional(),
  lastUsedAt: z.date().nullable().optional(),
  isRevoked: z.boolean(),
  revokedAt: z.date().nullable().optional(),
  revokedBy: idSchema.nullable().optional(),
  createdBy: idSchema,
});

export const exchangeApiKeyParamsSchema = z.object({
  clientId: clientIdSchema,
  clientSecret: clientSecretSchema,
  scope: scopeSchema,
});

export const revokeApiKeyParamsSchema = z.object({
  id: idSchema,
});

export const deleteApiKeyParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const exchangeApiKeyResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});

export const createApiKeyRequestSchema = z
  .object({
    name: nameSchema.nullable().optional(),
    description: descriptionSchema.nullable().optional(),
    expiresAt: z.date().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.expiresAt == null) {
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

export const createApiKeyResponseSchema = z.object({
  id: idSchema,
  clientId: clientIdSchema,
  clientSecret: clientSecretSchema,
  name: nameSchema.nullable().optional(),
  description: descriptionSchema.nullable().optional(),
  expiresAt: z.date().nullable().optional(),
  createdAt: z.date(),
});
