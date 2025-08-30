import { z } from 'zod';

import {
  idSchema,
  nameSchema,
  descriptionSchema,
  slugSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  sortableParamsSchema,
  nonEmptyNameSchema,
  sortOrderSchema,
} from '../common/schemas';

export const projectSortableFieldSchema = z.enum([
  'name',
  'slug',
  'description',
  'createdAt',
  'updatedAt',
]);
export const projectSortInputSchema = z.object({
  field: projectSortableFieldSchema,
  order: sortOrderSchema,
});

export const getProjectsParamsSchema = sortableParamsSchema.extend({
  sort: projectSortInputSchema.optional(),
});

export const createProjectParamsSchema = z.object({
  input: z.object({
    name: nonEmptyNameSchema,
    description: descriptionSchema,
    organizationId: idSchema,
    tagIds: z.array(idSchema).optional(),
  }),
});

export const updateProjectParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    name: nonEmptyNameSchema.optional(),
    description: descriptionSchema,
  }),
});

export const deleteProjectParamsSchema = z.object({
  id: idSchema,
});

export const projectSchema = baseEntitySchema.extend({
  name: nameSchema,
  slug: slugSchema,
  description: descriptionSchema.nullable(),
});

export const projectPageSchema = paginatedResponseSchema(projectSchema).transform((data) => ({
  projects: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));
