import { Tenant } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';

export const tenantSchema = z.enum(Object.values(Tenant) as [Tenant, ...Tenant[]]);

export const scopeSchema = z.object({
  id: z.string().refine(
    (val) => {
      const parts = val.split(':');
      return parts.every((part) => z.uuid().safeParse(part).success);
    },
    { message: 'Invalid scope ID: must be a UUID or multiple UUIDs separated by colons' }
  ),
  tenant: tenantSchema,
});

export const paginationQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 1;
      return typeof val === 'string' ? parseInt(val, 10) : val;
    })
    .pipe(z.number().int().positive()),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 50;
      return typeof val === 'string' ? parseInt(val, 10) : val;
    })
    .pipe(z.number().int().min(-1)),
});

export const searchQuerySchema = z.object({
  search: z.string().optional(),
});

export const sortQuerySchema = z.object({
  sortField: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional(),
});

export const relationsQuerySchema = z.object({
  relations: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (typeof val === 'string') {
        return val.split(',').map((v) => v.trim());
      }
      return val;
    })
    .optional(),
});

export const idsQuerySchema = z.object({
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

export const listQuerySchema = paginationQuerySchema
  .merge(searchQuerySchema)
  .merge(sortQuerySchema)
  .merge(relationsQuerySchema)
  .merge(idsQuerySchema);

export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
  _description: string = 'Successful response'
) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.unknown().optional(),
  stack: z.string().optional(),
});

export const validationErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
});

export const validationErrorResponseSchema = z.object({
  error: z.literal('Validation failed'),
  code: z.literal('VALIDATION_ERROR'),
  details: z.array(validationErrorDetailSchema),
});

export const authenticationErrorResponseSchema = z.object({
  error: z.string(),
  code: z.literal('UNAUTHENTICATED'),
});

export const notFoundErrorResponseSchema = z.object({
  error: z.string(),
  code: z.literal('NOT_FOUND'),
});
