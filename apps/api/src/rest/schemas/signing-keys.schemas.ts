import { Tenant } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import { scopeSchema } from '@/rest/schemas/common.schemas';

export const getSigningKeysQuerySchema = z.object({
  scopeId: z.string().min(1, 'errors.validation.scopeIdRequired'),
  tenant: z.enum(Object.values(Tenant) as [Tenant, ...Tenant[]]),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) =>
      val === undefined ? undefined : typeof val === 'string' ? parseInt(val, 10) : val
    )
    .pipe(z.number().int().positive().max(100).optional()),
});

export const rotateSigningKeyRequestSchema = z.object({
  scope: scopeSchema,
});
