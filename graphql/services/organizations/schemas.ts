import { z } from 'zod';

import {
  idSchema,
  nameSchema,
  slugSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  sortableParamsSchema,
  nonEmptyNameSchema,
  sortOrderSchema,
} from '../common/schemas';

export const organizationSortableFieldSchema = z.enum(['name', 'slug', 'createdAt', 'updatedAt']);
export const organizationSortInputSchema = z.object({
  field: organizationSortableFieldSchema,
  order: sortOrderSchema,
});

export const getOrganizationsParamsSchema = sortableParamsSchema.extend({
  sort: organizationSortInputSchema.optional(),
});

export const createOrganizationParamsSchema = z.object({
  input: z.object({
    name: nonEmptyNameSchema,
  }),
});

export const updateOrganizationParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    name: nonEmptyNameSchema.optional(),
  }),
});

export const deleteOrganizationParamsSchema = z.object({
  id: idSchema,
});

export const organizationSchema = baseEntitySchema.extend({
  name: nameSchema,
  slug: slugSchema,
});

export const organizationPageSchema = paginatedResponseSchema(organizationSchema).transform(
  (data) => ({
    organizations: data.items,
    totalCount: data.totalCount,
    hasNextPage: data.hasNextPage,
  })
);
