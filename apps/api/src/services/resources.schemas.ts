import { ResourceSortableField } from '@grantjs/schema';
import { z } from 'zod';

import {
  baseEntitySchema,
  deleteSchema,
  descriptionSchema,
  idSchema,
  nameSchema,
  nonEmptyNameSchema,
  paginatedResponseSchema,
  queryParamsSchema,
  scopeSchema,
  slugSchema,
  sortOrderSchema,
} from './common/schemas';

export const resourceSortableFieldSchema = z.enum(
  Object.values(ResourceSortableField) as [ResourceSortableField, ...ResourceSortableField[]]
);
export const resourceSortInputSchema = z.object({
  field: resourceSortableFieldSchema,
  order: sortOrderSchema,
});

export const getResourcesParamsSchema = queryParamsSchema.extend({
  sort: resourceSortInputSchema.nullable().optional(),
});

export const createResourceParamsSchema = z.object({
  name: nonEmptyNameSchema,
  slug: slugSchema,
  description: descriptionSchema,
  actions: z.array(z.string()).nullable().optional(),
  isActive: z.boolean().nullable().optional(),
});

export const updateResourceParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    scope: scopeSchema,
    name: nonEmptyNameSchema.nullable().optional(),
    slug: slugSchema.nullable().optional(),
    description: descriptionSchema.nullable().optional(),
    actions: z.array(z.string()).nullable().optional(),
    isActive: z.boolean().nullable().optional(),
    tagIds: z.array(idSchema).nullable().optional(),
    primaryTagId: z
      .union([idSchema, z.literal(''), z.null()])
      .nullable()
      .optional()
      .transform((val) => (val === '' ? null : val)),
  }),
});

export const deleteResourceParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const resourceSchema = baseEntitySchema.extend({
  name: nameSchema,
  slug: slugSchema,
  description: descriptionSchema.nullable(),
  actions: z.array(z.string()),
  isActive: z.boolean(),
});

export const resourcePageSchema = paginatedResponseSchema(resourceSchema).transform((data) => ({
  resources: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));
