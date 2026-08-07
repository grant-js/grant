import { z } from 'zod';

import {
  baseEntitySchema,
  deleteSchema,
  idSchema,
  nameSchema,
  nonEmptyNameSchema,
  queryParamsSchema,
  scopeSchema,
  slugSchema,
  sortOrderSchema,
} from './common/schemas';

const organizationSortableFieldSchema = z.enum(['name', 'slug', 'createdAt', 'updatedAt']);
const organizationSortInputSchema = z.object({
  field: organizationSortableFieldSchema,
  order: sortOrderSchema,
});

export const getOrganizationsParamsSchema = queryParamsSchema.extend({
  sort: organizationSortInputSchema.nullable().optional(),
});

export const createOrganizationInputSchema = z.object({
  name: nonEmptyNameSchema,
});

export const updateOrganizationParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    scope: scopeSchema,
    name: nonEmptyNameSchema.nullable().optional(),
    requireMfaForSensitiveActions: z.boolean().optional(),
  }),
});

export const deleteOrganizationParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const organizationSchema = baseEntitySchema.extend({
  name: nameSchema,
  slug: slugSchema,
  requireMfaForSensitiveActions: z.boolean(),
});
