import { z } from 'zod';

import {
  idSchema,
  nameSchema,
  slugSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  nonEmptyNameSchema,
  sortOrderSchema,
  queryParamsSchema,
  deleteSchema,
} from '../common/schemas';

export const organizationSortableFieldSchema = z.enum(['name', 'slug', 'createdAt', 'updatedAt']);
export const organizationSortInputSchema = z.object({
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
    name: nonEmptyNameSchema.nullable().optional(),
  }),
});

export const deleteOrganizationParamsSchema = deleteSchema.extend({
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
